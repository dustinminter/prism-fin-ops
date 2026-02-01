-- =============================================================================
-- 02-eotss-sample-data.sql
-- Seed realistic Massachusetts sample data for EOTSS POC
-- =============================================================================
-- Creates EOTSS_POC schema with 4 tables:
--   CIW_SPENDING      (~200 rows) - Monthly spending by agency
--   CIP_INVESTMENTS    (~25 rows)  - State IT investment projects
--   COMMBUYS_AWARDS    (~50 rows)  - Procurement contracts
--   CTHR_WORKFORCE     (~40 rows)  - Workforce data by agency
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS EOTSS_POC;
USE SCHEMA EOTSS_POC;

-- =============================================================================
-- TABLE 1: CIW_SPENDING (~200 rows)
-- Monthly spending by agency x fund code x fiscal period
-- 24+ months (FY2024-FY2026) for FORECAST training
-- =============================================================================

CREATE OR REPLACE TABLE EOTSS_POC.CIW_SPENDING (
    RECORD_ID           NUMBER AUTOINCREMENT,
    AGENCY_CODE         VARCHAR(20)   NOT NULL,
    AGENCY_NAME         VARCHAR(200)  NOT NULL,
    SECRETARIAT_ID      VARCHAR(10)   NOT NULL,
    FUND_CODE           VARCHAR(10)   NOT NULL,
    FUND_NAME           VARCHAR(100)  NOT NULL,
    FISCAL_PERIOD_DATE  DATE          NOT NULL,
    FISCAL_YEAR_LABEL   VARCHAR(10)   NOT NULL,
    TOTAL_OBLIGATIONS   NUMBER(15,2)  NOT NULL,
    TOTAL_EXPENDITURES  NUMBER(15,2)  NOT NULL,
    BUDGET_AUTHORITY    NUMBER(15,2)  NOT NULL,
    CONSTRAINT PK_CIW_SPENDING PRIMARY KEY (RECORD_ID)
);

-- Generate spending data using a CTE approach
-- 10 representative agencies x 4 fund codes x ~6 months = ~200+ rows
INSERT INTO EOTSS_POC.CIW_SPENDING
    (AGENCY_CODE, AGENCY_NAME, SECRETARIAT_ID, FUND_CODE, FUND_NAME,
     FISCAL_PERIOD_DATE, FISCAL_YEAR_LABEL, TOTAL_OBLIGATIONS, TOTAL_EXPENDITURES, BUDGET_AUTHORITY)
WITH agencies AS (
    SELECT * FROM VALUES
        ('ITD',     'Information Technology Division',                  'EOTSS'),
        ('MASSIT',  'MassIT',                                          'EOTSS'),
        ('CYBER',   'Office of Cybersecurity',                         'EOTSS'),
        ('DPH',     'Department of Public Health',                     'HHS'),
        ('DCFS',    'Department of Children and Families',             'HHS'),
        ('MSP',     'Massachusetts State Police',                      'EOPSS'),
        ('MASSDOT', 'Massachusetts Department of Transportation',      'DOT'),
        ('DESE',    'Department of Elementary and Secondary Education', 'EOE'),
        ('DEP',     'Department of Environmental Protection',          'EEA'),
        ('OSD',     'Operational Services Division',                   'ANF')
    AS t(agency_code, agency_name, secretariat_id)
),
fund_codes AS (
    SELECT * FROM VALUES
        ('0100', 'General Fund'),
        ('0200', 'Federal Funds'),
        ('0300', 'Capital Fund'),
        ('0400', 'Trust Funds')
    AS t(fund_code, fund_name)
),
months AS (
    SELECT DATEADD('month', seq4(), '2024-07-01'::DATE) AS fiscal_period_date
    FROM TABLE(GENERATOR(ROWCOUNT => 24))
),
base AS (
    SELECT
        a.agency_code,
        a.agency_name,
        a.secretariat_id,
        f.fund_code,
        f.fund_name,
        m.fiscal_period_date,
        CASE
            WHEN m.fiscal_period_date >= '2025-07-01' THEN 'FY2026'
            WHEN m.fiscal_period_date >= '2024-07-01' THEN 'FY2025'
            ELSE 'FY2024'
        END AS fiscal_year_label,
        -- Base monthly budget varies by agency and fund
        CASE a.agency_code
            WHEN 'ITD'     THEN 8500000
            WHEN 'MASSIT'  THEN 12000000
            WHEN 'CYBER'   THEN 4200000
            WHEN 'DPH'     THEN 45000000
            WHEN 'DCFS'    THEN 28000000
            WHEN 'MSP'     THEN 18000000
            WHEN 'MASSDOT' THEN 35000000
            WHEN 'DESE'    THEN 22000000
            WHEN 'DEP'     THEN 6800000
            WHEN 'OSD'     THEN 3200000
        END *
        CASE f.fund_code
            WHEN '0100' THEN 0.55   -- General Fund gets ~55%
            WHEN '0200' THEN 0.25   -- Federal ~25%
            WHEN '0300' THEN 0.12   -- Capital ~12%
            WHEN '0400' THEN 0.08   -- Trust ~8%
        END AS base_budget
    FROM agencies a
    CROSS JOIN fund_codes f
    CROSS JOIN months m
)
SELECT
    agency_code,
    agency_name,
    secretariat_id,
    fund_code,
    fund_name,
    fiscal_period_date,
    fiscal_year_label,
    -- Obligations: base + seasonal variation + random noise
    ROUND(base_budget * (1 +
        0.08 * SIN(2 * PI() * MONTH(fiscal_period_date) / 12) +  -- seasonal
        (UNIFORM(-5, 5, RANDOM()) / 100.0)                        -- noise +-5%
    ), 2) AS total_obligations,
    -- Expenditures: 85-95% of obligations (with variation)
    ROUND(base_budget * (1 +
        0.08 * SIN(2 * PI() * MONTH(fiscal_period_date) / 12) +
        (UNIFORM(-5, 5, RANDOM()) / 100.0)
    ) * (0.85 + UNIFORM(0, 10, RANDOM()) / 100.0), 2) AS total_expenditures,
    -- Budget authority: fixed annual amount / 12, slight monthly variation
    ROUND(base_budget * (1 + (UNIFORM(-2, 2, RANDOM()) / 100.0)), 2) AS budget_authority
