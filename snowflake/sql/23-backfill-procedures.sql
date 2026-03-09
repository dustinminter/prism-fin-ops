-- =============================================================================
-- 23-backfill-procedures.sql
-- Historical data backfill procedures for PRISM EOTSS federal data
-- Adds: BACKFILL_CTHRU_FY, BACKFILL_USASPENDING_FY
-- Deploy: python3 ~/Desktop/maios/scripts/snow_deploy.py prism 23-backfill-procedures.sql
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- ---------------------------------------------------------------------------
-- BACKFILL_CTHRU_FY: Load a single MA fiscal year from CTHRU Socrata API
-- MA FY label = July 1 of (label-1) through June 30 of label
-- Example: CALL BACKFILL_CTHRU_FY(2020) loads FY2020 (Jul 2019 – Jun 2020)
-- Run for FY2017 through FY2023 to complete historical dataset
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE BACKFILL_CTHRU_FY(TARGET_FY NUMBER)
RETURNS VARCHAR
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python', 'requests')
HANDLER = 'run'
EXTERNAL_ACCESS_INTEGRATIONS = (SOCRATA_ACCESS)
SECRETS = ('socrata_token'=EOTSS_STAGING.SOCRATA_APP_TOKEN)
EXECUTE AS OWNER
AS $$
import requests
import os
import _snowflake

def run(session, target_fy):
    feed_name = f'CTHRU_SPENDING_FY{target_fy}'

    session.sql(f"""
        INSERT INTO EOTSS_STAGING.INGESTION_LOG (FEED_NAME, STATUS)
        SELECT '{feed_name}', 'RUNNING'
    """).collect()

    try:
        token = _snowflake.get_generic_secret_string('socrata_token')
        headers = {}
        if token and token != 'PLACEHOLDER':
            headers['X-App-Token'] = token

        base_url = 'https://cthru.data.socrata.com/api/id/pegc-naaa.csv'
        where_clause = f'budget_fiscal_year = {target_fy}'
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

            tmp_path = f'/tmp/cthru_fy{target_fy}_batch_{batch}.csv'
            with open(tmp_path, 'w') as f:
                f.write(csv_text)

            session.file.put(
                tmp_path,
                f'@EOTSS_STAGING.INGESTION_STAGE/cthru_historical/fy{target_fy}/',
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
            # Delete existing data for this FY to allow clean reload
            session.sql(f"""
                DELETE FROM EOTSS_STAGING.CTHRU_RAW
                WHERE BUDGET_FISCAL_YEAR = {target_fy}
            """).collect()

            copy_result = session.sql(f"""
                COPY INTO EOTSS_STAGING.CTHRU_RAW
                FROM @EOTSS_STAGING.INGESTION_STAGE/cthru_historical/fy{target_fy}/
                FILE_FORMAT = (TYPE = CSV FIELD_OPTIONALLY_ENCLOSED_BY = '"'
                               SKIP_HEADER = 1 EMPTY_FIELD_AS_NULL = TRUE
                               ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE)
                ON_ERROR = CONTINUE
                PURGE = TRUE
            """).collect()

            rows_loaded = sum(r['rows_loaded'] for r in copy_result) if copy_result else 0

            # Refresh aggregated spending view
            session.sql('CALL EOTSS_STAGING.REBUILD_CTHRU_SPENDING()').collect()
        else:
            rows_loaded = 0

        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'SUCCESS',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ROWS_FETCHED = {total_fetched},
                ROWS_LOADED = {rows_loaded}
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (
                SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            )
        """).collect()

        return f'SUCCESS: Fetched {total_fetched}, loaded {rows_loaded} rows for FY{target_fy}'

    except Exception as e:
        error_msg = str(e).replace("'", "''")[:1000]
        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'FAILED',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ERROR_MESSAGE = '{error_msg}'
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (
                SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            )
        """).collect()
        return f'FAILED: {error_msg}'
$$;


-- ---------------------------------------------------------------------------
-- BACKFILL_USASPENDING_FY: Load historical USASpending awards for a given FY
-- Fetches MA IT contracts (NAICS 5112/5182/5191/5415) for specified fiscal year
-- Federal FY: Oct 1 of (fy-1) through Sep 30 of fy
-- Example: CALL BACKFILL_USASPENDING_FY(2023) loads FY2023 (Oct 2022 – Sep 2023)
-- Run for FY2020 through FY2024 to build 5-year history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE BACKFILL_USASPENDING_FY(TARGET_FY NUMBER)
RETURNS VARCHAR
LANGUAGE PYTHON
RUNTIME_VERSION = '3.11'
PACKAGES = ('snowflake-snowpark-python', 'requests')
HANDLER = 'run'
EXTERNAL_ACCESS_INTEGRATIONS = (USASPENDING_ACCESS)
EXECUTE AS OWNER
AS $$
import requests

