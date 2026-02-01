#!/usr/bin/env python3
"""
PRISM FinOps — CTHRU Expenditure Data Acquisition

Fetches Massachusetts CTHRU spending data from the Socrata Open Data API
hosted at data.mass.gov, saves it locally, and loads it to Snowflake.

Data source:
    Dataset:  CTHRU Expenditures
    Endpoint: https://data.mass.gov/resource/pegc-naaa.json
    Docs:     https://dev.socrata.com/foundry/data.mass.gov/pegc-naaa

Authentication:
    An app token is recommended to avoid throttling. Set SOCRATA_APP_TOKEN
    in your environment or .env file. The API works without a token but is
    rate-limited to ~1,000 requests/hour for unauthenticated clients.

Usage:
    python -m etl.cthru_acquisition --fiscal-year 2026 --limit 50000
    python -m etl.cthru_acquisition --fiscal-year 2026 --load-only
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

from etl.snowflake_loader import (
    copy_into_table,
    ensure_json_file_format,
    ensure_stage_exists,
    get_connection,
    upload_to_stage,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("prism.etl.cthru")

SOCRATA_ENDPOINT = "https://data.mass.gov/resource/pegc-naaa.json"
SOCRATA_APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN", "")

# Massachusetts fiscal year starts July 1.  FY2026 = Jul 2025 – Jun 2026.
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "cthru"
SNOWFLAKE_TABLE = "EOTSS_STAGING.RAW_CTHRU_TRANSACTIONS"
SNOWFLAKE_STAGE = "@EOTSS_STAGING.ETL_STAGE/cthru/"
SNOWFLAKE_FORMAT = "EOTSS_STAGING.JSON_INGEST"

# Socrata pagination
PAGE_SIZE = 50000
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5


# ---------------------------------------------------------------------------
# Socrata fetch
# ---------------------------------------------------------------------------

def _build_headers() -> dict[str, str]:
    """Build request headers including optional Socrata app token."""
    headers = {"Accept": "application/json"}
    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
    else:
        logger.warning(
            "SOCRATA_APP_TOKEN not set — requests will be throttled. "
            "Register at https://data.mass.gov/profile/edit/developer_settings"
        )
    return headers


def _fiscal_year_where(fiscal_year: int) -> str:
    """
    Build a SoQL $where clause for the MA fiscal year.

    MA FY2026 runs 2025-07-01 through 2026-06-30.
    The CTHRU dataset uses a `check_date` column (floating timestamp).
    """
    start = f"{fiscal_year - 1}-07-01T00:00:00"
    end = f"{fiscal_year}-06-30T23:59:59"
    return f"check_date >= '{start}' AND check_date <= '{end}'"


def fetch_cthru_data(
    fiscal_year: int,
    limit: int = 0,
) -> list[dict]:
    """
    Fetch CTHRU expenditure records from Socrata for the given fiscal year.

    Paginates automatically. If *limit* is 0 the entire dataset is fetched.

    Returns:
        List of record dicts.
    """
    headers = _build_headers()
    where_clause = _fiscal_year_where(fiscal_year)
    all_records: list[dict] = []
    offset = 0
    effective_page = min(PAGE_SIZE, limit) if limit else PAGE_SIZE

    logger.info(
        "Fetching CTHRU expenditures for FY%d (limit=%s) ...",
        fiscal_year,
        limit or "ALL",
    )

    while True:
        params: dict[str, str | int] = {
            "$where": where_clause,
            "$limit": effective_page,
            "$offset": offset,
            "$order": "check_date ASC",
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = requests.get(
                    SOCRATA_ENDPOINT,
                    headers=headers,
                    params=params,
                    timeout=120,
                )
                resp.raise_for_status()
                break
            except requests.RequestException as exc:
                logger.warning(
                    "Request failed (attempt %d/%d): %s",
                    attempt,
                    MAX_RETRIES,
                    exc,
                )
                if attempt == MAX_RETRIES:
                    raise
                time.sleep(RETRY_DELAY_SECONDS * attempt)

        page = resp.json()
        if not page:
            logger.info("No more records at offset %d — pagination complete.", offset)
            break

        all_records.extend(page)
        logger.info(
            "  fetched %d records (offset=%d, running_total=%d)",
            len(page),
            offset,
            len(all_records),
        )

        offset += len(page)

        # Stop if we hit the user-supplied limit
        if limit and len(all_records) >= limit:
            all_records = all_records[:limit]
            break

        # If fewer than PAGE_SIZE returned, we have reached the end
        if len(page) < effective_page:
            break

    logger.info("Total records fetched: %d", len(all_records))
    return all_records


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_to_disk(records: list[dict], fiscal_year: int) -> Path:
    """Write records to data/cthru/transactions_fyNN.json."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_DIR / f"transactions_fy{fiscal_year}.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, default=str)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    logger.info("Saved %d records to %s (%.1f MB)", len(records), out_path, size_mb)
    return out_path