FROM base;

-- Inject a few anomalies for demo scenario 2 (burn rate > 90%)
-- ITD in Dec 2025: spike obligations to 140% of budget
UPDATE EOTSS_POC.CIW_SPENDING
SET TOTAL_OBLIGATIONS = BUDGET_AUTHORITY * 1.40,
    TOTAL_EXPENDITURES = BUDGET_AUTHORITY * 1.35
WHERE AGENCY_CODE = 'ITD'
  AND FUND_CODE = '0100'
  AND FISCAL_PERIOD_DATE = '2025-12-01';

-- CYBER in Jan 2026: spike to 130% (cybersecurity incident response)
UPDATE EOTSS_POC.CIW_SPENDING
SET TOTAL_OBLIGATIONS = BUDGET_AUTHORITY * 1.30,
    TOTAL_EXPENDITURES = BUDGET_AUTHORITY * 1.25
WHERE AGENCY_CODE = 'CYBER'
  AND FUND_CODE = '0100'
  AND FISCAL_PERIOD_DATE = '2026-01-01';

-- =============================================================================
-- TABLE 2: CIP_INVESTMENTS (~25 rows)
-- State IT capital investment projects
-- =============================================================================

CREATE OR REPLACE TABLE EOTSS_POC.CIP_INVESTMENTS (
    PROJECT_ID          VARCHAR(20)   NOT NULL,
    PROJECT_NAME        VARCHAR(200)  NOT NULL,
    AGENCY_CODE         VARCHAR(20)   NOT NULL,
    AGENCY_NAME         VARCHAR(200)  NOT NULL,
    SECRETARIAT         VARCHAR(10)   NOT NULL,
    POLICY_AREA         VARCHAR(100)  NOT NULL,
    PROJECT_STATUS      VARCHAR(30)   NOT NULL,
    FISCAL_YEAR_START   VARCHAR(10)   NOT NULL,
    FISCAL_YEAR_START_DATE DATE       NOT NULL,
    FISCAL_YEAR_END     VARCHAR(10)   NOT NULL,
    PLANNED_BUDGET      NUMBER(15,2)  NOT NULL,
    ACTUAL_SPEND        NUMBER(15,2)  NOT NULL,
    PERCENT_COMPLETE    NUMBER(5,2),
    PROJECT_MANAGER     VARCHAR(100),
    CONSTRAINT PK_CIP_INVESTMENTS PRIMARY KEY (PROJECT_ID)
);

