# Data Management & Sources

This directory contains the data powering the Fin-Ops v2 dashboard. It includes a mix of real-time spending data, official budget plans, and modeled risk assessments.

## Directory Structure

- `/commbuys/`: Scraped data from the COMMBUYS procurement system, including bid details and holder lists.
- `/cthru/`: Detailed spending data from the Massachusetts CTHRU portal.
  - `transactions.json`: Full list of individual spending transactions with all available metadata.
  - `metrics.json`: Aggregated metrics (top vendors, object classes, etc.) from CTHRU.
  - `monthly-trends.json`: Time-series data comparing planned burn vs. actual spend.
- `/sources/`: Raw source files (e.g., CSV exports from official sites) used to generate the application data.
- `agencies.json`: Aggregated financial metrics per agency, combining CIP plans and CTHRU spending.
- `cip-line-items.json`: Detailed line items from the Capital Investment Plan with associated CTHRU transactions.
- `risk-findings.json`: Automated risk assessments based on variance analysis.

---

## Data Sources & Authenticity

We strive to use real data from primary sources wherever possible. Below is a breakdown of what is real, what is modeled, and what is currently placeholder.

### 1. CIP Planned Amounts (Real)
- **Source:** Massachusetts Capital Investment Plan (budget.digital.mass.gov)
- **Status:** **REAL**. These figures come directly from official state budget documents for FY25 and FY26.

### 2. Consumed Spending (Real)
- **Source:** CTHRU Socrata API (statewide spending transactions)
- **Status:** **REAL**. All "Consumed" amounts and individual transactions are pulled from the official Commonwealth spending database.

### 3. Monthly Trends (Modeled)
- **Actual Burn:** **REAL**. Aggregated directly from CTHRU transaction dates.
- **Planned Burn:** **MODELED**. Official CIP data only provides annual totals. The monthly planned burn is an *estimation* calculated by distributing the annual budget using seasonal weighting.

### 4. Risk Findings (Calculated/Modeled)
- **Variance & Severity:** **REAL**. These are calculated directly from the difference between real plans and real spending.
- **Titles & Drivers:** **LOGIC-BASED**. Generated automatically based on the magnitude of variance.
- **Owners (e.g., "J. Martinez"):** **PLACEHOLDER**. Currently assigned randomly for UI demonstration purposes.
- **Recommended Steps:** **TEMPLATED**. Heuristics-based suggestions based on the type of variance detected.

### 5. Procurement Data (Real)
- **Source:** COMMBUYS Scraper
- **Status:** **REAL**. Data is scraped directly from the official COMMBUYS portal.

---

## Data Refresh Pipeline

To update the application data:

1. **Scrape COMMBUYS (Optional):**
   ```bash
   cd server
   python3 commbuys_scraper.py
   ```

2. **Update CTHRU & CIP:**
   - Export latest CIP CSVs to `server/` (see `sources/` for naming convention).
   - Run the acquisition and transformation scripts:
   ```bash
   cd server
   python3 cthru_acquisition.py    # Fetch latest spending
   python3 transform_to_json.py    # Combine and process
   ```
