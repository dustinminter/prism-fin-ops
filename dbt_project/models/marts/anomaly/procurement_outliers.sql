-- Procurement outlier analysis
-- Replaces EOTSS_STAGING.V_PROCUREMENT_OUTLIERS
-- Z-score per category + HHI vendor concentration index
WITH category_stats AS (
    SELECT
        CATEGORY,
        AVG(AWARD_AMOUNT) AS CATEGORY_AVG,
        STDDEV(AWARD_AMOUNT) AS CATEGORY_STDDEV
    FROM {{ ref('stg_commbuys_awards') }}
    GROUP BY CATEGORY
    HAVING COUNT(*) >= 2
),

award_scores AS (
    SELECT
        a.AWARD_ID,
        a.VENDOR_NAME,
        a.AGENCY_CODE,
        a.CATEGORY,
        a.AWARD_DATE,
        a.AWARD_AMOUNT,
        ROUND(cs.CATEGORY_AVG, 2) AS CATEGORY_AVG,
        ROUND(cs.CATEGORY_STDDEV, 2) AS CATEGORY_STDDEV,
        CASE
            WHEN cs.CATEGORY_STDDEV > 0
            THEN ROUND((a.AWARD_AMOUNT - cs.CATEGORY_AVG) / cs.CATEGORY_STDDEV, 4)
            ELSE 0
        END AS Z_SCORE,
        CASE
            WHEN cs.CATEGORY_STDDEV > 0 AND
                 ABS((a.AWARD_AMOUNT - cs.CATEGORY_AVG) / cs.CATEGORY_STDDEV) > 2.0
            THEN TRUE
            ELSE FALSE
        END AS IS_OUTLIER
    FROM {{ ref('stg_commbuys_awards') }} a
    LEFT JOIN category_stats cs ON a.CATEGORY = cs.CATEGORY
),

agency_vendor_share AS (
    SELECT
        AGENCY_CODE,
        VENDOR_NAME,
        SUM(AWARD_AMOUNT) AS VENDOR_TOTAL,
        SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE) AS AGENCY_TOTAL,
        ROUND(SUM(AWARD_AMOUNT) / NULLIF(SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE), 0) * 100, 2) AS VENDOR_SHARE_PCT
    FROM {{ ref('stg_commbuys_awards') }}
    GROUP BY AGENCY_CODE, VENDOR_NAME
),

agency_hhi AS (
    SELECT
        AGENCY_CODE,
        ROUND(SUM(POWER(VENDOR_SHARE_PCT, 2)), 2) AS AGENCY_HHI,
        CASE
            WHEN SUM(POWER(VENDOR_SHARE_PCT, 2)) > 2500 THEN 'High'
            WHEN SUM(POWER(VENDOR_SHARE_PCT, 2)) > 1500 THEN 'Moderate'
            ELSE 'Competitive'
        END AS CONCENTRATION_LEVEL
    FROM agency_vendor_share
    GROUP BY AGENCY_CODE
)

SELECT
    aw.AWARD_ID,
    aw.VENDOR_NAME,
    aw.AGENCY_CODE,
    aw.CATEGORY,
    aw.AWARD_DATE,
    aw.AWARD_AMOUNT,
    aw.CATEGORY_AVG,
    aw.CATEGORY_STDDEV,
    aw.Z_SCORE,
    aw.IS_OUTLIER,
    hhi.AGENCY_HHI,
    hhi.CONCENTRATION_LEVEL
FROM award_scores aw
LEFT JOIN agency_hhi hhi ON aw.AGENCY_CODE = hhi.AGENCY_CODE