INSERT INTO EOTSS_POC.CIP_INVESTMENTS VALUES
    ('CIP-2025-001', 'MassIT Cloud Migration Phase 2',        'MASSIT',  'MassIT',                                     'EOTSS', 'Cloud Infrastructure',   'In Progress', 'FY2025', '2024-07-01', 'FY2027', 18500000, 11200000, 60.50, 'J. Sullivan'),
    ('CIP-2025-002', 'EOTSS Cybersecurity Modernization',     'CYBER',   'Office of Cybersecurity',                     'EOTSS', 'Cybersecurity',          'In Progress', 'FY2025', '2024-07-01', 'FY2026', 8200000,  7800000,  85.00, 'M. Chen'),
    ('CIP-2025-003', '1MAGIC ERP Upgrade',                    'ANF',     'Executive Office for Administration and Finance','ANF', 'Enterprise Systems',     'In Progress', 'FY2025', '2024-07-01', 'FY2028', 42000000, 15600000, 37.00, 'R. Patel'),
    ('CIP-2025-004', 'MassGov Digital Experience Platform',   'MASSIT',  'MassIT',                                     'EOTSS', 'Digital Services',        'In Progress', 'FY2025', '2024-07-01', 'FY2026', 6800000,  5100000,  75.00, 'K. Thompson'),
    ('CIP-2025-005', 'MBTA Fare System Modernization',        'MBTA',    'Massachusetts Bay Transportation Authority',  'DOT',   'Transportation Tech',     'In Progress', 'FY2025', '2024-07-01', 'FY2027', 28000000, 12400000, 44.00, 'A. Rivera'),
    ('CIP-2025-006', 'DPH Health Information Exchange',       'DPH',     'Department of Public Health',                 'HHS',   'Health IT',              'Planning',    'FY2026', '2025-07-01', 'FY2028', 15200000, 1200000,  8.00,  'L. Nguyen'),
    ('CIP-2025-007', 'DCFS Case Management System',           'DCFS',    'Department of Children and Families',         'HHS',   'Human Services Tech',    'In Progress', 'FY2025', '2024-07-01', 'FY2026', 9400000,  8900000,  92.00, 'D. Williams'),
    ('CIP-2025-008', 'MSP Body Camera Data Platform',         'MSP',     'Massachusetts State Police',                  'EOPSS', 'Public Safety Tech',     'In Progress', 'FY2025', '2024-07-01', 'FY2026', 4600000,  3800000,  78.00, 'T. O''Brien'),
    ('CIP-2025-009', 'Commonwealth Zero Trust Architecture',  'CYBER',   'Office of Cybersecurity',                     'EOTSS', 'Cybersecurity',          'Planning',    'FY2026', '2025-07-01', 'FY2028', 22000000, 2100000,  10.00, 'M. Chen'),
    ('CIP-2025-010', 'MassDOT Asset Management System',       'MASSDOT', 'Massachusetts Department of Transportation',  'DOT',   'Transportation Tech',     'In Progress', 'FY2025', '2024-07-01', 'FY2027', 11500000, 7200000,  62.50, 'S. Kim'),
    ('CIP-2025-011', 'DESE Student Data Warehouse',           'DESE',    'Department of Elementary and Secondary Education','EOE','Education Tech',         'In Progress', 'FY2025', '2024-07-01', 'FY2026', 5800000,  4900000,  84.00, 'P. Garcia'),
    ('CIP-2025-012', 'DEP Environmental Monitoring IoT',      'DEP',     'Department of Environmental Protection',      'EEA',   'Environmental Tech',     'Planning',    'FY2026', '2025-07-01', 'FY2027', 3400000,  450000,   13.00, 'C. Brown'),
    ('CIP-2025-013', 'OSD Procurement Platform Upgrade',      'OSD',     'Operational Services Division',               'ANF',   'Procurement Tech',       'In Progress', 'FY2025', '2024-07-01', 'FY2026', 2800000,  2500000,  89.00, 'N. Johnson'),
    ('CIP-2025-014', 'RMV Online Services Modernization',     'RMV',     'Registry of Motor Vehicles',                  'DOT',   'Digital Services',        'In Progress', 'FY2025', '2024-07-01', 'FY2027', 14200000, 8600000,  55.00, 'E. Martinez'),
    ('CIP-2025-015', 'DTA Benefits Portal Redesign',          'DTA',     'Department of Transitional Assistance',       'HHS',   'Human Services Tech',    'In Progress', 'FY2025', '2024-07-01', 'FY2026', 7100000,  6300000,  88.00, 'F. Lee'),
    ('CIP-2025-016', 'Commonwealth Data Lake',                'MASSIT',  'MassIT',                                     'EOTSS', 'Data Infrastructure',     'In Progress', 'FY2025', '2024-07-01', 'FY2027', 16000000, 9200000,  57.50, 'J. Sullivan'),
    ('CIP-2025-017', 'EOTSS AI/ML Platform',                  'ITD',     'Information Technology Division',             'EOTSS', 'AI & Analytics',          'Planning',    'FY2026', '2025-07-01', 'FY2028', 12500000, 1800000,  14.00, 'H. Zhang'),
    ('CIP-2025-018', 'GIC Benefits Administration System',    'GIC',     'Group Insurance Commission',                  'ANF',   'Enterprise Systems',     'In Progress', 'FY2025', '2024-07-01', 'FY2026', 4200000,  3600000,  85.00, 'W. Adams'),
    ('CIP-2025-019', 'DMH Telehealth Platform',               'DMH',     'Department of Mental Health',                 'HHS',   'Health IT',              'In Progress', 'FY2025', '2024-07-01', 'FY2026', 3100000,  2800000,  90.00, 'B. Taylor'),
    ('CIP-2025-020', 'DOC Offender Management System',        'DOC',     'Department of Correction',                    'EOPSS', 'Public Safety Tech',     'In Progress', 'FY2025', '2024-07-01', 'FY2027', 8700000,  4500000,  52.00, 'G. Wilson'),
    ('CIP-2025-021', 'DOR Tax Modernization Phase 3',         'DOR',     'Department of Revenue',                       'ANF',   'Enterprise Systems',     'In Progress', 'FY2025', '2024-07-01', 'FY2027', 19500000, 12100000, 62.00, 'I. Anderson'),
    ('CIP-2025-022', 'DHE Student Financial Aid Portal',      'DHE',     'Department of Higher Education',              'EOE',   'Education Tech',         'Planning',    'FY2026', '2025-07-01', 'FY2027', 2900000,  350000,   12.00, 'V. Clark'),
    ('CIP-2025-023', 'MOBD Small Business Digital Hub',       'MOBD',    'Massachusetts Office of Business Development','EED',   'Economic Development',   'Planning',    'FY2026', '2025-07-01', 'FY2027', 1800000,  200000,   11.00, 'O. Harris'),
    ('CIP-2025-024', 'DCR Recreation Reservation System',     'DCR',     'Department of Conservation and Recreation',   'EEA',   'Digital Services',        'In Progress', 'FY2025', '2024-07-01', 'FY2026', 1500000,  1300000,  87.00, 'U. Lewis'),
    ('CIP-2025-025', 'DHCD Housing Application Portal',       'DHCD',    'Department of Housing and Community Development','DHCD','Digital Services',       'In Progress', 'FY2025', '2024-07-01', 'FY2026', 2200000,  1900000,  86.00, 'Y. Robinson');

