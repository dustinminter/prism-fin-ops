# Executive Narrative PDF Template

## Design Principles

CFOs and agency heads have **90 seconds** to decide if a report matters. The PDF must:

1. **Lead with the verdict** - Summary first, evidence second
2. **Quantify everything** - No adjectives without numbers
3. **Surface risk, not data** - Anomalies and deviations, not charts
4. **Enable action** - Recommendations must be assignable

---

## Page Structure

### Cover Page (Page 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Agency Seal / PRISM Logo]                                     │
│                                                                 │
│  ══════════════════════════════════════════════════════════    │
│  FEDERAL SPENDING INTELLIGENCE REPORT                           │
│  ══════════════════════════════════════════════════════════    │
│                                                                 │
│  Agency:         [Department of Defense]                        │
│  Period:         [FY2025 Q1]                                    │
│  Generated:      [January 19, 2026]                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TRUST STATE: [EXECUTIVE]                                │  │
│  │  Classification: UNCLASSIFIED // FOUO                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Prepared by: PRISM FinOps Intelligence                         │
│  Model: Snowflake Cortex (mistral-large)                        │
│  Data Source: USASpending.gov                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Executive Summary (Page 2)

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BOTTOM LINE UP FRONT (BLUF)                                    │
│  ═══════════════════════════                                    │
│  [2-3 sentence verdict. What happened. What it means.]          │
│                                                                 │
│  Example:                                                       │
│  "Q1 spending increased 23% YoY to $47.2B, driven by            │
│  accelerated IT modernization contracts. Three anomalies        │
│  require immediate attention: vendor concentration at DISA      │
│  exceeds 45%, timing irregularities in end-of-quarter           │
│  obligations, and a $340M deviation from forecast in            │
│  logistics spending."                                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KEY METRICS AT A GLANCE                                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │ Total       │ YoY Change  │ Anomalies   │ Forecast    │     │
│  │ Obligations │             │ Detected    │ Variance    │     │
│  ├─────────────┼─────────────┼─────────────┼─────────────┤     │
│  │   $47.2B    │   +23.1%    │     3       │   -7.2%     │     │
│  │             │    ▲        │  ●●○        │             │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
│                                                                 │
│  Legend: ● Critical  ● Warning  ○ Info                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RISK INDICATORS                                                │
│  ┌─────────────────────────────────────┬─────────┬──────────┐  │
│  │ Indicator                           │ Status  │ Trend    │  │
│  ├─────────────────────────────────────┼─────────┼──────────┤  │
│  │ Vendor Concentration (Top 5)        │  HIGH   │    ▲     │  │
│  │ Spending Volatility                 │ NORMAL  │    ─     │  │
│  │ Forecast Accuracy (trailing 6mo)    │  GOOD   │    ▲     │  │
│  │ Obligation Timing Pattern           │ REVIEW  │    ▼     │  │
│  └─────────────────────────────────────┴─────────┴──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Anomaly Detail (Page 3)