def run(session, target_fy):
    feed_name = f'USASPENDING_AWARDS_FY{target_fy}'

    session.sql(f"""
        INSERT INTO EOTSS_STAGING.INGESTION_LOG (FEED_NAME, STATUS)
        SELECT '{feed_name}', 'RUNNING'
    """).collect()

    try:
        fy = int(target_fy)
        api_url = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

        payload = {
            'filters': {
                'recipient_locations': [{'country': 'USA', 'state': 'MA'}],
                'time_period': [
                    {'start_date': f'{fy-1}-10-01', 'end_date': f'{fy}-09-30'}
                ],
                'award_type_codes': ['A', 'B', 'C', 'D'],
                'naics_codes': {'require': ['5112', '5182', '5191', '5415']}
            },
            'fields': [
                'Award ID', 'Recipient Name', 'Award Amount',
                'Total Outlays', 'Description', 'Start Date', 'End Date',
                'Awarding Agency', 'Awarding Sub Agency', 'Award Type',
                'NAICS Code', 'NAICS Description'
            ],
            'sort': 'Award Amount',
            'order': 'desc',
            'limit': 100,
            'page': 1
        }

        all_awards = []
        for page_num in range(1, 51):
            payload['page'] = page_num
            resp = requests.post(
                api_url, json=payload, timeout=60,
                headers={'Content-Type': 'application/json'}
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get('results', [])
            if not results:
                break
            all_awards.extend(results)
            if not data.get('page_metadata', {}).get('hasNext', False):
                break

        total_fetched = len(all_awards)

        if total_fetched > 0:
            # Delete existing data for this FY to allow clean reload
            session.sql(f"""
                DELETE FROM EOTSS_STAGING.USASPENDING_AWARDS_RAW
                WHERE FISCAL_YEAR = {fy}
            """).collect()

            batch_size = 50
            rows_loaded = 0
            for i in range(0, len(all_awards), batch_size):
                batch = all_awards[i:i+batch_size]
                values = []
                for a in batch:
                    aid   = str(a.get('Award ID', '')).replace("'", "''")
                    rname = str(a.get('Recipient Name', '')).replace("'", "''")
                    amt   = float(a.get('Award Amount', 0) or 0)
                    out   = float(a.get('Total Outlays', 0) or 0)
                    desc  = str(a.get('Description', ''))[:4000].replace("'", "''")
                    sd    = str(a.get('Start Date', '')).replace("'", "''")
                    ed    = str(a.get('End Date', '')).replace("'", "''")
                    agcy  = str(a.get('Awarding Agency', '')).replace("'", "''")
                    sub   = str(a.get('Awarding Sub Agency', '')).replace("'", "''")
                    atype = str(a.get('Award Type', '')).replace("'", "''")
                    naics = str(a.get('NAICS Code', '')).replace("'", "''")
                    ndesc = str(a.get('NAICS Description', '')).replace("'", "''")
                    values.append(
                        f"SELECT '{aid}','{rname}',{amt},{out},'{desc}',"
                        f"TRY_TO_DATE('{sd}'),TRY_TO_DATE('{ed}'),'{agcy}',"
                        f"'{sub}','{atype}','{naics}','{ndesc}',{fy}"
                    )

                session.sql(f"""
                    INSERT INTO EOTSS_STAGING.USASPENDING_AWARDS_RAW
                        (AWARD_ID, RECIPIENT_NAME, AWARD_AMOUNT, TOTAL_OUTLAYS,
                         DESCRIPTION, START_DATE, END_DATE, AWARDING_AGENCY,
                         AWARDING_SUB_AGENCY, AWARD_TYPE, NAICS_CODE,
                         NAICS_DESCRIPTION, FISCAL_YEAR)
                    {' UNION ALL '.join(values)}
                """).collect()
                rows_loaded += len(batch)
        else:
            rows_loaded = 0

        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'SUCCESS',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ROWS_FETCHED = {total_fetched},
                ROWS_LOADED = {rows_loaded}
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (
                SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            )
        """).collect()

        return f'SUCCESS: Fetched and loaded {total_fetched} awards for FY{fy}'

    except Exception as e:
        error_msg = str(e).replace("'", "''")[:1000]
        session.sql(f"""
            UPDATE EOTSS_STAGING.INGESTION_LOG
            SET STATUS = 'FAILED',
                COMPLETED_AT = CURRENT_TIMESTAMP(),
                ERROR_MESSAGE = '{error_msg}'
            WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            AND STARTED_AT = (
                SELECT MAX(STARTED_AT) FROM EOTSS_STAGING.INGESTION_LOG
                WHERE FEED_NAME = '{feed_name}' AND STATUS = 'RUNNING'
            )
        """).collect()
        return f'FAILED: {error_msg}'
$$;


-- Confirm deployment
SELECT 'Backfill procedures deployed' AS STATUS,
       CURRENT_TIMESTAMP() AS DEPLOYED_AT;
