#!/usr/bin/env python3
"""
Load CTHRU spending + budget data from Socrata API into Snowflake.

Pulls two datasets from the Massachusetts Comptroller's CTHRU platform:
  1. Spending transactions (pegc-naaa) — ~47.5M rows, loaded in chunks
  2. Budget authority (kv7m-35wn) — ~44K rows, loaded in one shot

Prerequisites:
  - CTHRU_RAW + CTHRU_BUDGETS_RAW tables must exist (run snowflake/sql/20-cthru-real-data.sql first)
  - Snowflake keypair auth at ~/.snowflake/keys/rsa_key.p8
  - pip install snowflake-connector-python requests cryptography

Usage:
  python3 etl/load_cthru.py                  # Load FY2024-2026 (default)
  python3 etl/load_cthru.py --fy 2020 2026   # Custom fiscal year range
  python3 etl/load_cthru.py --truncate        # Clear and reload
  python3 etl/load_cthru.py --budgets-only    # Only reload budget authority

Environment variables:
  SNOWFLAKE_ACCOUNT   — Snowflake account identifier (required)
  SNOWFLAKE_USER      — Snowflake username (required)
  SNOWFLAKE_DATABASE  — Database (default: FEDERAL_FINANCIAL_DATA)
  SNOWFLAKE_SCHEMA    — Schema (default: EOTSS_STAGING)
  SNOWFLAKE_WAREHOUSE — Warehouse (default: COMPUTE_WH)
  SNOWFLAKE_ROLE      — Role (default: ACCOUNTADMIN)
  SNOWFLAKE_KEY_PATH  — Path to private key (default: ~/.snowflake/keys/rsa_key.p8)
"""

import argparse
import os
import sys
import tempfile
import time
from pathlib import Path

import requests
import snowflake.connector
from cryptography.hazmat.primitives import serialization


# ---------------------------------------------------------------------------
# Configuration (from environment)
# ---------------------------------------------------------------------------
SOCRATA_SPENDING_DATASET = "pegc-naaa"
SOCRATA_SPENDING_BASE = f"https://cthru.data.socrata.com/api/id/{SOCRATA_SPENDING_DATASET}.csv"

SOCRATA_BUDGETS_DATASET = "kv7m-35wn"
SOCRATA_BUDGETS_BASE = f"https://cthru.data.socrata.com/api/id/{SOCRATA_BUDGETS_DATASET}.csv"

CHUNK_SIZE = 50_000

SNOWFLAKE_COLUMNS = [
    "BASE_ID", "BUDGET_FISCAL_YEAR", "FISCAL_PERIOD", "TXN_DATE",
    "CABINET_SECRETARIAT", "DEPARTMENT", "APPROPRIATION_TYPE",
    "APPROPRIATION_NAME", "OBJECT_CLASS", "OBJECT_CODE",
    "ENCUMBRANCE_ID", "ZIP_CODE", "AMOUNT", "FUND", "FUND_CODE",
    "APPROPRIATION_CODE", "OBJECT", "DEPARTMENT_CODE", "VENDOR",
    "VENDOR_ID", "PAYMENT_ID", "PAYMENT_METHOD", "STATE", "CITY",
    "CREATE_DATE"
]

BUDGET_SNOWFLAKE_COLUMNS = [
    "FISCAL_YEAR", "FUND_NUMBER", "FUND_NAME", "CABINET_SECRETARIAT_NAME",
    "DEPARTMENT_NAME", "DEPARTMENT_CODE", "APPROPRIATION_ACCOUNT_NUMBER",
    "APPROPRIATION_ACCOUNT_NAME", "BEGINNING_BALANCE", "ORIGINAL_ENACTED_BUDGET",
    "SUPPLEMENTAL_BUDGET", "TRANSFER_IN", "TRANSFER_OUT",
    "AUTH_RETAINED_REVENUE_FLOOR", "AUTH_RETAINED_REVENUE_CEILING",
    "RETAINED_REVENUE_ESTIMATE", "RETAINED_REVENUE_COLLECTED",
    "PLANNED_SAVING_9C_CUTS", "TOTAL_ENACTED_BUDGET",
    "OTHER_STATUTORY_SPENDING", "TOTAL_AVAILABLE_FOR_SPENDING",
    "TOTAL_EXPENSES", "BALANCE_FORWARD", "UNEXPENDED_REVERTED",
    "APPROPRIATION_CLASS", "APPROPRIATION_CLASS_NAME", "APPROPRIATION_CLASS_DESC"
]