-- =============================================================================
-- TABLE 3: COMMBUYS_AWARDS (~50 rows)
-- State procurement contracts and vendor awards
-- =============================================================================

CREATE OR REPLACE TABLE EOTSS_POC.COMMBUYS_AWARDS (
    AWARD_ID            VARCHAR(20)   NOT NULL,
    CONTRACT_NUMBER     VARCHAR(30)   NOT NULL,
    VENDOR_NAME         VARCHAR(200)  NOT NULL,
    AGENCY_CODE         VARCHAR(20)   NOT NULL,
    AGENCY_NAME         VARCHAR(200)  NOT NULL,
    CATEGORY            VARCHAR(100)  NOT NULL,
    SET_ASIDE           VARCHAR(50),
    AWARD_DATE          DATE          NOT NULL,
    AWARD_AMOUNT        NUMBER(15,2)  NOT NULL,
    CONTRACT_START_DATE DATE          NOT NULL,
    CONTRACT_END_DATE   DATE          NOT NULL,
    DESCRIPTION         VARCHAR(500),
    CONSTRAINT PK_COMMBUYS_AWARDS PRIMARY KEY (AWARD_ID)
);

INSERT INTO EOTSS_POC.COMMBUYS_AWARDS VALUES
    ('AWD-2025-001', 'ITS-78901', 'Deloitte Consulting LLP',         'MASSIT',  'MassIT',                                     'IT Services',            NULL,             '2024-09-15', 14200000, '2024-10-01', '2027-09-30', 'Cloud migration advisory and implementation services'),
    ('AWD-2025-002', 'ITS-78902', 'Accenture Federal Services',      'CYBER',   'Office of Cybersecurity',                     'Cybersecurity',          NULL,             '2024-10-01', 6800000,  '2024-11-01', '2026-10-31', 'Security operations center managed services'),
    ('AWD-2025-003', 'ITS-78903', 'Perspecta (now Peraton)',          'ITD',     'Information Technology Division',              'Cloud Infrastructure',   NULL,             '2024-08-20', 8500000,  '2024-09-01', '2027-08-31', 'AWS and Azure managed hosting services'),
    ('AWD-2025-004', 'ITS-78904', 'Leidos Inc.',                     'MSP',     'Massachusetts State Police',                   'IT Services',            NULL,             '2024-11-10', 3200000,  '2025-01-01', '2026-12-31', 'Body camera data management platform'),
    ('AWD-2025-005', 'ITS-78905', 'CGI Technologies and Solutions',  'DOR',     'Department of Revenue',                        'Enterprise Systems',     NULL,             '2024-07-15', 12800000, '2024-08-01', '2027-07-31', 'Tax modernization system integration'),
    ('AWD-2025-006', 'PRO-45601', 'Cambrian Innovation LLC',         'DEP',     'Department of Environmental Protection',       'Environmental Tech',     'Small Business', '2024-12-01', 890000,   '2025-01-01', '2026-06-30', 'IoT water quality monitoring sensors'),
    ('AWD-2025-007', 'PRO-45602', 'Nava PBC',                        'DTA',     'Department of Transitional Assistance',        'Digital Services',       'Small Business', '2025-01-15', 4200000,  '2025-02-01', '2026-07-31', 'Benefits portal user experience redesign'),
    ('AWD-2025-008', 'ITS-78906', 'Amazon Web Services Inc.',        'MASSIT',  'MassIT',                                      'Cloud Infrastructure',   NULL,             '2024-08-01', 22000000, '2024-08-01', '2027-07-31', 'Enterprise cloud services agreement - AWS'),
    ('AWD-2025-009', 'ITS-78907', 'Microsoft Corporation',           'MASSIT',  'MassIT',                                      'Cloud Infrastructure',   NULL,             '2024-08-01', 18500000, '2024-08-01', '2027-07-31', 'Enterprise cloud services agreement - Azure'),
    ('AWD-2025-010', 'ITS-78908', 'CrowdStrike Inc.',                'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-02-01', 3400000,  '2025-03-01', '2027-02-28', 'Endpoint detection and response platform'),
    ('AWD-2025-011', 'CON-33201', 'Conduent Business Services',      'RMV',     'Registry of Motor Vehicles',                   'IT Services',            NULL,             '2024-09-01', 9200000,  '2024-10-01', '2027-09-30', 'Online services modernization platform'),
    ('AWD-2025-012', 'CON-33202', 'Tyler Technologies Inc.',         'DCFS',    'Department of Children and Families',          'Enterprise Systems',     NULL,             '2024-10-15', 5600000,  '2024-11-01', '2026-10-31', 'Child welfare case management system'),
    ('AWD-2025-013', 'PRO-45603', 'Skylight Digital LLC',            'DESE',    'Department of Elementary and Secondary Education','Digital Services',     'Small Business', '2025-01-10', 1800000,  '2025-02-01', '2026-01-31', 'Student data platform API development'),
    ('AWD-2025-014', 'ITS-78909', 'Snowflake Inc.',                  'MASSIT',  'MassIT',                                      'Data Infrastructure',    NULL,             '2024-11-01', 4800000,  '2024-12-01', '2027-11-30', 'Enterprise data platform license and services'),
    ('AWD-2025-015', 'PRO-45604', 'Rapid7 Inc.',                     'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-03-01', 2100000,  '2025-04-01', '2027-03-31', 'Vulnerability management platform'),
    ('AWD-2025-016', 'CON-33203', 'Jacobs Engineering Group',        'MASSDOT', 'Massachusetts Department of Transportation',   'Transportation Tech',    NULL,             '2024-08-15', 7400000,  '2024-09-01', '2027-08-31', 'Asset management system implementation'),
    ('AWD-2025-017', 'PRO-45605', 'Trellix (formerly McAfee)',       'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-01-20', 1600000,  '2025-02-01', '2026-07-31', 'Email security and DLP solution'),
    ('AWD-2025-018', 'CON-33204', 'Gainwell Technologies',           'DPH',     'Department of Public Health',                  'Health IT',              NULL,             '2024-07-20', 11200000, '2024-08-01', '2027-07-31', 'Health information exchange platform'),
    ('AWD-2025-019', 'PRO-45606', 'Thoughtbot Inc.',                 'OSD',     'Operational Services Division',                'Digital Services',       'Small Business', '2025-02-15', 950000,   '2025-03-01', '2026-02-28', 'Procurement portal UX improvements'),
    ('AWD-2025-020', 'ITS-78910', 'Booz Allen Hamilton',             'ITD',     'Information Technology Division',              'IT Services',            NULL,             '2024-12-01', 5200000,  '2025-01-01', '2027-12-31', 'AI/ML platform architecture and implementation'),
    ('AWD-2025-021', 'PRO-45607', 'Civic Actions Inc.',              'DHCD',    'Department of Housing and Community Development','Digital Services',     'Small Business', '2025-03-10', 1200000,  '2025-04-01', '2026-03-31', 'Housing application portal development'),
    ('AWD-2025-022', 'CON-33205', 'Cubic Transportation Systems',    'MBTA',    'Massachusetts Bay Transportation Authority',   'Transportation Tech',    NULL,             '2024-09-20', 16500000, '2024-10-01', '2027-09-30', 'Fare collection system modernization'),
    ('AWD-2025-023', 'PRO-45608', 'Aptean Inc.',                     'GIC',     'Group Insurance Commission',                   'Enterprise Systems',     NULL,             '2025-01-05', 2400000,  '2025-02-01', '2026-07-31', 'Benefits administration platform upgrade'),
    ('AWD-2025-024', 'PRO-45609', 'Teranet Inc.',                    'DCR',     'Department of Conservation and Recreation',    'Digital Services',       NULL,             '2025-02-20', 680000,   '2025-03-01', '2026-02-28', 'Recreation reservation system build'),
    ('AWD-2025-025', 'CON-33206', 'Cerner Corporation',              'DMH',     'Department of Mental Health',                  'Health IT',              NULL,             '2024-10-10', 2800000,  '2024-11-01', '2026-10-31', 'Telehealth platform deployment'),
    ('AWD-2025-026', 'PRO-45610', 'Veritas HHS LLC',                 'DCFS',    'Department of Children and Families',          'Consulting',             'MBE',            '2025-03-15', 750000,   '2025-04-01', '2025-12-31', 'Child welfare process improvement consulting'),
    ('AWD-2025-027', 'PRO-45611', 'Diverse Computing Inc.',          'ITD',     'Information Technology Division',              'IT Services',            'MBE',            '2025-02-01', 1100000,  '2025-03-01', '2026-02-28', 'DevSecOps pipeline implementation'),
    ('AWD-2025-028', 'CON-33207', 'Northrop Grumman',                'DOC',     'Department of Correction',                     'Public Safety Tech',     NULL,             '2024-11-15', 5800000,  '2024-12-01', '2027-11-30', 'Offender management information system'),
    ('AWD-2025-029', 'PRO-45612', 'Stellaromics Inc.',               'DPH',     'Department of Public Health',                  'Health IT',              'WBE',            '2025-04-01', 420000,   '2025-05-01', '2026-04-30', 'Public health data analytics dashboard'),
    ('AWD-2025-030', 'ITS-78911', 'Palo Alto Networks',              'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-01-15', 4100000,  '2025-02-01', '2027-01-31', 'Next-generation firewall deployment'),
    ('AWD-2025-031', 'PRO-45613', 'MassTech Solutions LLC',          'MASSIT',  'MassIT',                                      'Cloud Infrastructure',   'Small Business', '2025-03-20', 890000,   '2025-04-01', '2026-03-31', 'Cloud cost optimization tooling'),
    ('AWD-2025-032', 'CON-33208', 'Deloitte Consulting LLP',        'MASSDOT', 'Massachusetts Department of Transportation',   'Consulting',             NULL,             '2025-01-10', 3600000,  '2025-02-01', '2026-07-31', 'Transportation systems integration strategy'),
    ('AWD-2025-033', 'PRO-45614', 'Resilient Coders Foundation',    'ITD',     'Information Technology Division',               'IT Services',            'MBE',            '2025-04-15', 340000,   '2025-05-01', '2025-12-31', 'IT apprenticeship program staffing'),
    ('AWD-2025-034', 'CON-33209', 'Oracle Corporation',              'ANF',     'Executive Office for Administration and Finance','Enterprise Systems',   NULL,             '2024-08-10', 8400000,  '2024-09-01', '2027-08-31', '1MAGIC ERP platform licensing'),
    ('AWD-2025-035', 'PRO-45615', 'Ad Hoc LLC',                     'DESE',    'Department of Elementary and Secondary Education','Digital Services',     'Small Business', '2025-02-10', 1400000,  '2025-03-01', '2026-02-28', 'Student data warehouse development'),
    ('AWD-2025-036', 'ITS-78912', 'ServiceNow Inc.',                'MASSIT',  'MassIT',                                      'IT Services',            NULL,             '2024-09-10', 3200000,  '2024-10-01', '2027-09-30', 'Enterprise ITSM platform'),
    ('AWD-2025-037', 'PRO-45616', 'Eastern Research Group',         'DEP',     'Department of Environmental Protection',       'Environmental Tech',     'Small Business', '2025-03-25', 560000,   '2025-04-01', '2026-03-31', 'Environmental compliance monitoring system'),
    ('AWD-2025-038', 'CON-33210', 'Maximus Inc.',                   'DTA',     'Department of Transitional Assistance',        'IT Services',            NULL,             '2024-12-15', 6200000,  '2025-01-01', '2027-12-31', 'Benefits eligibility determination system'),
    ('AWD-2025-039', 'PRO-45617', 'MassChallenge Innovation LLC',   'MOBD',    'Massachusetts Office of Business Development', 'Digital Services',        'Small Business', '2025-04-10', 480000,   '2025-05-01', '2026-04-30', 'Small business digital hub MVP'),
    ('AWD-2025-040', 'CON-33211', 'KForce Inc.',                    'ITD',     'Information Technology Division',              'IT Services',            NULL,             '2025-01-25', 2800000,  '2025-02-01', '2026-07-31', 'IT staff augmentation services'),
    ('AWD-2025-041', 'PRO-45618', 'Inclusive Solutions Corp.',      'HRD',     'Human Resources Division',                    'Consulting',              'WBE',            '2025-02-28', 380000,   '2025-03-01', '2025-12-31', 'DEI workforce analytics consulting'),
    ('AWD-2025-042', 'ITS-78913', 'Zscaler Inc.',                   'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-02-15', 2900000,  '2025-03-01', '2027-02-28', 'Zero trust network access platform'),
    ('AWD-2025-043', 'CON-33212', 'KPMG LLP',                      'CTR',     'Office of the Comptroller',                    'Consulting',             NULL,             '2024-11-20', 1800000,  '2024-12-01', '2025-11-30', 'Financial systems audit and advisory'),
    ('AWD-2025-044', 'PRO-45619', 'Nuance Communications',         'DMH',     'Department of Mental Health',                  'Health IT',              NULL,             '2025-03-05', 720000,   '2025-04-01', '2026-03-31', 'Telehealth platform AI features'),
    ('AWD-2025-045', 'CON-33213', 'CDW Government LLC',            'MASSIT',  'MassIT',                                      'Cloud Infrastructure',   NULL,             '2024-10-20', 5400000,  '2024-11-01', '2026-10-31', 'Hardware procurement and lifecycle management'),
    ('AWD-2025-046', 'PRO-45620', 'Coastal Analytics LLC',         'DPH',     'Department of Public Health',                  'Data Infrastructure',    'WBE',            '2025-04-20', 650000,   '2025-05-01', '2026-04-30', 'Epidemiological data pipeline development'),
    ('AWD-2025-047', 'ITS-78914', 'Splunk Inc.',                   'CYBER',   'Office of Cybersecurity',                      'Cybersecurity',          NULL,             '2025-01-30', 3600000,  '2025-02-01', '2027-01-31', 'SIEM platform enterprise license'),
    ('AWD-2025-048', 'PRO-45621', 'True North Consulting Group',   'MASSDOT', 'Massachusetts Department of Transportation',   'Consulting',             'Small Business', '2025-03-30', 920000,   '2025-04-01', '2026-03-31', 'IT infrastructure assessment'),
    ('AWD-2025-049', 'CON-33214', 'Infosys Public Services',       'MASSIT',  'MassIT',                                      'IT Services',            NULL,             '2025-02-05', 7800000,  '2025-03-01', '2028-02-28', 'Application modernization program'),
    ('AWD-2025-050', 'PRO-45622', 'NextStep Analytics LLC',        'DESE',    'Department of Elementary and Secondary Education','Data Infrastructure', 'MBE',            '2025-04-25', 520000,   '2025-05-01', '2026-04-30', 'Education outcomes analytics platform');

