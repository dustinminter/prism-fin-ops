#!/usr/bin/env python3
"""
PRISM FinOps — COMMBUYS Bid Data Loader

COMMBUYS (https://www.commbuys.com) is the Commonwealth of Massachusetts
procurement portal. It does NOT expose a public REST API — accessing bid
data requires interactive browser login via the COMMBUYS web application.

This module serves two purposes:

1. **Load existing scraped data** — The data/commbuys/ directory contains
   bid JSON files captured by an earlier Selenium/Playwright scraper session.
   This script reads those files and loads them to Snowflake.

2. **Document the manual scrape process** — Automated scraping of COMMBUYS
   is not supported in CI. The process for refreshing bid data is documented
   below for manual execution.

Manual scrape process (requires browser session):
    1. Log in to COMMBUYS at https://www.commbuys.com
    2. Navigate to Advanced Search > Open Bids
    3. Filter by Organization = "Executive Office of Technology Services"
    4. Export results or use browser devtools to capture JSON payloads
    5. Save bid detail JSON to data/commbuys/<bid_number>/bid_details.json
    6. Save holder lists to data/commbuys/<bid_number>/bid_holders.json
    7. Run this script with --load-only to push to Snowflake

Usage:
    python -m etl.commbuys_scraper --load-only
    python -m etl.commbuys_scraper --load-only --bid BD-26-1060-ITD00-ITD00-124211
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

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
logger = logging.getLogger("prism.etl.commbuys")

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "commbuys"
SNOWFLAKE_TABLE_BIDS = "EOTSS_STAGING.RAW_COMMBUYS_BIDS"
SNOWFLAKE_TABLE_HOLDERS = "EOTSS_STAGING.RAW_COMMBUYS_HOLDERS"
SNOWFLAKE_STAGE = "@EOTSS_STAGING.ETL_STAGE/commbuys/"
SNOWFLAKE_FORMAT = "EOTSS_STAGING.JSON_INGEST"


# ---------------------------------------------------------------------------
# Local data discovery
# ---------------------------------------------------------------------------

def discover_bid_directories(bid_filter: str | None = None) -> list[Path]:
    """
    Find bid directories under data/commbuys/.

    Each directory should contain bid_details.json and optionally
    bid_holders.json.
    """
    if not DATA_DIR.exists():
        logger.error("Data directory does not exist: %s", DATA_DIR)
        return []

    dirs = []
    for child in sorted(DATA_DIR.iterdir()):
        if not child.is_dir():
            continue
        if bid_filter and bid_filter not in child.name:
            continue
        details_file = child / "bid_details.json"
        if details_file.exists():
            dirs.append(child)
        else:
            logger.warning("Skipping %s — no bid_details.json found", child.name)

    logger.info("Discovered %d bid director%s", len(dirs), "y" if len(dirs) == 1 else "ies")
    return dirs


def consolidate_bids(bid_dirs: list[Path]) -> tuple[list[dict], list[dict]]:
    """
    Read all bid_details.json and bid_holders.json into consolidated lists.

    Returns:
        (bid_details_list, bid_holders_list)
    """
    all_details: list[dict] = []
    all_holders: list[dict] = []

    for bid_dir in bid_dirs:
        bid_number = bid_dir.name

        # Bid details
        details_path = bid_dir / "bid_details.json"
        if details_path.exists():
            with open(details_path, "r", encoding="utf-8") as fh:
                detail = json.load(fh)
            if isinstance(detail, dict):
                detail["_bid_number"] = bid_number
                all_details.append(detail)
            elif isinstance(detail, list):
                for d in detail:
                    d["_bid_number"] = bid_number
                all_details.extend(detail)

        # Bid holders
        holders_path = bid_dir / "bid_holders.json"
        if holders_path.exists():
            with open(holders_path, "r", encoding="utf-8") as fh:
                holders = json.load(fh)
            if isinstance(holders, list):
                for h in holders:
                    h["_bid_number"] = bid_number
                all_holders.extend(holders)
            elif isinstance(holders, dict):
                holders["_bid_number"] = bid_number
                all_holders.append(holders)

    logger.info(
        "Consolidated: %d bid details, %d bid holders",
        len(all_details),
        len(all_holders),
    )
    return all_details, all_holders


# ---------------------------------------------------------------------------
# Snowflake load
# ---------------------------------------------------------------------------

def _write_temp_json(records: list[dict], name: str) -> Path:
    """Write a temporary consolidated JSON file for Snowflake staging."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / f"_consolidated_{name}.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(records, fh, default=str)
    logger.info("Wrote %d records to %s", len(records), path)
    return path