def get_snowflake_config() -> dict:
    """Build Snowflake config from environment variables."""
    account = os.environ.get("SNOWFLAKE_ACCOUNT")
    user = os.environ.get("SNOWFLAKE_USER")
    if not account or not user:
        print("ERROR: SNOWFLAKE_ACCOUNT and SNOWFLAKE_USER must be set", file=sys.stderr)
        sys.exit(1)

    return {
        "account": account,
        "user": user,
        "database": os.environ.get("SNOWFLAKE_DATABASE", "FEDERAL_FINANCIAL_DATA"),
        "schema": os.environ.get("SNOWFLAKE_SCHEMA", "EOTSS_STAGING"),
        "warehouse": os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        "role": os.environ.get("SNOWFLAKE_ROLE", "ACCOUNTADMIN"),
    }


def get_snowflake_connection():
    """Connect to Snowflake using keypair auth."""
    config = get_snowflake_config()
    key_path = Path(os.environ.get(
        "SNOWFLAKE_KEY_PATH",
        str(Path.home() / ".snowflake" / "keys" / "rsa_key.p8"),
    ))

    with open(key_path, "rb") as f:
        p_key = serialization.load_pem_private_key(f.read(), password=None)

    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    return snowflake.connector.connect(**config, private_key=pkb)


def fetch_cthru_chunk(fy_start, fy_end, offset=0, limit=CHUNK_SIZE):
    """Fetch a chunk of CTHRU spending data from Socrata API."""
    params = {
        "$where": f"budget_fiscal_year >= {fy_start} AND budget_fiscal_year <= {fy_end}",
        "$order": ":id",
        "$limit": str(limit),
        "$offset": str(offset),
    }
    resp = requests.get(SOCRATA_SPENDING_BASE, params=params, timeout=120)
    resp.raise_for_status()
    return resp.text


def load_chunk_to_snowflake(conn, csv_text, chunk_num):
    """Load a CSV chunk into Snowflake via PUT + COPY INTO."""
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "EOTSS_STAGING")
    cur = conn.cursor()

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=f"_cthru_{chunk_num}.csv", delete=False
    ) as f:
        f.write(csv_text)
        tmp_path = f.name

    try:
        stage_name = "@~/cthru_staging"
        cur.execute(f"PUT 'file://{tmp_path}' {stage_name} AUTO_COMPRESS=TRUE OVERWRITE=TRUE")

        filename = os.path.basename(tmp_path)
        cur.execute(f"""
            COPY INTO {schema}.CTHRU_RAW ({', '.join(SNOWFLAKE_COLUMNS)})
            FROM {stage_name}/{filename}.gz
            FILE_FORMAT = (
                TYPE = CSV
                SKIP_HEADER = 1
                FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                NULL_IF = ('UNASSIGNED', '')
                EMPTY_FIELD_AS_NULL = TRUE
                TIMESTAMP_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.FF3'
                DATE_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.FF3'
            )
            ON_ERROR = CONTINUE
            PURGE = TRUE
        """)

        result = cur.fetchone()
        return result
    finally:
        os.unlink(tmp_path)
        cur.close()


def load_budgets(conn, fy_start, fy_end):
    """Load CTHRU Budgets data into CTHRU_BUDGETS_RAW."""
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "EOTSS_STAGING")
    cur = conn.cursor()
    print(f"\n=== Loading CTHRU Budget Authority ===")

    fy_list = ",".join(f"{y}.0" for y in range(fy_start, fy_end + 1))

    count_url = f"{SOCRATA_BUDGETS_BASE}?$select=count(*) as c&$where=fiscal_year in({fy_list})"
    resp = requests.get(count_url, timeout=30)
    total_rows = int(resp.text.strip().split("\n")[1].strip('"'))
    print(f"Budget rows to load: {total_rows:,}")

    cur.execute(f"TRUNCATE TABLE IF EXISTS {schema}.CTHRU_BUDGETS_RAW")

    params = {
        "$where": f"fiscal_year in({fy_list})",
        "$order": ":id",
        "$limit": "50000",
    }
    resp = requests.get(SOCRATA_BUDGETS_BASE, params=params, timeout=120)
    resp.raise_for_status()
    csv_text = resp.text
    row_count = csv_text.count("\n") - 1
    print(f"Fetched {row_count:,} budget rows")

    with tempfile.NamedTemporaryFile(
        mode="w", suffix="_cthru_budgets.csv", delete=False
    ) as f:
        f.write(csv_text)
        tmp_path = f.name

    try:
        stage_name = "@~/cthru_staging"
        cur.execute(f"PUT 'file://{tmp_path}' {stage_name} AUTO_COMPRESS=TRUE OVERWRITE=TRUE")
        filename = os.path.basename(tmp_path)
        cur.execute(f"""
            COPY INTO {schema}.CTHRU_BUDGETS_RAW ({', '.join(BUDGET_SNOWFLAKE_COLUMNS)})
            FROM {stage_name}/{filename}.gz
            FILE_FORMAT = (
                TYPE = CSV
                SKIP_HEADER = 1
                FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                NULL_IF = ('')
                EMPTY_FIELD_AS_NULL = TRUE
            )
            ON_ERROR = CONTINUE
            PURGE = TRUE
        """)
        result = cur.fetchone()
        print(f"COPY result: {result}")
    finally:
        os.unlink(tmp_path)

    cur.execute(f"SELECT COUNT(*) FROM {schema}.CTHRU_BUDGETS_RAW")
    count = cur.fetchone()[0]
    print(f"CTHRU_BUDGETS_RAW row count: {count:,}")

    cur.close()
    return count