-- =============================================================================
-- TABLE 4: CTHR_WORKFORCE (~40 rows)
-- Workforce data by agency, job classification, and reporting period
-- =============================================================================

CREATE OR REPLACE TABLE EOTSS_POC.CTHR_WORKFORCE (
    RECORD_ID             NUMBER AUTOINCREMENT,
    AGENCY_CODE           VARCHAR(20)   NOT NULL,
    AGENCY_NAME           VARCHAR(200)  NOT NULL,
    SECRETARIAT_ID        VARCHAR(10)   NOT NULL,
    JOB_CLASSIFICATION    VARCHAR(100)  NOT NULL,
    REPORTING_PERIOD_DATE DATE          NOT NULL,
    POSITION_COUNT        NUMBER(6)     NOT NULL,
    FILLED_POSITIONS      NUMBER(6)     NOT NULL,
    SALARY_OBLIGATIONS    NUMBER(15,2)  NOT NULL,
    VACANCY_RATE          NUMBER(5,2)   NOT NULL,
    CONSTRAINT PK_CTHR_WORKFORCE PRIMARY KEY (RECORD_ID)
);

INSERT INTO EOTSS_POC.CTHR_WORKFORCE
    (AGENCY_CODE, AGENCY_NAME, SECRETARIAT_ID, JOB_CLASSIFICATION,
     REPORTING_PERIOD_DATE, POSITION_COUNT, FILLED_POSITIONS, SALARY_OBLIGATIONS, VACANCY_RATE)
