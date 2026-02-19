-- =============================================================================
-- 21-automated-ingestion.sql
-- Automated Data Ingestion via External Access + Snowpark + Tasks
-- =============================================================================
-- Replaces manual ETL scripts (etl/*.py) with Snowflake-native scheduled
-- ingestion. Uses External Access Integrations for outbound HTTP calls,
-- Snowpark Python stored procedures for the ETL logic, and Tasks for scheduling.
--
-- Feeds:
--   1. CTHRU Spending  — Socrata API (pegc-naaa), daily incremental
--   2. CTHRU Budgets   — Socrata API (kv7m-35wn), weekly full refresh
--   3. USASpending      — Public API, daily incremental
--   4. COMMBUYS         — No API (manual browser scrape), not automated
--
-- Deploy via: python3 ~/Desktop/maios/scripts/snow_deploy.py prism 21
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- STEP 1: Network Rules — allow outbound HTTPS to data source APIs
-- =============================================================================
CREATE OR REPLACE NETWORK RULE EOTSS_STAGING.SOCRATA_EGRESS_RULE
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('cthru.data.socrata.com:443');

CREATE OR REPLACE NETWORK RULE EOTSS_STAGING.USASPENDING_EGRESS_RULE
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('api.usaspending.gov:443');

-- =============================================================================
-- STEP 2: Secrets — API credentials (Socrata app token optional but recommended)
-- =============================================================================
-- Socrata works without an app token but throttles to ~1000 req/hr.
-- With an app token, throttle is ~40K req/hr.
-- Replace 'PLACEHOLDER' with real token when available.
CREATE SECRET IF NOT EXISTS EOTSS_STAGING.SOCRATA_APP_TOKEN
    TYPE = GENERIC_STRING
    SECRET_STRING = 'PLACEHOLDER';

-- =============================================================================
-- STEP 3: External Access Integrations
-- =============================================================================
CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION SOCRATA_ACCESS
    ALLOWED_NETWORK_RULES = (EOTSS_STAGING.SOCRATA_EGRESS_RULE)
    ALLOWED_AUTHENTICATION_SECRETS = (EOTSS_STAGING.SOCRATA_APP_TOKEN)
    ENABLED = TRUE;

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION USASPENDING_ACCESS
    ALLOWED_NETWORK_RULES = (EOTSS_STAGING.USASPENDING_EGRESS_RULE)
    ENABLED = TRUE;

-- =============================================================================
-- STEP 4: Staging area for ingested data
-- =============================================================================
CREATE STAGE IF NOT EXISTS EOTSS_STAGING.INGESTION_STAGE
    FILE_FORMAT = (TYPE = CSV FIELD_OPTIONALLY_ENCLOSED_BY = '"' SKIP_HEADER = 1 EMPTY_FIELD_AS_NULL = TRUE);

CREATE OR REPLACE FILE FORMAT EOTSS_STAGING.INGESTION_JSON_FORMAT
    TYPE = JSON
    STRIP_OUTER_ARRAY = TRUE;

-- =============================================================================
-- STEP 5: Ingestion log table
-- =============================================================================
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.INGESTION_LOG (
    RUN_ID         VARCHAR DEFAULT UUID_STRING(),
    FEED_NAME      VARCHAR NOT NULL,
    STARTED_AT     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    COMPLETED_AT   TIMESTAMP_NTZ,
    STATUS         VARCHAR DEFAULT 'RUNNING',  -- RUNNING, SUCCESS, FAILED
    ROWS_FETCHED   NUMBER DEFAULT 0,
    ROWS_LOADED    NUMBER DEFAULT 0,
    ERROR_MESSAGE  VARCHAR,
    PARAMETERS     VARIANT
);

-- =============================================================================
-- STEP 6: CTHRU Spending Incremental Loader (Socrata API)
-- =============================================================================
-- Fetches spending records modified since last successful load.
-- Socrata supports $where filters and pagination via $offset/$limit.
-- Daily incremental: pulls records for current fiscal year only.
-- =============================================================================
CREATE OR REPLACE PROCEDURE EOTSS_STAGING.INGEST_CTHRU_SPENDING()
RETURNS VARCHAR
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python', 'requests')
HANDLER = 'run'
EXTERNAL_ACCESS_INTEGRATIONS = (SOCRATA_ACCESS)
SECRETS = ('socrata_token' = EOTSS_STAGING.SOCRATA_APP_TOKEN)
AS
$$
import requests
import os
import _snowflake
from datetime import datetime

def run(session):
    feed_name = 'CTHRU_SPENDING'

    session.sql(f"""
        INSERT INTO EOTSS_STAGING.INGESTION_LOG (FEED_NAME, STATUS)
        SELECT '{feed_name}', 'RUNNING'
    """).collect()

    try:
        token = _snowflake.get_generic_secret_string('socrata_token')
        headers = {}
        if token and token != 'PLACEHOLDER':
            headers['X-App-Token'] = token

        now = datetime.now()
        if now.month >= 7:
            fy_start = now.year
        else:
            fy_start = now.year - 1
        fy_end = fy_start + 1

        base_url = "https://cthru.data.socrata.com/api/id/pegc-naaa.csv"
        where_clause = f"budget_fiscal_year >= {fy_start} AND budget_fiscal_year <= {fy_end}"
        limit = 50000
        offset = 0
        total_fetched = 0
        batch = 0

        while True:
            params = {
                '$where': where_clause,
                '$order': ':id',
                '$limit': limit,
                '$offset': offset
            }

            resp = requests.get(base_url, params=params, headers=headers, timeout=300)
            resp.raise_for_status()

            csv_text = resp.text
            lines = csv_text.strip().split('\n')
            data_lines = len(lines) - 1

            if data_lines <= 0:
                break

            tmp_path = f"/tmp/cthru_spending_batch_{batch}.csv"
            with open(tmp_path, 'w') as f:
                f.write(csv_text)

            session.file.put(
                tmp_path,
                "@EOTSS_STAGING.INGESTION_STAGE/cthru_spending/",
                auto_compress=True,
                overwrite=True
            )
            os.remove(tmp_path)

            total_fetched += data_lines
            offset += limit
            batch += 1

            if total_fetched >= 5000000:
                break
            if data_lines < limit:
                break

        if total_fetched > 0:
            session.sql(f"""
                DELETE FROM EOTSS_STAGING.CTHRU_RAW
                WHERE BUDGET_FISCAL_YEAR >= {fy_start} AND BUDGET_FISCAL_YEAR <= {fy_end}
            """).collect()

            copy_result = session.sql("""
                COPY INTO EOTSS_STAGING.CTHRU_RAW
                FROM @EOTSS_STAGING.INGESTION_STAGE/cthru_spending/
                FILE_FORMAT = (TYPE = CSV FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                               SKIP_HEADER = 1 EMPTY_FIELD_AS_NULL = TRUE
                               ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE)
                ON_ERROR = CONTINUE
                PURGE = TRUE
            """).collect()

            rows_loaded = sum(r['rows_loaded'] for r in copy_result) if copy_result else 0
        else:
            rows_loaded = 0

        session.sql("CALL EOTSS_STAGING.REBUILD_CTHRU_SPENDING()").collect()

        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'SUCCESS',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ROWS_FETCHED = {total_fetched},
                ROWS_LOADED = {rows_loaded}
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()

        return f"SUCCESS: Fetched {total_fetched}, loaded {rows_loaded} rows for FY{fy_start}-{fy_end}"

    except Exception as e:
        error_msg = str(e).replace("'", "''")[:1000]
        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'FAILED',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ERROR_MESSAGE = '{error_msg}'
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()
        return f"FAILED: {error_msg}"
$$;

-- =============================================================================
-- STEP 7: CTHRU Budget Authority Loader (Socrata API)
-- =============================================================================
-- Weekly full refresh of budget authority data (~44K rows).
-- Small enough to load in one shot.
-- =============================================================================
CREATE OR REPLACE PROCEDURE EOTSS_STAGING.INGEST_CTHRU_BUDGETS()
RETURNS VARCHAR
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python', 'requests')
HANDLER = 'run'
EXTERNAL_ACCESS_INTEGRATIONS = (SOCRATA_ACCESS)
SECRETS = ('socrata_token' = EOTSS_STAGING.SOCRATA_APP_TOKEN)
AS
$$
import requests
import os
import _snowflake

def run(session):
    feed_name = 'CTHRU_BUDGETS'

    session.sql(f"""
        INSERT INTO EOTSS_STAGING.INGESTION_LOG (FEED_NAME, STATUS)
        SELECT '{feed_name}', 'RUNNING'
    """).collect()

    try:
        token = _snowflake.get_generic_secret_string('socrata_token')
        headers = {}
        if token and token != 'PLACEHOLDER':
            headers['X-App-Token'] = token

        base_url = "https://cthru.data.socrata.com/api/id/kv7m-35wn.csv"
        limit = 50000
        offset = 0
        total_fetched = 0
        batch = 0

        while True:
            params = {
                '$order': ':id',
                '$limit': limit,
                '$offset': offset
            }

            resp = requests.get(base_url, params=params, headers=headers, timeout=300)
            resp.raise_for_status()

            csv_text = resp.text
            lines = csv_text.strip().split('\n')
            data_lines = len(lines) - 1

            if data_lines <= 0:
                break

            tmp_path = f"/tmp/cthru_budgets_batch_{batch}.csv"
            with open(tmp_path, 'w') as f:
                f.write(csv_text)

            session.file.put(
                tmp_path,
                "@EOTSS_STAGING.INGESTION_STAGE/cthru_budgets/",
                auto_compress=True,
                overwrite=True
            )
            os.remove(tmp_path)

            total_fetched += data_lines
            offset += limit
            batch += 1

            if data_lines < limit:
                break

        if total_fetched > 0:
            session.sql("TRUNCATE TABLE EOTSS_STAGING.CTHRU_BUDGETS_RAW").collect()

            copy_result = session.sql("""
                COPY INTO EOTSS_STAGING.CTHRU_BUDGETS_RAW
                FROM @EOTSS_STAGING.INGESTION_STAGE/cthru_budgets/
                FILE_FORMAT = (TYPE = CSV FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                               SKIP_HEADER = 1 EMPTY_FIELD_AS_NULL = TRUE
                               ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE)
                ON_ERROR = CONTINUE
                PURGE = TRUE
            """).collect()

            rows_loaded = sum(r['rows_loaded'] for r in copy_result) if copy_result else 0
        else:
            rows_loaded = 0

        session.sql("CALL EOTSS_STAGING.REBUILD_CTHRU_BUDGET_AUTHORITY()").collect()

        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'SUCCESS', COMPLETED_AT = CURRENT_TIMESTAMP(),
                ROWS_FETCHED = {total_fetched}, ROWS_LOADED = {rows_loaded}
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()

        return f"SUCCESS: Fetched {total_fetched}, loaded {rows_loaded} budget rows"

    except Exception as e:
        error_msg = str(e).replace("'", "''")[:1000]
        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'FAILED', COMPLETED_AT = CURRENT_TIMESTAMP(),
                ERROR_MESSAGE = '{error_msg}'
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()
        return f"FAILED: {error_msg}"
$$;

-- =============================================================================
-- STEP 8: USASpending Awards Loader (Public API)
-- =============================================================================
-- Daily incremental load of MA IT spending awards from USASpending.gov.
-- Uses the bulk award search endpoint (POST, no auth required).
-- =============================================================================
CREATE OR REPLACE PROCEDURE EOTSS_STAGING.INGEST_USASPENDING_AWARDS()
RETURNS VARCHAR
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python', 'requests')
HANDLER = 'run'
EXTERNAL_ACCESS_INTEGRATIONS = (USASPENDING_ACCESS)
AS
$$
import requests
import json
import os
from datetime import datetime

def run(session):
    feed_name = 'USASPENDING_AWARDS'

    session.sql(f"""
        INSERT INTO EOTSS_STAGING.INGESTION_LOG (FEED_NAME, STATUS)
        SELECT '{feed_name}', 'RUNNING'
    """).collect()

    try:
        # Determine current fiscal year
        now = datetime.now()
        if now.month >= 10:
            fy = now.year + 1
        else:
            fy = now.year

        api_url = "https://api.usaspending.gov/api/v2/search/spending_by_award/"

        payload = {
            "filters": {
                "recipient_locations": [
                    {"country": "USA", "state": "MA"}
                ],
                "time_period": [
                    {"start_date": f"{fy-1}-10-01", "end_date": f"{fy}-09-30"}
                ],
                "award_type_codes": ["A", "B", "C", "D"],  # Contracts
                "naics_codes": {
                    "require": ["5112", "5182", "5191", "5415"]  # IT NAICS codes
                }
            },
            "fields": [
                "Award ID", "Recipient Name", "Award Amount",
                "Total Outlays", "Description", "Start Date", "End Date",
                "Awarding Agency", "Awarding Sub Agency", "Award Type",
                "NAICS Code", "NAICS Description"
            ],
            "sort": "Award Amount",
            "order": "desc",
            "limit": 100,
            "page": 1
        }

        all_awards = []
        max_pages = 50  # Safety limit

        for page_num in range(1, max_pages + 1):
            payload["page"] = page_num

            resp = requests.post(api_url, json=payload, timeout=60,
                               headers={"Content-Type": "application/json"})
            resp.raise_for_status()

            data = resp.json()
            results = data.get("results", [])

            if not results:
                break

            all_awards.extend(results)

            if not data.get("page_metadata", {}).get("hasNext", False):
                break

        total_fetched = len(all_awards)

        if total_fetched > 0:
            # Ensure target table exists
            session.sql("""
                CREATE TABLE IF NOT EXISTS EOTSS_STAGING.USASPENDING_AWARDS_RAW (
                    AWARD_ID VARCHAR,
                    RECIPIENT_NAME VARCHAR,
                    AWARD_AMOUNT NUMBER(18,2),
                    TOTAL_OUTLAYS NUMBER(18,2),
                    DESCRIPTION VARCHAR,
                    START_DATE DATE,
                    END_DATE DATE,
                    AWARDING_AGENCY VARCHAR,
                    AWARDING_SUB_AGENCY VARCHAR,
                    AWARD_TYPE VARCHAR,
                    NAICS_CODE VARCHAR,
                    NAICS_DESCRIPTION VARCHAR,
                    FISCAL_YEAR NUMBER,
                    LOADED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
                )
            """).collect()

            # Delete current FY data and reload
            session.sql(f"""
                DELETE FROM EOTSS_STAGING.USASPENDING_AWARDS_RAW
                WHERE FISCAL_YEAR = {fy}
            """).collect()

            # Insert via batched SQL INSERT ... SELECT VALUES
            batch_size = 50
            rows_loaded = 0
            for i in range(0, len(all_awards), batch_size):
                batch = all_awards[i:i+batch_size]
                values = []
                for a in batch:
                    aid = str(a.get("Award ID", "")).replace("'", "''")
                    rname = str(a.get("Recipient Name", "")).replace("'", "''")
                    amt = float(a.get("Award Amount", 0) or 0)
                    outlays = float(a.get("Total Outlays", 0) or 0)
                    desc = str(a.get("Description", ""))[:4000].replace("'", "''")
                    sd = str(a.get("Start Date", "")).replace("'", "''")
                    ed = str(a.get("End Date", "")).replace("'", "''")
                    agency = str(a.get("Awarding Agency", "")).replace("'", "''")
                    sub = str(a.get("Awarding Sub Agency", "")).replace("'", "''")
                    atype = str(a.get("Award Type", "")).replace("'", "''")
                    naics = str(a.get("NAICS Code", "")).replace("'", "''")
                    ndesc = str(a.get("NAICS Description", "")).replace("'", "''")
                    values.append(
                        f"SELECT '{aid}','{rname}',{amt},{outlays},'{desc}',"
                        f"TRY_TO_DATE('{sd}'),TRY_TO_DATE('{ed}'),'{agency}',"
                        f"'{sub}','{atype}','{naics}','{ndesc}',{fy}"
                    )

                union_sql = " UNION ALL ".join(values)
                session.sql(f"""
                    INSERT INTO EOTSS_STAGING.USASPENDING_AWARDS_RAW
                        (AWARD_ID, RECIPIENT_NAME, AWARD_AMOUNT, TOTAL_OUTLAYS,
                         DESCRIPTION, START_DATE, END_DATE, AWARDING_AGENCY,
                         AWARDING_SUB_AGENCY, AWARD_TYPE, NAICS_CODE,
                         NAICS_DESCRIPTION, FISCAL_YEAR)
                    {union_sql}
                """).collect()
                rows_loaded += len(batch)
        else:
            rows_loaded = 0

        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'SUCCESS', COMPLETED_AT = CURRENT_TIMESTAMP(),
                ROWS_FETCHED = {total_fetched}, ROWS_LOADED = {rows_loaded}
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()

        return f"SUCCESS: Fetched and loaded {total_fetched} USASpending awards for FY{fy}"

    except Exception as e:
        error_msg = str(e).replace("'", "''")[:1000]
        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'FAILED', COMPLETED_AT = CURRENT_TIMESTAMP(),
                ERROR_MESSAGE = '{error_msg}'
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                              WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING')
        """).collect()
        return f"FAILED: {error_msg}"
$$;

-- =============================================================================
-- STEP 9: Helper procedures for rebuilding aggregations
-- =============================================================================
-- These are called by the ingestion procedures after loading raw data.
-- They rebuild the CTHRU_SPENDING and CTHRU_BUDGET_AUTHORITY tables
-- from the raw data, maintaining the same aggregation logic as 20-cthru-real-data.sql.
-- =============================================================================

CREATE OR REPLACE PROCEDURE EOTSS_STAGING.REBUILD_CTHRU_BUDGET_AUTHORITY()
RETURNS VARCHAR
LANGUAGE SQL
AS
BEGIN
    -- Replicate STEP 3 from 20-cthru-real-data.sql
    CREATE OR REPLACE TABLE EOTSS_STAGING.CTHRU_BUDGET_AUTHORITY AS
    SELECT
        FISCAL_YEAR                       AS BUDGET_FISCAL_YEAR,
        DEPARTMENT_CODE,
        FUND_NUMBER                       AS FUND_CODE,
        SUM(TOTAL_ENACTED_BUDGET)         AS BUDGET_AUTHORITY,
        SUM(TOTAL_AVAILABLE_FOR_SPENDING) AS TOTAL_AVAILABLE,
        SUM(TOTAL_EXPENSES)               AS BUDGET_EXPENSES,
        SUM(BEGINNING_BALANCE)            AS BEGINNING_BALANCE,
        SUM(ORIGINAL_ENACTED_BUDGET)      AS ORIGINAL_BUDGET,
        SUM(SUPPLEMENTAL_BUDGET)          AS SUPPLEMENTAL_BUDGET,
        SUM(TRANSFER_IN)                  AS TRANSFER_IN,
        SUM(TRANSFER_OUT)                 AS TRANSFER_OUT,
        SUM(UNEXPENDED_REVERTED)          AS UNEXPENDED,
        COUNT(*)                          AS APPROPRIATION_COUNT
    FROM EOTSS_STAGING.CTHRU_BUDGETS_RAW
    GROUP BY FISCAL_YEAR, DEPARTMENT_CODE, FUND_NUMBER;

    LET row_count NUMBER := (SELECT COUNT(*) FROM EOTSS_STAGING.CTHRU_BUDGET_AUTHORITY);
    RETURN 'Rebuilt CTHRU_BUDGET_AUTHORITY: ' || :row_count || ' rows';
END;

CREATE OR REPLACE PROCEDURE EOTSS_STAGING.REBUILD_CTHRU_SPENDING()
RETURNS VARCHAR
LANGUAGE SQL
AS
BEGIN
    -- Rebuild budget authority first
    CALL EOTSS_STAGING.REBUILD_CTHRU_BUDGET_AUTHORITY();

    -- Replicate STEP 4 from 20-cthru-real-data.sql
    CREATE OR REPLACE TABLE EOTSS_STAGING.CTHRU_SPENDING AS
    WITH monthly_spend AS (
        SELECT
            r.BUDGET_FISCAL_YEAR,
            r.FISCAL_PERIOD,
            r.DEPARTMENT_CODE,
            r.DEPARTMENT,
            r.CABINET_SECRETARIAT,
            r.FUND_CODE AS RAW_FUND_CODE,
            r.FUND      AS RAW_FUND_NAME,
            SUM(r.AMOUNT) AS PERIOD_EXPENDITURES,
            COUNT(*)      AS TXN_COUNT
        FROM EOTSS_STAGING.CTHRU_RAW r
        WHERE r.BUDGET_FISCAL_YEAR >= 2024
        GROUP BY r.BUDGET_FISCAL_YEAR, r.FISCAL_PERIOD, r.DEPARTMENT_CODE,
                 r.DEPARTMENT, r.CABINET_SECRETARIAT, r.FUND_CODE, r.FUND
    ),
    period_counts AS (
        SELECT BUDGET_FISCAL_YEAR, DEPARTMENT_CODE, RAW_FUND_CODE,
               COUNT(DISTINCT FISCAL_PERIOD) AS PERIOD_COUNT
        FROM monthly_spend
        GROUP BY BUDGET_FISCAL_YEAR, DEPARTMENT_CODE, RAW_FUND_CODE
    ),
    ytd_spend AS (
        SELECT
            ms.BUDGET_FISCAL_YEAR,
            ms.FISCAL_PERIOD,
            ms.DEPARTMENT_CODE,
            ms.RAW_FUND_CODE,
            SUM(ms2.PERIOD_EXPENDITURES) AS YTD_EXPENDITURES
        FROM monthly_spend ms
        JOIN monthly_spend ms2
            ON ms2.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
           AND ms2.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
           AND ms2.RAW_FUND_CODE = ms.RAW_FUND_CODE
           AND ms2.FISCAL_PERIOD <= ms.FISCAL_PERIOD
        GROUP BY ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD, ms.DEPARTMENT_CODE, ms.RAW_FUND_CODE
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD, ms.DEPARTMENT_CODE,
            COALESCE(fm.PRISM_FUND_CODE, ms.RAW_FUND_CODE))        AS RECORD_ID,
        ms.DEPARTMENT_CODE                                          AS AGENCY_CODE,
        INITCAP(REGEXP_REPLACE(ms.DEPARTMENT, '\\s*\\([A-Z0-9]+\\)\\s*$', ''))
                                                                    AS AGENCY_NAME,
        COALESCE(sm.PRISM_SECRETARIAT_ID, 'OTHER')                 AS SECRETARIAT_ID,
        COALESCE(fm.PRISM_FUND_CODE, ms.RAW_FUND_CODE)             AS FUND_CODE,
        COALESCE(fm.PRISM_FUND_NAME, ms.RAW_FUND_NAME)             AS FUND_NAME,
        CASE
            WHEN ms.FISCAL_PERIOD <= 6
            THEN DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR - 1, ms.FISCAL_PERIOD + 6, 1)
            WHEN ms.FISCAL_PERIOD <= 12
            THEN DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD - 6, 1)
            ELSE DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR, 6, 30)
        END                                                         AS FISCAL_PERIOD_DATE,
        'FY' || ms.BUDGET_FISCAL_YEAR::VARCHAR                      AS FISCAL_YEAR_LABEL,
        ms.PERIOD_EXPENDITURES                                      AS TOTAL_EXPENDITURES,
        CASE
            WHEN ba.BUDGET_AUTHORITY IS NOT NULL AND ba.BUDGET_AUTHORITY > 0
            THEN ROUND(
                ms.PERIOD_EXPENDITURES +
                (ba.BUDGET_AUTHORITY - ba.BUDGET_EXPENSES) / NULLIF(pc.PERIOD_COUNT, 0),
                2)
            ELSE ROUND(ms.PERIOD_EXPENDITURES * 1.08, 2)
        END                                                         AS TOTAL_OBLIGATIONS,
        CASE
            WHEN ba.BUDGET_AUTHORITY IS NOT NULL
            THEN ROUND(ba.BUDGET_AUTHORITY / NULLIF(pc.PERIOD_COUNT, 0), 2)
            ELSE NULL
        END                                                         AS BUDGET_AUTHORITY,
        ba.BUDGET_AUTHORITY                                         AS ANNUAL_BUDGET_AUTHORITY,
        ba.TOTAL_AVAILABLE                                          AS ANNUAL_TOTAL_AVAILABLE,
        ytd.YTD_EXPENDITURES,
        ms.TXN_COUNT
    FROM monthly_spend ms
    LEFT JOIN EOTSS_STAGING.CTHRU_SECRETARIAT_MAP sm
        ON ms.CABINET_SECRETARIAT = sm.CTHRU_CABINET_NAME
    LEFT JOIN EOTSS_STAGING.CTHRU_FUND_MAP fm
        ON ms.RAW_FUND_CODE = fm.CTHRU_FUND_CODE
    LEFT JOIN EOTSS_STAGING.CTHRU_BUDGET_AUTHORITY ba
        ON ba.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
       AND ba.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
       AND ba.FUND_CODE = ms.RAW_FUND_CODE
    LEFT JOIN period_counts pc
        ON pc.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
       AND pc.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
       AND pc.RAW_FUND_CODE = ms.RAW_FUND_CODE
    LEFT JOIN ytd_spend ytd
        ON ytd.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
       AND ytd.FISCAL_PERIOD = ms.FISCAL_PERIOD
       AND ytd.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
       AND ytd.RAW_FUND_CODE = ms.RAW_FUND_CODE;

    LET row_count NUMBER := (SELECT COUNT(*) FROM EOTSS_STAGING.CTHRU_SPENDING);
    RETURN 'Rebuilt CTHRU_SPENDING: ' || :row_count || ' rows';
END;

-- =============================================================================
-- STEP 10: Scheduled Tasks
-- =============================================================================
-- Daily CTHRU spending refresh at 4 AM ET (09:00 UTC)
-- Weekly budget refresh on Sundays at 3 AM ET (08:00 UTC)
-- Daily USASpending refresh at 5 AM ET (10:00 UTC)
-- =============================================================================

CREATE OR REPLACE TASK EOTSS_STAGING.INGEST_CTHRU_SPENDING_DAILY
    WAREHOUSE = COMPUTE_WH
    SCHEDULE = 'USING CRON 0 9 * * * UTC'
    COMMENT = 'Daily CTHRU spending incremental load from Socrata API'
AS
    CALL EOTSS_STAGING.INGEST_CTHRU_SPENDING();

CREATE OR REPLACE TASK EOTSS_STAGING.INGEST_CTHRU_BUDGETS_WEEKLY
    WAREHOUSE = COMPUTE_WH
    SCHEDULE = 'USING CRON 0 8 * * 0 UTC'
    COMMENT = 'Weekly CTHRU budget authority full refresh from Socrata API'
AS
    CALL EOTSS_STAGING.INGEST_CTHRU_BUDGETS();

CREATE OR REPLACE TASK EOTSS_STAGING.INGEST_USASPENDING_DAILY
    WAREHOUSE = COMPUTE_WH
    SCHEDULE = 'USING CRON 0 10 * * * UTC'
    COMMENT = 'Daily USASpending MA IT awards refresh'
AS
    CALL EOTSS_STAGING.INGEST_USASPENDING_AWARDS();

-- Resume tasks (tasks are created in suspended state)
ALTER TASK EOTSS_STAGING.INGEST_CTHRU_SPENDING_DAILY RESUME;
ALTER TASK EOTSS_STAGING.INGEST_CTHRU_BUDGETS_WEEKLY RESUME;
ALTER TASK EOTSS_STAGING.INGEST_USASPENDING_DAILY RESUME;

-- =============================================================================
-- STEP 11: Ingestion monitoring view
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_INGESTION_STATUS AS
SELECT
    FEED_NAME,
    MAX(CASE WHEN STATUS = 'SUCCESS' THEN COMPLETED_AT END) AS LAST_SUCCESS,
    MAX(CASE WHEN STATUS = 'FAILED' THEN COMPLETED_AT END) AS LAST_FAILURE,
    COUNT(CASE WHEN STATUS = 'SUCCESS' THEN 1 END) AS SUCCESS_COUNT,
    COUNT(CASE WHEN STATUS = 'FAILED' THEN 1 END) AS FAILURE_COUNT,
    SUM(CASE WHEN STATUS = 'SUCCESS' THEN ROWS_LOADED ELSE 0 END) AS TOTAL_ROWS_LOADED,
    MAX(CASE WHEN STATUS = 'FAILED' THEN ERROR_MESSAGE END) AS LAST_ERROR
FROM EOTSS_STAGING.INGESTION_LOG
GROUP BY FEED_NAME;

-- =============================================================================
-- Verification
-- =============================================================================
-- Check tasks are scheduled:
-- SELECT NAME, STATE, SCHEDULE, LAST_COMPLETED_TIME
-- FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
-- WHERE SCHEMA_NAME = 'EOTSS_STAGING'
--   AND NAME LIKE 'INGEST_%'
-- ORDER BY NAME;
--
-- Check ingestion log:
-- SELECT * FROM EOTSS_STAGING.V_INGESTION_STATUS;
--
-- Manual test run:
-- CALL EOTSS_STAGING.INGEST_CTHRU_BUDGETS();
-- SELECT * FROM EOTSS_STAGING.INGESTION_LOG ORDER BY STARTED_AT DESC LIMIT 5;