def load_to_snowflake(
    bid_details: list[dict],
    bid_holders: list[dict],
) -> None:
    """
    Upload consolidated bid data to Snowflake.

    Creates RAW_COMMBUYS_BIDS and RAW_COMMBUYS_HOLDERS as VARIANT landing
    tables if they do not already exist.
    """
    conn = get_connection()
    try:
        ensure_stage_exists(conn)
        ensure_json_file_format(conn)

        cur = conn.cursor()
        try:
            for table_name, comment in [
                (SNOWFLAKE_TABLE_BIDS, "Raw COMMBUYS bid details ingested by ETL"),
                (SNOWFLAKE_TABLE_HOLDERS, "Raw COMMBUYS bid holders ingested by ETL"),
            ]:
                cur.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        SRC             VARIANT         NOT NULL,
                        _LOADED_AT      TIMESTAMP_NTZ   DEFAULT CURRENT_TIMESTAMP(),
                        _SOURCE_FILE    VARCHAR(512)
                    )
                    COMMENT = '{comment}'
                    """
                )
        finally:
            cur.close()

        # Load bid details
        if bid_details:
            details_path = _write_temp_json(bid_details, "bids")
            upload_to_stage(conn, details_path, f"{SNOWFLAKE_STAGE}bids/")
            results = copy_into_table(
                conn,
                stage_path=f"{SNOWFLAKE_STAGE}bids/",
                table_name=SNOWFLAKE_TABLE_BIDS,
                file_format=f"(FORMAT_NAME = '{SNOWFLAKE_FORMAT}')",
                on_error="CONTINUE",
                purge=True,
            )
            for r in results:
                logger.info("  bids: %s", r)
        else:
            logger.info("No bid details to load.")

        # Load bid holders
        if bid_holders:
            holders_path = _write_temp_json(bid_holders, "holders")
            upload_to_stage(conn, holders_path, f"{SNOWFLAKE_STAGE}holders/")
            results = copy_into_table(
                conn,
                stage_path=f"{SNOWFLAKE_STAGE}holders/",
                table_name=SNOWFLAKE_TABLE_HOLDERS,
                file_format=f"(FORMAT_NAME = '{SNOWFLAKE_FORMAT}')",
                on_error="CONTINUE",
                purge=True,
            )
            for r in results:
                logger.info("  holders: %s", r)
        else:
            logger.info("No bid holders to load.")

    finally:
        conn.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Load existing COMMBUYS bid data to Snowflake. "
            "Automated scraping is not supported — see module docstring."
        ),
    )
    parser.add_argument(
        "--load-only",
        action="store_true",
        default=True,
        help="Load existing local JSON files to Snowflake (default behavior)",
    )
    parser.add_argument(
        "--bid",
        type=str,
        default=None,
        help="Filter to a specific bid number (substring match)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Discover and consolidate data but do not upload to Snowflake",
    )
    args = parser.parse_args()

    bid_dirs = discover_bid_directories(bid_filter=args.bid)
    if not bid_dirs:
        logger.warning(
            "No bid directories found in %s. "
            "See module docstring for manual scrape instructions.",
            DATA_DIR,
        )
        return

    bid_details, bid_holders = consolidate_bids(bid_dirs)

    if args.dry_run:
        logger.info("--dry-run: skipping Snowflake upload.")
        logger.info("Bid details preview (%d records):", len(bid_details))
        for d in bid_details[:3]:
            logger.info("  %s", d.get("_bid_number", "unknown"))
        return

    load_to_snowflake(bid_details, bid_holders)
    logger.info("COMMBUYS load complete.")


if __name__ == "__main__":
    main()