def main():
    parser = argparse.ArgumentParser(description="Load CTHRU data into Snowflake")
    parser.add_argument("--fy", nargs=2, type=int, default=[2024, 2026],
                        metavar=("START", "END"), help="Fiscal year range (default: 2024 2026)")
    parser.add_argument("--truncate", action="store_true",
                        help="Truncate CTHRU_RAW before loading")
    parser.add_argument("--budgets-only", action="store_true",
                        help="Only reload budget authority data")
    args = parser.parse_args()

    fy_start, fy_end = args.fy
    print(f"=== CTHRU Data Loader ===")
    print(f"Fiscal years: FY{fy_start} - FY{fy_end}")
    print()

    conn = get_snowflake_connection()
    cur = conn.cursor()
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "EOTSS_STAGING")

    load_budgets(conn, fy_start, fy_end)

    if args.budgets_only:
        print("\nDone (budgets only).")
        cur.close()
        conn.close()
        return

    print(f"\n=== Loading CTHRU Spending Transactions ===")

    count_url = (
        f"{SOCRATA_SPENDING_BASE}?$select=count(*) as c"
        f"&$where=budget_fiscal_year >= {fy_start} AND budget_fiscal_year <= {fy_end}"
    )
    resp = requests.get(count_url, timeout=30)
    total_rows = int(resp.text.strip().split("\n")[1].strip('"'))
    print(f"Total rows to load: {total_rows:,}")

    if args.truncate:
        print("Truncating CTHRU_RAW...")
        cur.execute(f"TRUNCATE TABLE {schema}.CTHRU_RAW")

    cur.execute("REMOVE @~/cthru_staging")

    offset = 0
    chunk_num = 0
    total_loaded = 0
    start_time = time.time()

    while offset < total_rows:
        chunk_num += 1
        print(f"\nChunk {chunk_num}: fetching rows {offset:,} - {offset + CHUNK_SIZE:,}...")

        csv_text = fetch_cthru_chunk(fy_start, fy_end, offset=offset, limit=CHUNK_SIZE)

        row_count = csv_text.count("\n") - 1
        if row_count <= 0:
            print("  No more data.")
            break

        print(f"  Fetched {row_count:,} rows, loading to Snowflake...")
        result = load_chunk_to_snowflake(conn, csv_text, chunk_num)
        print(f"  Result: {result}")

        total_loaded += row_count
        offset += CHUNK_SIZE

        elapsed = time.time() - start_time
        rate = total_loaded / elapsed if elapsed > 0 else 0
        pct = (total_loaded / total_rows) * 100
        print(f"  Progress: {total_loaded:,} / {total_rows:,} ({pct:.1f}%) | {rate:.0f} rows/sec")

    elapsed = time.time() - start_time
    print(f"\n=== Spending load complete ===")
    print(f"Loaded {total_loaded:,} rows in {elapsed:.1f}s")

    cur.execute(f"SELECT COUNT(*) FROM {schema}.CTHRU_RAW")
    sf_count = cur.fetchone()[0]
    print(f"CTHRU_RAW row count: {sf_count:,}")

    cur.close()
    conn.close()
    print("\nDone. Run 20-cthru-real-data.sql steps 3-5 to rebuild aggregates and swap V_CIW_SPENDING.")


if __name__ == "__main__":
    main()