VALUES
    -- EOTSS agencies
    ('ITD',    'Information Technology Division',   'EOTSS', 'IT Specialist',       '2026-01-01', 185, 162, 18200000, 12.43),
    ('ITD',    'Information Technology Division',   'EOTSS', 'Project Manager',     '2026-01-01', 42,  38,  5600000,  9.52),
    ('ITD',    'Information Technology Division',   'EOTSS', 'Administrative',      '2026-01-01', 28,  26,  2100000,  7.14),
    ('MASSIT', 'MassIT',                           'EOTSS', 'IT Specialist',       '2026-01-01', 220, 189, 22800000, 14.09),
    ('MASSIT', 'MassIT',                           'EOTSS', 'Project Manager',     '2026-01-01', 55,  48,  7200000,  12.73),
    ('MASSIT', 'MassIT',                           'EOTSS', 'Administrative',      '2026-01-01', 35,  33,  2600000,  5.71),
    ('CYBER',  'Office of Cybersecurity',          'EOTSS', 'IT Specialist',       '2026-01-01', 95,  72,  11400000, 24.21),
    ('CYBER',  'Office of Cybersecurity',          'EOTSS', 'Analyst',             '2026-01-01', 40,  32,  4800000,  20.00),
    -- HHS agencies
    ('DPH',    'Department of Public Health',      'HHS',   'Health Professional', '2026-01-01', 420, 385, 42000000, 8.33),
    ('DPH',    'Department of Public Health',      'HHS',   'IT Specialist',       '2026-01-01', 65,  52,  7800000,  20.00),
    ('DPH',    'Department of Public Health',      'HHS',   'Administrative',      '2026-01-01', 180, 172, 12600000, 4.44),
    ('DCFS',   'Department of Children and Families','HHS', 'Social Worker',       '2026-01-01', 850, 720, 64800000, 15.29),
    ('DCFS',   'Department of Children and Families','HHS', 'Administrative',      '2026-01-01', 120, 112, 8400000,  6.67),
    ('DMH',    'Department of Mental Health',      'HHS',   'Health Professional', '2026-01-01', 310, 268, 30100000, 13.55),
    ('DMH',    'Department of Mental Health',      'HHS',   'Administrative',      '2026-01-01', 85,  80,  5600000,  5.88),
    ('DTA',    'Department of Transitional Assistance','HHS','Case Worker',        '2026-01-01', 480, 425, 38200000, 11.46),
    -- EOPSS agencies
    ('MSP',    'Massachusetts State Police',       'EOPSS', 'Sworn Officer',       '2026-01-01', 2200, 2050, 245000000, 6.82),
    ('MSP',    'Massachusetts State Police',       'EOPSS', 'IT Specialist',       '2026-01-01', 45,   38,   5400000,  15.56),
    ('MSP',    'Massachusetts State Police',       'EOPSS', 'Administrative',      '2026-01-01', 120,  115,  8200000,  4.17),
    ('DOC',    'Department of Correction',         'EOPSS', 'Corrections Officer', '2026-01-01', 3800, 3420, 342000000, 10.00),
    ('DOC',    'Department of Correction',         'EOPSS', 'Administrative',      '2026-01-01', 180,  170,  12000000,  5.56),
    -- DOT agencies
    ('MASSDOT','Massachusetts Department of Transportation','DOT','Engineer',       '2026-01-01', 320, 285, 38400000, 10.94),
    ('MASSDOT','Massachusetts Department of Transportation','DOT','IT Specialist',  '2026-01-01', 75,  62,  9300000,  17.33),
    ('MASSDOT','Massachusetts Department of Transportation','DOT','Administrative', '2026-01-01', 145, 138, 10800000, 4.83),
    ('MBTA',   'Massachusetts Bay Transportation Authority','DOT','Operations',    '2026-01-01', 5200, 4850, 485000000, 6.73),
    ('MBTA',   'Massachusetts Bay Transportation Authority','DOT','Engineer',      '2026-01-01', 280,  245,  34000000,  12.50),
    ('RMV',    'Registry of Motor Vehicles',       'DOT',   'Customer Service',    '2026-01-01', 620, 565, 39200000, 8.87),
    -- EOE agencies
    ('DESE',   'Department of Elementary and Secondary Education','EOE','Education Specialist','2026-01-01', 350, 320, 35000000, 8.57),
    ('DESE',   'Department of Elementary and Secondary Education','EOE','IT Specialist',      '2026-01-01', 40,  34,  5100000, 15.00),
    ('DHE',    'Department of Higher Education',   'EOE',   'Education Specialist','2026-01-01', 85,  78,  8800000,  8.24),
    -- EEA agencies
    ('DEP',    'Department of Environmental Protection','EEA','Environmental Scientist','2026-01-01', 280, 248, 27800000, 11.43),
    ('DEP',    'Department of Environmental Protection','EEA','Administrative',        '2026-01-01', 65,  62,  4200000,  4.62),
    ('DCR',    'Department of Conservation and Recreation','EEA','Park Ranger',        '2026-01-01', 420, 380, 28500000, 9.52),
    -- ANF agencies
    ('OSD',    'Operational Services Division',    'ANF',   'Procurement Specialist','2026-01-01', 95, 82, 9200000, 13.68),
    ('OSD',    'Operational Services Division',    'ANF',   'Administrative',       '2026-01-01', 30,  28,  2100000,  6.67),
    ('CTR',    'Office of the Comptroller',        'ANF',   'Financial Analyst',    '2026-01-01', 120, 108, 14400000, 10.00),
    ('DOR',    'Department of Revenue',            'ANF',   'Tax Examiner',         '2026-01-01', 680, 620, 55800000, 8.82),
    ('HRD',    'Human Resources Division',         'ANF',   'HR Specialist',        '2026-01-01', 65,  58,  6400000,  10.77),
    -- Other
    ('DHCD',   'Department of Housing and Community Development','DHCD','Housing Specialist','2026-01-01', 145, 128, 14200000, 11.72),
    ('MOBD',   'Massachusetts Office of Business Development','EED','Business Advisor', '2026-01-01', 42,  38,  4200000,  9.52);

-- =============================================================================
-- Verification counts
-- =============================================================================
SELECT 'CIW_SPENDING' AS table_name, COUNT(*) AS row_count FROM EOTSS_POC.CIW_SPENDING
UNION ALL
SELECT 'CIP_INVESTMENTS', COUNT(*) FROM EOTSS_POC.CIP_INVESTMENTS
UNION ALL
SELECT 'COMMBUYS_AWARDS', COUNT(*) FROM EOTSS_POC.COMMBUYS_AWARDS
UNION ALL
SELECT 'CTHR_WORKFORCE', COUNT(*) FROM EOTSS_POC.CTHR_WORKFORCE;
-- Expected: ~960 CIW rows (10 agencies x 4 funds x 24 months), 25 CIP, 50 Commbuys, 40 CTHR