```
┌─────────────────────────────────────────────────────────────────┐
│  ANOMALIES REQUIRING ATTENTION                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ● CRITICAL: Vendor Concentration - DISA                   │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │ What:     Top recipient received 47.3% of agency spend    │ │
│  │ Expected: < 30% concentration threshold                   │ │
│  │ Deviation: +17.3 percentage points                        │ │
│  │                                                           │ │
│  │ Evidence:                                                 │ │
│  │ • Recipient: Northrop Grumman Corp                        │ │
│  │ • Amount: $2.1B of $4.4B total                            │ │
│  │ • Award Count: 47 contracts                               │ │
│  │ • Trend: Concentration increased 8pp from prior quarter   │ │
│  │                                                           │ │
│  │ Recommended Action:                                       │ │
│  │ Review sole-source justifications for Q1 awards.          │ │
│  │ Consider small business set-aside for follow-on work.     │ │
│  │                                                           │ │
│  │ Assigned To: _________________  Due: _______________      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ● WARNING: End-of-Quarter Timing Pattern                  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │ What:     68% of Q1 obligations occurred in final week    │ │
│  │ Expected: ~25% (even distribution)                        │ │
│  │ Deviation: +43 percentage points                          │ │
│  │                                                           │ │
│  │ Evidence:                                                 │ │
│  │ • Week 1-11: $15.1B (32%)                                 │ │
│  │ • Week 12-13: $32.1B (68%)                                │ │
│  │ • Historical Average (final week): 31%                    │ │
│  │                                                           │ │
│  │ Recommended Action:                                       │ │
│  │ Review procurement pipeline for artificial urgency.       │ │
│  │ Assess if "use-or-lose" behavior is driving timing.       │ │
│  │                                                           │ │
│  │ Assigned To: _________________  Due: _______________      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Forecast Analysis (Page 4)

```
┌─────────────────────────────────────────────────────────────────┐
│  6-MONTH SPENDING FORECAST                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Model: Cortex FORECAST | Confidence: 95% | Training: 24mo     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  $B                                                       │ │
│  │  50 ┤                           ╭─────────────────────    │ │
│  │     │                     ╭─────╯    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒    │ │
│  │  45 ┤               ╭─────╯     ░░░░░░░░░░░░░░░░░░░░░░    │ │
│  │     │         ╭─────╯       ░░░░░                         │ │
│  │  40 ┤   ╭─────╯                                           │ │
│  │     │───╯                                                 │ │
│  │  35 ┼──────┬──────┬──────┬──────┬──────┬──────┬──────    │ │
│  │        Oct   Nov   Dec   Jan   Feb   Mar   Apr            │ │
│  │                                                           │ │
│  │  ─── Actual    ─── Forecast    ░░░ 95% Confidence Band    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  FORECAST SUMMARY TABLE                                         │
│  ┌──────────┬────────────┬────────────┬────────────┬────────┐  │
│  │  Month   │  Predicted │   Lower    │   Upper    │ YoY Δ  │  │
│  ├──────────┼────────────┼────────────┼────────────┼────────┤  │
│  │  Feb '26 │   $48.7B   │   $46.2B   │   $51.3B   │ +18%   │  │
│  │  Mar '26 │   $49.2B   │   $46.0B   │   $52.4B   │ +21%   │  │
│  │  Apr '26 │   $47.1B   │   $43.5B   │   $50.7B   │ +15%   │  │
│  │  May '26 │   $46.8B   │   $42.8B   │   $50.8B   │ +12%   │  │
│  │  Jun '26 │   $51.4B   │   $46.5B   │   $56.3B   │ +24%   │  │
│  │  Jul '26 │   $52.1B   │   $46.8B   │   $57.4B   │ +19%   │  │
│  └──────────┴────────────┴────────────┴────────────┴────────┘  │
│                                                                 │
│  FORECAST DRIVERS                                               │
│  • IT Modernization pipeline: +$4.2B expected                   │
│  • Continuing Resolution impact: ±$2.1B uncertainty             │
│  • Q3 historical seasonality: +8% typical                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Recommendations (Page 5)

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOMMENDED ACTIONS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IMMEDIATE (0-30 DAYS)                                          │
│  ══════════════════════                                         │
│                                                                 │
│  1. □ Review DISA vendor concentration                          │
│       Owner: Procurement Director                               │
│       Metric: Reduce top-5 concentration to <40%                │
│       Due: February 15, 2026                                    │
│                                                                 │
│  2. □ Investigate Q1 timing anomaly                             │
│       Owner: Budget Execution Officer                           │
│       Metric: Document root cause for 68% final-week spike      │
│       Due: February 1, 2026                                     │
│                                                                 │
│  SHORT-TERM (30-90 DAYS)                                        │
│  ════════════════════════                                       │
│                                                                 │
│  3. □ Implement obligation pacing dashboard                     │
│       Owner: CFO Technology Office                              │
│       Metric: Weekly obligation tracking vs. plan               │
│       Due: March 31, 2026                                       │
│                                                                 │
│  4. □ Expand small business pipeline                            │
│       Owner: OSDBU Director                                     │
│       Metric: Increase SB set-asides by 15%                     │
│       Due: April 15, 2026                                       │
│                                                                 │
│  STRATEGIC (90+ DAYS)                                           │
│  ═════════════════════                                          │
│                                                                 │
│  5. □ Develop category management strategy                      │
│       Owner: Chief Acquisition Officer                          │
│       Metric: Reduce sole-source awards by 20%                  │
│       Due: Q3 FY2026                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Evidence & Provenance (Page 6)

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA PROVENANCE & AUDIT TRAIL                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATA SOURCES                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Source              │ Freshness       │ Records Used    │   │
│  ├─────────────────────┼─────────────────┼─────────────────┤   │
│  │ USASpending.AWARDS  │ Jan 18, 2026    │ 2,847,291       │   │
│  │ ANALYTICS.MONTHLY   │ Jan 19, 2026    │ 1,248           │   │
│  │ ANALYTICS.ANOMALIES │ Jan 19, 2026    │ 47              │   │
│  │ ANALYTICS.FORECASTS │ Jan 19, 2026    │ 12              │   │
│  └─────────────────────┴─────────────────┴─────────────────┘   │
│                                                                 │
│  AI MODEL INFORMATION                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Component           │ Model                │ Version    │   │
│  ├─────────────────────┼──────────────────────┼────────────┤   │
│  │ Narrative Generation│ mistral-large        │ 2025.01    │   │
│  │ Spending Forecast   │ Cortex FORECAST      │ 1.0        │   │
│  │ Anomaly Detection   │ Cortex ANOMALY_DET   │ 1.0        │   │
│  └─────────────────────┴──────────────────────┴────────────┘   │
│                                                                 │
│  TRUST STATE AUDIT TRAIL                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ State      │ Promoted By          │ Timestamp           │   │
│  ├────────────┼──────────────────────┼─────────────────────┤   │
│  │ DRAFT      │ SYSTEM               │ 2026-01-19 08:00:00 │   │
│  │ INTERNAL   │ jsmith@agency.gov    │ 2026-01-19 10:15:00 │   │
│  │ CLIENT     │ mwilson@agency.gov   │ 2026-01-19 14:30:00 │   │
│  │ EXECUTIVE  │ cfo@agency.gov       │ 2026-01-19 16:45:00 │   │
│  └────────────┴──────────────────────┴─────────────────────┘   │
│                                                                 │
│  REPORT METADATA                                                │
│  • Narrative ID: NARR-2026-01-DOD-Q1-001                        │
│  • Generated: January 19, 2026 08:00:00 UTC                     │
│  • Version: 1.0                                                 │
│  • Hash: sha256:a7f3b2c1d4e5...                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  This report was generated by PRISM FinOps Intelligence using  │
│  Snowflake Cortex AI. All metrics are derived from official    │
│  USASpending.gov data. For questions: prism-support@agency.gov │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PDF Generation Implementation Notes

