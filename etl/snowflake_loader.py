"""
PRISM FinOps — Snowflake Loader Utility

Shared module for connecting to Snowflake and loading staged data.
Reads credentials from environment variables (or .env file via python-dotenv).

Environment variables required:
    SNOWFLAKE_ACCOUNT       Snowflake account identifier (org-account format)
    SNOWFLAKE_USER          Service account username
    SNOWFLAKE_PASSWORD      Service account password
    SNOWFLAKE_WAREHOUSE     Warehouse name (default: PRISM_APP_WH)
    SNOWFLAKE_DATABASE      Database name (default: FEDERAL_FINANCIAL_DATA)
    SNOWFLAKE_ROLE          Role name (default: PRISM_APP_ROLE)
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import snowflake.connector
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

logger = logging.getLogger("prism.etl")

SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "")
SNOWFLAKE_USER = os.getenv("SNOWFLAKE_USER", "")
SNOWFLAKE_PASSWORD = os.getenv("SNOWFLAKE_PASSWORD", "")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE", "PRISM_APP_WH")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE", "FEDERAL_FINANCIAL_DATA")
SNOWFLAKE_ROLE = os.getenv("SNOWFLAKE_ROLE", "PRISM_APP_ROLE")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "EOTSS_STAGING")


def _validate_env() -> None:
    """Ensure critical environment variables are set before connecting."""
    missing = []
    if not SNOWFLAKE_ACCOUNT:
        missing.append("SNOWFLAKE_ACCOUNT")
    if not SNOWFLAKE_USER:
        missing.append("SNOWFLAKE_USER")
    if not SNOWFLAKE_PASSWORD:
        missing.append("SNOWFLAKE_PASSWORD")
    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Set them in .env or export them before running ETL scripts."
        )


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------

def get_connection() -> snowflake.connector.SnowflakeConnection:
    """
    Return an authenticated Snowflake connection using password auth.

    The caller is responsible for closing the connection (or using it as a
    context manager).
    """
    _validate_env()
    logger.info(
        "Connecting to Snowflake account=%s database=%s warehouse=%s role=%s",
        SNOWFLAKE_ACCOUNT,
        SNOWFLAKE_DATABASE,
        SNOWFLAKE_WAREHOUSE,
        SNOWFLAKE_ROLE,
    )
    conn = snowflake.connector.connect(
        account=SNOWFLAKE_ACCOUNT,
        user=SNOWFLAKE_USER,
        password=SNOWFLAKE_PASSWORD,
        warehouse=SNOWFLAKE_WAREHOUSE,
        database=SNOWFLAKE_DATABASE,
        schema=SNOWFLAKE_SCHEMA,
        role=SNOWFLAKE_ROLE,
        client_session_keep_alive=True,
    )
    logger.info("Connected successfully (session_id=%s)", conn.session_id)
    return conn


# ---------------------------------------------------------------------------
# Stage helpers
# ---------------------------------------------------------------------------

def upload_to_stage(
    conn: snowflake.connector.SnowflakeConnection,
    local_path: str | Path,
    stage_path: str,
    *,
    auto_compress: bool = True,
    overwrite: bool = True,
) -> dict:
    """
    Upload a local file to a Snowflake internal stage.

    Args:
        conn:          Active Snowflake connection.
        local_path:    Absolute or relative path to the local file.
        stage_path:    Stage destination, e.g. ``@EOTSS_STAGING.ETL_STAGE/cthru/``
        auto_compress: Let Snowflake gzip the file on upload (default True).
        overwrite:     Overwrite existing staged file (default True).

    Returns:
        dict with keys: source, target, source_size, target_size, status
    """
    local_path = Path(local_path).resolve()
    if not local_path.exists():
        raise FileNotFoundError(f"Local file not found: {local_path}")

    put_sql = (
        f"PUT 'file://{local_path}' '{stage_path}' "
        f"AUTO_COMPRESS={'TRUE' if auto_compress else 'FALSE'} "
        f"OVERWRITE={'TRUE' if overwrite else 'FALSE'}"
    )
    logger.info("PUT %s -> %s", local_path.name, stage_path)

    cur = conn.cursor()
    try:
        cur.execute(put_sql)
        row = cur.fetchone()
        result = {
            "source": row[0],
            "target": row[1],
            "source_size": row[2],
            "target_size": row[3],
            "status": row[6],
        }
        logger.info("PUT result: %s", result)
        return result
    finally:
        cur.close()


def copy_into_table(
    conn: snowflake.connector.SnowflakeConnection,
    stage_path: str,
    table_name: str,
    file_format: str,
    *,
    on_error: str = "CONTINUE",
    purge: bool = False,
) -> list[dict]:
    """
    Run a COPY INTO command to load staged data into a Snowflake table.

    Args:
        conn:         Active Snowflake connection.
        stage_path:   Stage location, e.g. ``@EOTSS_STAGING.ETL_STAGE/cthru/``
        table_name:   Fully-qualified or schema-qualified table name.
        file_format:  File format reference, e.g.
                      ``(TYPE = 'JSON', STRIP_OUTER_ARRAY = TRUE)``
                      or a named format like ``EOTSS_STAGING.JSON_FORMAT``.
        on_error:     Error handling strategy (default CONTINUE).
        purge:        Remove staged files after successful load (default False).

    Returns:
        List of dicts with per-file load results.
    """
    copy_sql = (
        f"COPY INTO {table_name} "
        f"FROM '{stage_path}' "
        f"FILE_FORMAT = {file_format} "
        f"ON_ERROR = '{on_error}' "
        f"PURGE = {'TRUE' if purge else 'FALSE'}"
    )
    logger.info("COPY INTO %s FROM %s", table_name, stage_path)

    cur = conn.cursor()
    try:
        cur.execute(copy_sql)
        rows = cur.fetchall()
        results = []
        for row in rows:
            results.append(
                {
                    "file": row[0] if len(row) > 0 else None,
                    "status": row[1] if len(row) > 1 else None,
                    "rows_parsed": row[2] if len(row) > 2 else None,
                    "rows_loaded": row[3] if len(row) > 3 else None,
                    "errors": row[5] if len(row) > 5 else None,
                }
            )
        logger.info(
            "COPY INTO complete: %d file(s), %d total rows loaded",
            len(results),
            sum(r.get("rows_loaded", 0) or 0 for r in results),
        )
        return results
    finally:
        cur.close()


def ensure_stage_exists(
    conn: snowflake.connector.SnowflakeConnection,
    stage_name: str = "ETL_STAGE",
    schema: str = "EOTSS_STAGING",
) -> None:
    """Create the internal stage if it does not already exist."""
    sql = f"CREATE STAGE IF NOT EXISTS {schema}.{stage_name} COMMENT = 'PRISM ETL data landing stage'"
    logger.info("Ensuring stage exists: %s.%s", schema, stage_name)
    cur = conn.cursor()
    try:
        cur.execute(sql)
    finally:
        cur.close()


def ensure_json_file_format(
    conn: snowflake.connector.SnowflakeConnection,
    format_name: str = "JSON_INGEST",
    schema: str = "EOTSS_STAGING",
) -> None:
    """Create a JSON file format suitable for VARIANT loading."""
    sql = (
        f"CREATE FILE FORMAT IF NOT EXISTS {schema}.{format_name} "
        f"TYPE = 'JSON' "
        f"STRIP_OUTER_ARRAY = TRUE "
        f"COMMENT = 'JSON ingest format for ETL pipelines'"
    )
    logger.info("Ensuring file format: %s.%s", schema, format_name)
    cur = conn.cursor()
    try:
        cur.execute(sql)
    finally:
        cur.close()
