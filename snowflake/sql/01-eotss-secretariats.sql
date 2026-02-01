-- =============================================================================
-- 01-eotss-secretariats.sql
-- Expand GOVERNANCE.SECRETARIAT_AGENCIES with all major Commonwealth secretariats
-- =============================================================================
-- Run context: FEDERAL_FINANCIAL_DATA database (or adjust USE DATABASE as needed)
-- Prereq: GOVERNANCE schema and SECRETARIAT_AGENCIES table must exist
-- =============================================================================

USE SCHEMA GOVERNANCE;

-- Create table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS GOVERNANCE.SECRETARIAT_AGENCIES (
    SECRETARIAT_ID    VARCHAR(10)   NOT NULL,
    SECRETARIAT_NAME  VARCHAR(200)  NOT NULL,
    AGENCY_CODE       VARCHAR(20)   NOT NULL,
    AGENCY_NAME       VARCHAR(200)  NOT NULL,
    IS_ACTIVE         BOOLEAN       DEFAULT TRUE,
    CREATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT PK_SECRETARIAT_AGENCIES PRIMARY KEY (SECRETARIAT_ID, AGENCY_CODE)
);

-- Clear existing data to ensure clean state (idempotent re-runs)
DELETE FROM GOVERNANCE.SECRETARIAT_AGENCIES
WHERE SECRETARIAT_ID IN ('ANF','EOE','EOTSS','HHS','EOPSS','EEA','DHCD','DOT','EED');

-- =============================================================================
-- ANF - Administration and Finance
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('ANF', 'Executive Office for Administration and Finance', 'OSD',  'Operational Services Division'),
    ('ANF', 'Executive Office for Administration and Finance', 'CTR',  'Office of the Comptroller'),
    ('ANF', 'Executive Office for Administration and Finance', 'DOR',  'Department of Revenue'),
    ('ANF', 'Executive Office for Administration and Finance', 'HRD',  'Human Resources Division'),
    ('ANF', 'Executive Office for Administration and Finance', 'GIC',  'Group Insurance Commission'),
    ('ANF', 'Executive Office for Administration and Finance', 'TRB',  'Teachers Retirement Board');

-- =============================================================================
-- EOE - Education
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('EOE', 'Executive Office of Education', 'DESE', 'Department of Elementary and Secondary Education'),
    ('EOE', 'Executive Office of Education', 'DHE',  'Department of Higher Education'),
    ('EOE', 'Executive Office of Education', 'EEC',  'Department of Early Education and Care');

-- =============================================================================
-- EOTSS - Technology Services and Security
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('EOTSS', 'Executive Office of Technology Services and Security', 'ITD',   'Information Technology Division'),
    ('EOTSS', 'Executive Office of Technology Services and Security', 'MASSIT','MassIT'),
    ('EOTSS', 'Executive Office of Technology Services and Security', 'CYBER', 'Office of Cybersecurity'),
    ('EOTSS', 'Executive Office of Technology Services and Security', 'CIO',   'Office of the CIO');

-- =============================================================================
-- HHS - Health and Human Services
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('HHS', 'Executive Office of Health and Human Services', 'DPH',   'Department of Public Health'),
    ('HHS', 'Executive Office of Health and Human Services', 'DCFS',  'Department of Children and Families'),
    ('HHS', 'Executive Office of Health and Human Services', 'DMH',   'Department of Mental Health'),
    ('HHS', 'Executive Office of Health and Human Services', 'EOHHS', 'Executive Office of Health and Human Services'),
    ('HHS', 'Executive Office of Health and Human Services', 'DDS',   'Department of Developmental Services'),
    ('HHS', 'Executive Office of Health and Human Services', 'DTA',   'Department of Transitional Assistance');

-- =============================================================================
-- EOPSS - Public Safety and Security
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('EOPSS', 'Executive Office of Public Safety and Security', 'MSP', 'Massachusetts State Police'),
    ('EOPSS', 'Executive Office of Public Safety and Security', 'DOC', 'Department of Correction'),
    ('EOPSS', 'Executive Office of Public Safety and Security', 'DFS', 'Department of Fire Services');

-- =============================================================================
-- EEA - Energy and Environmental Affairs
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('EEA', 'Executive Office of Energy and Environmental Affairs', 'DEP',  'Department of Environmental Protection'),
    ('EEA', 'Executive Office of Energy and Environmental Affairs', 'DCR',  'Department of Conservation and Recreation'),
    ('EEA', 'Executive Office of Energy and Environmental Affairs', 'DOER', 'Department of Energy Resources');

-- =============================================================================
-- DHCD - Housing and Community Development
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('DHCD', 'Department of Housing and Community Development', 'DHCD', 'Department of Housing and Community Development');

-- =============================================================================
-- DOT - Transportation
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('DOT', 'Massachusetts Department of Transportation', 'MASSDOT', 'Massachusetts Department of Transportation'),
    ('DOT', 'Massachusetts Department of Transportation', 'MBTA',    'Massachusetts Bay Transportation Authority'),
    ('DOT', 'Massachusetts Department of Transportation', 'RMV',     'Registry of Motor Vehicles');

-- =============================================================================
-- EED - Economic Development
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
VALUES
    ('EED', 'Executive Office of Economic Development', 'MOBD',    'Massachusetts Office of Business Development'),
    ('EED', 'Executive Office of Economic Development', 'MASSDEV', 'MassDevelopment');

-- =============================================================================
-- Verification
-- =============================================================================
SELECT SECRETARIAT_ID, COUNT(*) AS AGENCY_COUNT
FROM GOVERNANCE.SECRETARIAT_AGENCIES
WHERE IS_ACTIVE = TRUE
GROUP BY SECRETARIAT_ID
ORDER BY SECRETARIAT_ID;
-- Expected: 9 secretariats, ~30 agencies total