### Technology Stack
- **Library**: `@react-pdf/renderer` or `pdfmake`
- **Styling**: Federal-compliant typography (Source Sans Pro)
- **Charts**: Pre-rendered as PNG via Recharts `toDataURL()`

### Key Implementation Points

```typescript
interface NarrativePDFData {
  // Cover
  agencyName: string;
  reportingPeriod: string;
  trustState: 'DRAFT' | 'INTERNAL' | 'CLIENT' | 'EXECUTIVE';
  classification: string;

  // Summary
  bluf: string;
  totalObligations: number;
  yoyChange: number;
  anomalyCount: { critical: number; warning: number; info: number };
  forecastVariance: number;
  riskIndicators: RiskIndicator[];

  // Anomalies
  anomalies: AnomalyDetail[];

  // Forecast
  forecastData: ForecastPoint[];
  forecastDrivers: string[];

  // Recommendations
  recommendations: {
    immediate: Recommendation[];
    shortTerm: Recommendation[];
    strategic: Recommendation[];
  };

  // Provenance
  dataSources: DataSource[];
  modelInfo: ModelInfo[];
  auditTrail: AuditEntry[];
}
```

### Watermarks by Trust State

| Trust State | Watermark | Header Color |
|------------|-----------|--------------|
| DRAFT | "DRAFT - NOT FOR DISTRIBUTION" (diagonal, gray) | Gray (#6e7681) |
| INTERNAL | "INTERNAL USE ONLY" (top banner) | Blue (#58a6ff) |
| CLIENT | None | Green (#3fb950) |
| EXECUTIVE | None, gold seal indicator | Gold (#d29922) |

### Page Footer (all pages)

```
PRISM FinOps Intelligence | [Trust State] | Page X of Y | Generated: [Timestamp]
```
