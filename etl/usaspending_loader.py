#!/usr/bin/env python3
"""
PRISM FinOps — USASpending.gov Award Data Loader

Fetches federal IT spending awards for Massachusetts from the USASpending.gov
bulk award search API and loads them into Snowflake.

Data source:
    API docs: https://api.usaspending.gov/docs/endpoints
    Endpoint: POST https://api.usaspending.gov/api/v2/search/spending_by_award/
    Auth:     None required (public API)

Usage:
    python -m etl.usaspending_loader --fiscal-year 2026
    python -m etl.usaspending_loader --fiscal-year 2025 --limit 500
    python -m etl.usaspending_loader --load-only --fiscal-year 2026
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
logger = logging.getLogger("prism.etl.usaspending")

USASPENDING_API = "https://api.usaspending.gov/api/v2/search/spending_by_award/"

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "usaspending"
SNOWFLAKE_TABLE = "EOTSS_STAGING.RAW_USASPENDING_AWARDS"
SNOWFLAKE_STAGE = "@EOTSS_STAGING.ETL_STAGE/usaspending/"
SNOWFLAKE_FORMAT = "EOTSS_STAGING.JSON_INGEST"

# IT-related NAICS codes (2-digit prefix 51 = Information, plus specific IT codes)
IT_NAICS_CODES = [
    "511210",  # Software publishers
    "518210",  # Data processing, hosting
    "519130",  # Internet publishing and broadcasting
    "541511",  # Custom computer programming
    "541512",  # Computer systems design
    "541513",  # Computer facilities management
    "541519",  # Other computer related services
    "541611",  # Administrative management consulting
    "541690",  # Other scientific & technical consulting
    "561210",  # Facilities support services
    "334111",  # Electronic computer manufacturing
    "334118",  # Computer terminal and peripheral equipment
]

PAGE_SIZE = 100  # USASpending API max per page
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5

# Award fields to request
AWARD_FIELDS = [
    "Award ID",
    "Recipient Name",
    "Start Date",
    "End Date",
    "Award Amount",
    "Total Outlays",
    "Description",
    "def_codes",
    "COVID-19 Obligations",
    "COVID-19 Outlays",
    "Infrastructure Obligations",
    "Infrastructure Outlays",
    "Awarding Agency",
    "Awarding Sub Agency",
    "Contract Award Type",
    "recipient_id",
    "prime_award_recipient_id",
    "NAICS Code",
    "Place of Performance State Code",
    "Place of Performance City Name",
]


# ---------------------------------------------------------------------------
# USASpending fetch
# ---------------------------------------------------------------------------

def _build_filters(fiscal_year: int) -> dict:
    """
    Build USASpending API filter payload.

    Filters:
        - Place of performance: Massachusetts (MA)
        - Time period: federal fiscal year (Oct 1 – Sep 30)
        - NAICS codes: IT-related
        - Award type: contracts
    """
    return {
        "place_of_performance_locations": [
            {"country": "USA", "state": "MA"}
        ],
        "time_period": [
            {
                "start_date": f"{fiscal_year - 1}-10-01",
                "end_date": f"{fiscal_year}-09-30",
            }
        ],
        "naics_codes": {"require": IT_NAICS_CODES},
        "award_type_codes": [
            "A",   # BPA Call
            "B",   # Purchase Order
            "C",   # Delivery Order
            "D",   # Definitive Contract
            "IDV_A",  # GWAC
            "IDV_B",  # IDC
            "IDV_B_A",  # IDC / GWAC
            "IDV_B_B",  # IDC / IDC
            "IDV_B_C",  # IDC / FSS
            "IDV_C",  # FSS
            "IDV_D",  # BOA
            "IDV_E",  # BPA
        ],
    }


def fetch_usaspending_awards(
    fiscal_year: int,
    limit: int = 0,
) -> list[dict]:
    """
    Fetch IT awards in Massachusetts from USASpending.gov.

    Paginates automatically. If *limit* is 0, fetches all matching awards.

    Returns:
        List of award dicts.
    """
    filters = _build_filters(fiscal_year)
    all_results: list[dict] = []
    page = 1

    logger.info(
        "Fetching USASpending awards for FY%d, MA, IT NAICS (limit=%s) ...",
        fiscal_year,
        limit or "ALL",
    )

    while True:
        payload = {
            "filters": filters,
            "fields": AWARD_FIELDS,
            "page": page,
            "limit": PAGE_SIZE,
            "sort": "Award Amount",
            "order": "desc",
            "subawards": False,
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = requests.post(
                    USASPENDING_API,
                    json=payload,
                    headers={"Content-Type": "application/json"},
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

        body = resp.json()
        results = body.get("results", [])

        if not results:
            logger.info("No more results on page %d — pagination complete.", page)
            break

        all_results.extend(results)
        has_next = body.get("page_metadata", {}).get("hasNext", False)
        total = body.get("page_metadata", {}).get("total", "?")

        logger.info(
            "  page %d: %d awards (running_total=%d / %s)",
            page,
            len(results),
            len(all_results),
            total,
        )

        if limit and len(all_results) >= limit:
            all_results = all_results[:limit]
            break

        if not has_next:
            break

        page += 1

    logger.info("Total awards fetched: %d", len(all_results))
    return all_results


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_to_disk(records: list[dict], fiscal_year: int) -> Path:
    """Write award records to data/usaspending/awards_fyNN.json."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DATA_DIR / f"awards_fy{fiscal_year}.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, indent=2, default=str)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    logger.info("Saved %d awards to %s (%.1f MB)", len(records), out_path, size_mb)
    return out_path


# ---------------------------------------------------------------------------
# Snowflake load
# ---------------------------------------------------------------------------

def load_to_snowflake(local_path: Path) -> list[dict]:
    """
    Upload a local JSON file to Snowflake stage and COPY INTO the raw table.

    Creates RAW_USASPENDING_AWARDS as a VARIANT landing table if it does
    not already exist.
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
                COMMENT = 'Raw USASpending.gov award records ingested by ETL'
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
        description="Fetch USASpending.gov IT awards for MA and load to Snowflake",
    )
    parser.add_argument(
        "--fiscal-year",
        type=int,
        default=2026,
        help="Federal fiscal year (default: 2026 = Oct 2025 – Sep 2026)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max awards to fetch (0 = all, default: 0)",
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
        local_path = DATA_DIR / f"awards_fy{args.fiscal_year}.json"
        if not local_path.exists():
            # Fall back to generic filename
            local_path = DATA_DIR / "awards.json"
        if not local_path.exists():
            logger.error("No local file found for --load-only: %s", local_path)
            sys.exit(1)
        logger.info("Loading existing file: %s", local_path)
        results = load_to_snowflake(local_path)
        for r in results:
            logger.info("  %s", r)
        return

    records = fetch_usaspending_awards(
        fiscal_year=args.fiscal_year,
        limit=args.limit,
    )

    if not records:
        logger.warning("No awards returned — nothing to save or load.")
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