# ---------------------------------------------------------------------------
# Snowflake load
# ---------------------------------------------------------------------------

def load_to_snowflake(local_path: Path) -> list[dict]:
    """
    Upload a local JSON file to Snowflake stage and COPY INTO the raw table.

    The target table must accept VARIANT or have a VARIANT column named SRC.
    If the table does not exist, it is created as a single-column VARIANT table.
    """
    conn = get_connection()
    try:
        ensure_stage_exists(conn)
        ensure_json_file_format(conn)

        # Ensure raw landing table exists
        cur = conn.cursor()
        try:
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {SNOWFLAKE_TABLE} (
                    SRC             VARIANT         NOT NULL,
                    _LOADED_AT      TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
                    _SOURCE_FILE    VARCHAR(512)
                )
                COMMENT = 'Raw CTHRU expenditure records ingested by ETL'
                """
            )
        finally:
            cur.close()

        # PUT local file to stage
        upload_to_stage(conn, local_path, SNOWFLAKE_STAGE)

        # COPY INTO from stage
        results = copy_into_table(
            conn,
            stage_path=SNOWFLAKE_STAGE,
            table_name=SNOWFLAKE_TABLE,
            file_format=f"(FORMAT_NAME = '{SNOWFLAKE_FORMAT}')",
            on_error="CONTINUE",
            purge=True,
        )
        return results
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch CTHRU spending data and load to Snowflake",
    )
    parser.add_argument(
        "--fiscal-year",
        type=int,
        default=2026,
        help="Massachusetts fiscal year (default: 2026 = Jul 2025 – Jun 2026)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max records to fetch (0 = all, default: 0)",
    )
    parser.add_argument(
        "--no-load",
        action="store_true",
        help="Fetch and save locally only — do not load to Snowflake",
    )
    parser.add_argument(
        "--load-only",
        action="store_true",
        help="Skip fetch — load existing local file to Snowflake",
    )
    args = parser.parse_args()

    if args.load_only:
        local_path = DATA_DIR / f"transactions_fy{args.fiscal_year}.json"
        if not local_path.exists():
            # Fall back to the legacy filename
            local_path = DATA_DIR / "transactions.json"
        if not local_path.exists():
            logger.error("No local file found for --load-only: %s", local_path)
            sys.exit(1)
        logger.info("Loading existing file: %s", local_path)
        results = load_to_snowflake(local_path)
        for r in results:
            logger.info("  %s", r)
        return

    records = fetch_cthru_data(
        fiscal_year=args.fiscal_year,
        limit=args.limit,
    )

    if not records:
        logger.warning("No records returned — nothing to save or load.")
        sys.exit(0)

    local_path = save_to_disk(records, args.fiscal_year)

    if not args.no_load:
        results = load_to_snowflake(local_path)
        for r in results:
            logger.info("  %s", r)
    else:
        logger.info("--no-load specified; skipping Snowflake upload.")


if __name__ == "__main__":
    main()
