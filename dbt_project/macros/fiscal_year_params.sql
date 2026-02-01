-- MA fiscal year calculation (Jul-Jun)
-- Returns fy_start_year and fiscal_year_label for current date
{% macro fiscal_year_params() %}
    CASE
        WHEN MONTH(CURRENT_DATE()) >= {{ var('fy_start_month') }} THEN YEAR(CURRENT_DATE())
        ELSE YEAR(CURRENT_DATE()) - 1
    END
{% endmacro %}

{% macro fiscal_year_label() %}
    'FY' || (
        CASE
            WHEN MONTH(CURRENT_DATE()) >= {{ var('fy_start_month') }} THEN YEAR(CURRENT_DATE()) + 1
            ELSE YEAR(CURRENT_DATE())
        END
    )::VARCHAR
{% endmacro %}
