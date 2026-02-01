-- SCD2 snapshot for trending spend anomaly results over time
{% snapshot snapshot_spend_anomaly_results %}

{{
    config(
      target_database='FEDERAL_FINANCIAL_DATA',
      target_schema='EOTSS_STAGING',
      unique_key='AGENCY_CODE || \'-\' || TO_CHAR(FISCAL_PERIOD_DATE, \'YYYY-MM-DD\')',
      strategy='check',
      check_cols=['TOTAL_EXPENDITURES', 'FORECAST', 'IS_ANOMALY', 'DISTANCE'],
    )
}}

SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    TOTAL_EXPENDITURES,
    FORECAST,
    LOWER_BOUND,
    UPPER_BOUND,
    IS_ANOMALY,
    PERCENTILE,
    DISTANCE
FROM {{ source('eotss_staging', 'SPEND_ANOMALY_RESULTS') }}

{% endsnapshot %}
