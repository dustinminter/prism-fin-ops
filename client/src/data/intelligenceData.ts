import {
  Target,
  AlertTriangle,
  Activity,
  Globe,
  type LucideIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

export type ScenarioId =
  | "spending"
  | "anomalies"
  | "forecast"
  | "cross";

export type ChartType = "bar" | "line" | "area" | "pie" | "composed" | "heatmap";

export type ValueFormat = "currency" | "percent" | "compact" | "number";

export interface ChartSeries {
  dataKey: string;
  label: string;
  color: string;
  type?: "bar" | "line" | "area";
  formatter?: ValueFormat;
  stackId?: string;
}

export interface ChartAxisConfig {
  dataKey: string;
  label?: string;
  formatter?: ValueFormat;
}

export interface HeatMapConfig {
  rowKey: string;
  colKey: string;
  valueKey: string;
  colorScale: "diverging" | "sequential" | "severity";
}

export interface KPICard {
  label: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
  sparklineData?: number[];
  color?: string;
  formatter?: ValueFormat;
}

export interface ChartData {
  type: ChartType;
  title?: string;
  data: Record<string, unknown>[];
  series: ChartSeries[];
  xAxis?: ChartAxisConfig;
  yAxis?: ChartAxisConfig;
  heatmap?: HeatMapConfig;
  availableTypes?: ChartType[];
}

export interface KPI {
  label: string;
  value: string;
  color?: "blue" | "green" | "gold" | "red" | "purple" | "sfBlue";
  valueFontSize?: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
  sparklineData?: number[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  table?: { headers: string[]; rows: ChatTableRow[] };
  chart?: ChartData;
  kpis?: KPICard[];
  sql?: string;
  insight?: string;
  source?: string;
  verified?: boolean;
}

export interface ChatTableRow {
  cells: { value: string; className?: string }[];
}

export interface ScenarioData {
  id: ScenarioId;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
  kpis: KPI[];
  suggestions: string[];
  conversations: ChatMessage[];
  chips: string[];
}

// ── Scenario Data ──────────────────────────────────────────────────────

const spendingScenario: ScenarioData = {
  id: "spending",
  label: "Agency Spending Q&A",
  icon: Target,
  kpis: [
    { label: "Total Spending (YTD)", value: "$1.28B", color: "blue", change: "FY2026 • All agencies", changeDirection: "neutral", sparklineData: [145, 162, 178, 190, 205, 198, 210] },
    { label: "Agencies Tracked", value: "10", change: "7 secretariats", changeDirection: "neutral" },
    { label: "Unliquidated (ULO)", value: "$18.4M", color: "gold", change: "+6.2% exposure", changeDirection: "down", sparklineData: [12, 14, 15, 16, 17, 18, 18.4] },
    { label: "Avg Burn Rate", value: "56.8%", color: "green", change: "On target at mid-year", changeDirection: "up", sparklineData: [42, 48, 50, 52, 54, 55, 56.8] },
  ],
  suggestions: [
    "What is total spending by secretariat for FY2026?",
    "Which agencies are over budget this quarter?",
    "Show me monthly spending trend for MASSIT",
  ],
  conversations: [
    { role: "user", content: "What is total spending by secretariat for FY2026?" },
    {
      role: "assistant",
      content: "Here's total spending by secretariat for FY2026 (July 2025 – January 2026):",
      chart: {
        type: "bar",
        title: "Total Expenditures by Secretariat (FY2026)",
        data: [
          { secretariat: "HHS", obligations: 525.2, expenditures: 468.4 },
          { secretariat: "DOT", obligations: 252.8, expenditures: 225.1 },
          { secretariat: "EOTSS", obligations: 180.6, expenditures: 159.3 },
          { secretariat: "EOE", obligations: 158.4, expenditures: 141.2 },
          { secretariat: "EOPSS", obligations: 130.1, expenditures: 115.9 },
          { secretariat: "EEA", obligations: 49.1, expenditures: 43.7 },
          { secretariat: "ANF", obligations: 23.1, expenditures: 20.6 },
        ],
        series: [
          { dataKey: "obligations", label: "Obligations ($M)", color: "#29B5E8", formatter: "currency" },
          { dataKey: "expenditures", label: "Expenditures ($M)", color: "#22c55e", formatter: "currency" },
        ],
        xAxis: { dataKey: "secretariat", label: "Secretariat" },
        yAxis: { dataKey: "obligations", formatter: "currency" },
        availableTypes: ["bar", "pie", "line"],
      },
      table: {
        headers: ["SECRETARIAT_ID", "AGENCY_COUNT", "TOTAL_OBLIGATIONS", "TOTAL_EXPENDITURES", "BURN_RATE"],
        rows: [
          { cells: [{ value: "HHS" }, { value: "2", className: "num" }, { value: "$525.2M", className: "num" }, { value: "$468.4M", className: "num" }, { value: "54.1%", className: "num" }] },
          { cells: [{ value: "DOT" }, { value: "1", className: "num" }, { value: "$252.8M", className: "num" }, { value: "$225.1M", className: "num" }, { value: "55.8%", className: "num" }] },
          { cells: [{ value: "EOTSS" }, { value: "3", className: "num" }, { value: "$180.6M", className: "num" }, { value: "$159.3M", className: "num" }, { value: "58.2%", className: "num" }] },
          { cells: [{ value: "EOE" }, { value: "1", className: "num" }, { value: "$158.4M", className: "num" }, { value: "$141.2M", className: "num" }, { value: "55.4%", className: "num" }] },
          { cells: [{ value: "EOPSS" }, { value: "1", className: "num" }, { value: "$130.1M", className: "num" }, { value: "$115.9M", className: "num" }, { value: "56.0%", className: "num" }] },
          { cells: [{ value: "EEA" }, { value: "1", className: "num" }, { value: "$49.1M", className: "num" }, { value: "$43.7M", className: "num" }, { value: "55.2%", className: "num" }] },
          { cells: [{ value: "ANF" }, { value: "1", className: "num" }, { value: "$23.1M", className: "num" }, { value: "$20.6M", className: "num" }, { value: "55.9%", className: "num" }] },
        ],
      },
      sql: `SELECT SECRETARIAT_ID,
       COUNT(DISTINCT AGENCY_CODE) AS agency_count,
       SUM(TOTAL_OBLIGATIONS) AS total_obligations,
       SUM(TOTAL_EXPENDITURES) AS total_expenditures,
       ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS burn_rate
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY SECRETARIAT_ID
ORDER BY total_expenditures DESC`,
      source: "V_CIW_SPENDING",
      verified: true,
    },
    { role: "user", content: "Show me monthly spending trend for MASSIT" },
    {
      role: "assistant",
      content: "**MASSIT** monthly spending trend (last 6 months, base budget $12M/mo):",
      chart: {
        type: "line",
        title: "MASSIT Monthly Spending Trend",
        data: [
          { month: "Aug '25", obligations: 11.6, expenditures: 10.4, budget: 12.0 },
          { month: "Sep '25", obligations: 12.1, expenditures: 10.8, budget: 12.0 },
          { month: "Oct '25", obligations: 12.4, expenditures: 11.1, budget: 12.1 },
          { month: "Nov '25", obligations: 11.8, expenditures: 10.6, budget: 11.9 },
          { month: "Dec '25", obligations: 12.7, expenditures: 11.4, budget: 12.1 },
          { month: "Jan '26", obligations: 11.9, expenditures: 10.7, budget: 12.0 },
        ],
        series: [
          { dataKey: "obligations", label: "Obligations ($M)", color: "#29B5E8", formatter: "currency" },
          { dataKey: "expenditures", label: "Expenditures ($M)", color: "#22c55e", formatter: "currency" },
          { dataKey: "budget", label: "Budget Authority ($M)", color: "#94a3b8", type: "line", formatter: "currency" },
        ],
        xAxis: { dataKey: "month" },
        yAxis: { dataKey: "obligations", formatter: "currency" },
        availableTypes: ["line", "area", "bar", "composed"],
      },
      table: {
        headers: ["FISCAL_PERIOD_DATE", "TOTAL_OBLIGATIONS", "TOTAL_EXPENDITURES", "BUDGET_AUTHORITY", "BURN_RATE_PCT"],
        rows: [
          { cells: [{ value: "2025-08-01" }, { value: "$11.6M", className: "num" }, { value: "$10.4M", className: "num" }, { value: "$12.0M", className: "num" }, { value: "86.7%", className: "num" }] },
          { cells: [{ value: "2025-09-01" }, { value: "$12.1M", className: "num" }, { value: "$10.8M", className: "num" }, { value: "$12.0M", className: "num" }, { value: "90.0%", className: "num" }] },
          { cells: [{ value: "2025-10-01" }, { value: "$12.4M", className: "num" }, { value: "$11.1M", className: "num" }, { value: "$12.1M", className: "num" }, { value: "91.7%", className: "num" }] },
          { cells: [{ value: "2025-11-01" }, { value: "$11.8M", className: "num" }, { value: "$10.6M", className: "num" }, { value: "$11.9M", className: "num" }, { value: "89.1%", className: "num" }] },
          { cells: [{ value: "2025-12-01" }, { value: "$12.7M", className: "num" }, { value: "$11.4M", className: "num" }, { value: "$12.1M", className: "num" }, { value: "94.2%", className: "num" }] },
          { cells: [{ value: "2026-01-01" }, { value: "$11.9M", className: "num" }, { value: "$10.7M", className: "num" }, { value: "$12.0M", className: "num" }, { value: "89.2%", className: "num" }] },
        ],
      },
      insight: "MASSIT spending is stable around the $12M/mo base budget. October and December show seasonal peaks from cloud consumption. All months within expected ±8% seasonal variance.",
      source: "V_CIW_SPENDING",
      verified: true,
    },
  ],
  chips: ["Top 10 vendors by contract value", "ULO exposure by agency", "Compare FY2025 vs FY2026 by secretariat"],
};

const anomaliesScenario: ScenarioData = {
  id: "anomalies",
  label: "Anomaly Investigation",
  icon: AlertTriangle,
  badgeCount: 2,
  kpis: [
    { label: "Active Anomalies", value: "2", color: "red", change: "1 critical, 1 warning", changeDirection: "down", sparklineData: [5, 4, 3, 4, 3, 2, 2] },
    { label: "Largest Deviation", value: "+3.4σ", color: "red", change: "ITD — Dec 2025", changeDirection: "neutral" },
    { label: "Detection Model", value: "Cortex ML", color: "sfBlue", valueFontSize: "12px", change: "ANOMALY_DETECTION", changeDirection: "neutral" },
    { label: "Budget Risk Agencies", value: "3", color: "gold", change: "At Risk or Over Budget", changeDirection: "neutral", sparklineData: [1, 2, 2, 3, 2, 3, 3] },
  ],
  suggestions: [
    "Which agencies have spending anomalies?",
    "Which agencies are over budget?",
    "Show anomaly details for ITD December spike",
  ],
  conversations: [
    { role: "user", content: "Which agencies have spending anomalies?" },
    {
      role: "assistant",
      content: "Cortex ML flagged **2 anomalies** in the detection window (Jul 2025 – Jan 2026):",
      chart: {
        type: "bar",
        title: "Anomaly: Actual vs Expected Spend",
        data: [
          { agency: "ITD (Dec '25)", actual: 6.31, expected: 4.68 },
          { agency: "CYBER (Jan '26)", actual: 2.89, expected: 2.31 },
        ],
        series: [
          { dataKey: "actual", label: "Actual Spend ($M)", color: "#dc2626", formatter: "currency" },
          { dataKey: "expected", label: "Expected Spend ($M)", color: "#94a3b8", formatter: "currency" },
        ],
        xAxis: { dataKey: "agency" },
        yAxis: { dataKey: "actual", formatter: "currency" },
        availableTypes: ["bar"],
      },
      table: {
        headers: ["AGENCY_CODE", "AGENCY_NAME", "FISCAL_PERIOD_DATE", "ACTUAL_SPEND", "EXPECTED_SPEND", "ANOMALY_SEVERITY", "SPEND_DEVIATION_PCT"],
        rows: [
          { cells: [{ value: "ITD" }, { value: "Information Technology Division" }, { value: "2025-12-01" }, { value: "$6.31M", className: "num danger" }, { value: "$4.68M", className: "num" }, { value: "Critical", className: "danger" }, { value: "+35.0%", className: "num danger" }] },
          { cells: [{ value: "CYBER" }, { value: "Office of Cybersecurity" }, { value: "2026-01-01" }, { value: "$2.89M", className: "num warn" }, { value: "$2.31M", className: "num" }, { value: "Warning", className: "warn" }, { value: "+25.0%", className: "num warn" }] },
        ],
      },
      sql: `SELECT AGENCY_CODE, AGENCY_NAME, FISCAL_PERIOD_DATE,
       ACTUAL_SPEND, EXPECTED_SPEND, ANOMALY_SEVERITY,
       SPEND_DEVIATION_PCT
FROM EOTSS_STAGING.V_SPEND_ANOMALIES
WHERE IS_ANOMALY = TRUE
ORDER BY DISTANCE DESC`,
      insight: "ITD December spike: General Fund obligations hit 140% of budget authority — driven by unplanned AWS capacity for shared services. CYBER January: incident response procurement at 130% of budget authority.",
      source: "V_SPEND_ANOMALIES (Cortex ML)",
      verified: true,
    },
    { role: "user", content: "Which agencies are over budget?" },
    {
      role: "assistant",
      content: "Budget risk analysis from Cortex FORECAST model — **3 agencies** flagged:",
      chart: {
        type: "composed",
        title: "Projected Year-End vs Budget Authority",
        data: [
          { agency: "ITD", projected: 104.5, budget: 102.0 },
          { agency: "CYBER", projected: 49.2, budget: 50.4 },
          { agency: "DESE", projected: 258.0, budget: 264.0 },
        ],
        series: [
          { dataKey: "projected", label: "Projected Year-End ($M)", color: "#dc2626", type: "bar", formatter: "currency" },
          { dataKey: "budget", label: "Budget Authority ($M)", color: "#29B5E8", type: "line", formatter: "currency" },
        ],
        xAxis: { dataKey: "agency" },
        yAxis: { dataKey: "projected", formatter: "currency" },
        availableTypes: ["composed", "bar"],
      },
      table: {
        headers: ["AGENCY_CODE", "AGENCY_NAME", "BUDGET_RISK_LEVEL", "YTD_SPEND", "FORECASTED_REMAINING", "PROJECTED_YEAR_END", "BUDGET_AUTHORITY", "PROJECTED_BURN_RATE_PCT"],
        rows: [
          { cells: [{ value: "ITD" }, { value: "Information Technology Division" }, { value: "Over Budget", className: "danger" }, { value: "$62.4M", className: "num" }, { value: "$42.1M", className: "num" }, { value: "$104.5M", className: "num danger" }, { value: "$102.0M", className: "num" }, { value: "102.5%", className: "num danger" }] },
          { cells: [{ value: "CYBER" }, { value: "Office of Cybersecurity" }, { value: "At Risk", className: "warn" }, { value: "$21.8M", className: "num" }, { value: "$27.4M", className: "num" }, { value: "$49.2M", className: "num warn" }, { value: "$50.4M", className: "num" }, { value: "97.6%", className: "num warn" }] },
          { cells: [{ value: "DESE" }, { value: "Dept of Elem & Sec Education" }, { value: "At Risk", className: "warn" }, { value: "$100.8M", className: "num" }, { value: "$157.2M", className: "num" }, { value: "$258.0M", className: "num warn" }, { value: "$264.0M", className: "num" }, { value: "97.7%", className: "num warn" }] },
        ],
      },
      insight: "ITD is projected to exceed budget by $2.5M (2.5%) if the December spending pattern continues. CYBER and DESE are within 3% of their ceiling — recommend monthly monitoring.",
      source: "V_BUDGET_RISK (Cortex FORECAST)",
      verified: true,
    },
  ],
  chips: ["Root cause for ITD spike", "Budget impact if trend continues", "Compare anomalies to prior FY"],
};

const forecastScenario: ScenarioData = {
  id: "forecast",
  label: "Budget Forecasting",
  icon: Activity,
  kpis: [
    { label: "Forecast Horizon", value: "6 mo", color: "blue", change: "Jan–Jun 2026", changeDirection: "neutral" },
    { label: "Avg Monthly Forecast", value: "$182.7M", color: "green", change: "All agencies", changeDirection: "up", sparklineData: [168, 172, 175, 178, 180, 182, 182.7] },
    { label: "Agencies At Risk", value: "3", color: "gold", change: "Burn rate > 90%", changeDirection: "neutral", sparklineData: [1, 2, 2, 3, 2, 3, 3] },
    { label: "Model Confidence", value: "95%", color: "sfBlue", change: "Cortex FORECAST", changeDirection: "neutral" },
  ],
  suggestions: [
    "What is the projected year-end spend by agency?",
    "Show agencies with burn rate above 90%",
    "Model a 10% across-the-board cut",
  ],
  conversations: [
    { role: "user", content: "What is the projected year-end spend by agency?" },
    {
      role: "assistant",
      content: "Cortex FORECAST 6-month projections (Jan–Jun 2026) combined with YTD actuals for all 10 agencies:",
      chart: {
        type: "composed",
        title: "Year-End Projection: YTD + Forecast vs Budget",
        data: [
          { agency: "DPH", ytd: 290.4, forecast: 242.8, budget: 540.0 },
          { agency: "MASSDOT", ytd: 225.1, forecast: 188.4, budget: 420.0 },
          { agency: "DCFS", ytd: 178.2, forecast: 153.6, budget: 336.0 },
          { agency: "DESE", ytd: 100.8, forecast: 157.2, budget: 264.0 },
          { agency: "MSP", ytd: 115.9, forecast: 96.8, budget: 216.0 },
          { agency: "ITD", ytd: 62.4, forecast: 42.1, budget: 102.0 },
          { agency: "MASSIT", ytd: 75.2, forecast: 66.4, budget: 144.0 },
          { agency: "DEP", ytd: 43.7, forecast: 36.8, budget: 81.6 },
          { agency: "CYBER", ytd: 21.8, forecast: 27.4, budget: 50.4 },
          { agency: "OSD", ytd: 20.6, forecast: 17.3, budget: 38.4 },
        ],
        series: [
          { dataKey: "ytd", label: "YTD Spend ($M)", color: "#29B5E8", type: "bar", formatter: "currency", stackId: "spend" },
          { dataKey: "forecast", label: "Forecasted Remaining ($M)", color: "#22c55e", type: "bar", formatter: "currency", stackId: "spend" },
          { dataKey: "budget", label: "Budget Authority ($M)", color: "#dc2626", type: "line", formatter: "currency" },
        ],
        xAxis: { dataKey: "agency" },
        yAxis: { dataKey: "budget", formatter: "currency" },
        availableTypes: ["composed", "bar"],
      },
      table: {
        headers: ["AGENCY_CODE", "AGENCY_NAME", "BUDGET_RISK_LEVEL", "YTD_SPEND", "FORECASTED_REMAINING", "PROJECTED_YEAR_END", "BUDGET_AUTHORITY", "PROJECTED_BURN_RATE_PCT"],
        rows: [
          { cells: [{ value: "DPH" }, { value: "Department of Public Health" }, { value: "On Track" }, { value: "$290.4M", className: "num" }, { value: "$242.8M", className: "num" }, { value: "$533.2M", className: "num" }, { value: "$540.0M", className: "num" }, { value: "98.7%", className: "num" }] },
          { cells: [{ value: "MASSDOT" }, { value: "MassDOT" }, { value: "On Track" }, { value: "$225.1M", className: "num" }, { value: "$188.4M", className: "num" }, { value: "$413.5M", className: "num" }, { value: "$420.0M", className: "num" }, { value: "98.5%", className: "num" }] },
          { cells: [{ value: "DCFS" }, { value: "Dept of Children & Families" }, { value: "On Track" }, { value: "$178.2M", className: "num" }, { value: "$153.6M", className: "num" }, { value: "$331.8M", className: "num" }, { value: "$336.0M", className: "num" }, { value: "98.8%", className: "num" }] },
          { cells: [{ value: "DESE" }, { value: "Dept of Elem & Sec Education" }, { value: "At Risk", className: "warn" }, { value: "$100.8M", className: "num" }, { value: "$157.2M", className: "num" }, { value: "$258.0M", className: "num warn" }, { value: "$264.0M", className: "num" }, { value: "97.7%", className: "num warn" }] },
          { cells: [{ value: "MSP" }, { value: "Mass State Police" }, { value: "On Track" }, { value: "$115.9M", className: "num" }, { value: "$96.8M", className: "num" }, { value: "$212.7M", className: "num" }, { value: "$216.0M", className: "num" }, { value: "98.5%", className: "num" }] },
          { cells: [{ value: "ITD" }, { value: "Information Technology Division" }, { value: "Over Budget", className: "danger" }, { value: "$62.4M", className: "num" }, { value: "$42.1M", className: "num" }, { value: "$104.5M", className: "num danger" }, { value: "$102.0M", className: "num" }, { value: "102.5%", className: "num danger" }] },
          { cells: [{ value: "MASSIT" }, { value: "MassIT" }, { value: "On Track" }, { value: "$75.2M", className: "num" }, { value: "$66.4M", className: "num" }, { value: "$141.6M", className: "num" }, { value: "$144.0M", className: "num" }, { value: "98.3%", className: "num" }] },
          { cells: [{ value: "DEP" }, { value: "Dept of Environmental Protection" }, { value: "On Track" }, { value: "$43.7M", className: "num" }, { value: "$36.8M", className: "num" }, { value: "$80.5M", className: "num" }, { value: "$81.6M", className: "num" }, { value: "98.7%", className: "num" }] },
          { cells: [{ value: "CYBER" }, { value: "Office of Cybersecurity" }, { value: "At Risk", className: "warn" }, { value: "$21.8M", className: "num" }, { value: "$27.4M", className: "num" }, { value: "$49.2M", className: "num warn" }, { value: "$50.4M", className: "num" }, { value: "97.6%", className: "num warn" }] },
          { cells: [{ value: "OSD" }, { value: "Operational Services Division" }, { value: "On Track" }, { value: "$20.6M", className: "num" }, { value: "$17.3M", className: "num" }, { value: "$37.9M", className: "num" }, { value: "$38.4M", className: "num" }, { value: "98.7%", className: "num" }] },
        ],
      },
      sql: `SELECT AGENCY_CODE, AGENCY_NAME, BUDGET_RISK_LEVEL,
       YTD_SPEND, FORECASTED_REMAINING, PROJECTED_YEAR_END,
       BUDGET_AUTHORITY, PROJECTED_BURN_RATE_PCT
FROM EOTSS_STAGING.V_BUDGET_RISK
ORDER BY PROJECTED_BURN_RATE_PCT DESC`,
      insight: "ITD is the only agency projected to exceed budget authority. CYBER and DESE are within 3% of their ceiling — monitor monthly. All other agencies on track.",
      source: "V_BUDGET_RISK (Cortex FORECAST)",
      verified: true,
    },
    { role: "user", content: "Show agencies with burn rate above 90%" },
    {
      role: "assistant",
      content: "Agencies with individual monthly rows where **BURN_RATE_PCT > 90%** in FY2026:",
      table: {
        headers: ["AGENCY_CODE", "AGENCY_NAME", "FUND_NAME", "FISCAL_PERIOD_DATE", "BURN_RATE_PCT", "TOTAL_EXPENDITURES", "BUDGET_AUTHORITY"],
        rows: [
          { cells: [{ value: "ITD" }, { value: "Information Technology Division" }, { value: "General Fund" }, { value: "2025-12-01" }, { value: "135.0%", className: "num danger" }, { value: "$6.31M", className: "num" }, { value: "$4.68M", className: "num" }] },
          { cells: [{ value: "CYBER" }, { value: "Office of Cybersecurity" }, { value: "General Fund" }, { value: "2026-01-01" }, { value: "125.0%", className: "num danger" }, { value: "$2.89M", className: "num" }, { value: "$2.31M", className: "num" }] },
          { cells: [{ value: "MASSIT" }, { value: "MassIT" }, { value: "General Fund" }, { value: "2025-12-01" }, { value: "94.2%", className: "num warn" }, { value: "$6.22M", className: "num" }, { value: "$6.60M", className: "num" }] },
          { cells: [{ value: "MASSIT" }, { value: "MassIT" }, { value: "General Fund" }, { value: "2025-10-01" }, { value: "91.7%", className: "num warn" }, { value: "$6.05M", className: "num" }, { value: "$6.60M", className: "num" }] },
          { cells: [{ value: "DPH" }, { value: "Department of Public Health" }, { value: "General Fund" }, { value: "2025-10-01" }, { value: "92.4%", className: "num warn" }, { value: "$22.8M", className: "num" }, { value: "$24.7M", className: "num" }] },
        ],
      },
      sql: `SELECT AGENCY_CODE, AGENCY_NAME, FUND_NAME,
       FISCAL_PERIOD_DATE, BURN_RATE_PCT,
       TOTAL_EXPENDITURES, BUDGET_AUTHORITY
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE BURN_RATE_PCT > 90
ORDER BY BURN_RATE_PCT DESC
LIMIT 20`,
      insight: "ITD (Dec 2025) and CYBER (Jan 2026) are the flagged anomalies — burn rates above 100% confirm the spike. MASSIT and DPH occasional months above 90% are within normal seasonal variance.",
      source: "V_CIW_SPENDING",
      verified: true,
    },
  ],
  chips: ["Model filling 50 CTHR vacancies", "What-if: 10% cloud cost reduction", "ULO projection by year-end"],
};

const crossScenario: ScenarioData = {
  id: "cross",
  label: "Cross-Source Intelligence",
  icon: Globe,
  kpis: [
    { label: "Data Sources", value: "4", color: "green", change: "CIW + CIP + Commbuys + CTHR", changeDirection: "neutral" },
    { label: "Semantic Tables", value: "7", color: "blue", change: "PRISM Semantic Model", changeDirection: "neutral" },
    { label: "Cross-Source Joins", value: "Enabled", color: "sfBlue", valueFontSize: "12px", change: "Natural language", changeDirection: "neutral" },
    { label: "Governance", value: "DULA", color: "green", change: "AGR-EOTSS-POC-001", changeDirection: "neutral" },
  ],
  suggestions: [
    "What is the total cost per agency including salaries?",
    "Show me cybersecurity spending across all sources",
    "Which CIP projects are at risk due to staffing?",
  ],
  conversations: [
    { role: "user", content: "What is the total cost per agency including salaries?" },
    {
      role: "assistant",
      content: "Cross-source analysis joining **CIW spending** + **CTHR workforce** data for all 10 agencies:",
      chart: {
        type: "bar",
        title: "Total Cost: Operations + Salaries by Agency",
        data: [
          { agency: "MSP", operations: 115.9, salaries: 258.6 },
          { agency: "DPH", operations: 290.4, salaries: 62.4 },
          { agency: "MASSDOT", operations: 225.1, salaries: 58.5 },
          { agency: "DCFS", operations: 178.2, salaries: 73.2 },
          { agency: "DESE", operations: 100.8, salaries: 40.1 },
          { agency: "MASSIT", operations: 75.2, salaries: 32.6 },
          { agency: "ITD", operations: 62.4, salaries: 25.9 },
          { agency: "DEP", operations: 43.7, salaries: 32.0 },
          { agency: "CYBER", operations: 21.8, salaries: 16.2 },
          { agency: "OSD", operations: 20.6, salaries: 11.3 },
        ],
        series: [
          { dataKey: "operations", label: "Operational ($M)", color: "#29B5E8", formatter: "currency", stackId: "cost" },
          { dataKey: "salaries", label: "Salaries ($M)", color: "#22c55e", formatter: "currency", stackId: "cost" },
        ],
        xAxis: { dataKey: "agency" },
        yAxis: { dataKey: "operations", formatter: "currency" },
        availableTypes: ["bar", "pie", "composed"],
      },
      table: {
        headers: ["AGENCY_CODE", "AGENCY_NAME", "OPERATIONAL_SPENDING", "SALARY_OBLIGATIONS", "TOTAL_COST", "TOTAL_POSITIONS", "FILLED_POSITIONS", "AVG_VACANCY_RATE"],
        rows: [
          { cells: [{ value: "DPH" }, { value: "Dept of Public Health" }, { value: "$290.4M", className: "num" }, { value: "$62.4M", className: "num" }, { value: "$352.8M", className: "num" }, { value: "665", className: "num" }, { value: "609", className: "num" }, { value: "10.9%", className: "num" }] },
          { cells: [{ value: "MASSDOT" }, { value: "MassDOT" }, { value: "$225.1M", className: "num" }, { value: "$58.5M", className: "num" }, { value: "$283.6M", className: "num" }, { value: "540", className: "num" }, { value: "485", className: "num" }, { value: "11.0%", className: "num" }] },
          { cells: [{ value: "MSP" }, { value: "Mass State Police" }, { value: "$115.9M", className: "num" }, { value: "$258.6M", className: "num" }, { value: "$374.5M", className: "num" }, { value: "2,365", className: "num" }, { value: "2,203", className: "num" }, { value: "8.9%", className: "num" }] },
          { cells: [{ value: "DCFS" }, { value: "Dept of Children & Families" }, { value: "$178.2M", className: "num" }, { value: "$73.2M", className: "num" }, { value: "$251.4M", className: "num" }, { value: "970", className: "num" }, { value: "832", className: "num" }, { value: "11.0%", className: "num" }] },
          { cells: [{ value: "DESE" }, { value: "Dept of Elem & Sec Education" }, { value: "$100.8M", className: "num" }, { value: "$40.1M", className: "num" }, { value: "$140.9M", className: "num" }, { value: "390", className: "num" }, { value: "354", className: "num" }, { value: "11.8%", className: "num" }] },
          { cells: [{ value: "MASSIT" }, { value: "MassIT" }, { value: "$75.2M", className: "num" }, { value: "$32.6M", className: "num" }, { value: "$107.8M", className: "num" }, { value: "310", className: "num" }, { value: "270", className: "num" }, { value: "10.8%", className: "num" }] },
          { cells: [{ value: "ITD" }, { value: "Info Technology Division" }, { value: "$62.4M", className: "num" }, { value: "$25.9M", className: "num" }, { value: "$88.3M", className: "num" }, { value: "255", className: "num" }, { value: "226", className: "num" }, { value: "9.7%", className: "num" }] },
          { cells: [{ value: "DEP" }, { value: "Dept of Env Protection" }, { value: "$43.7M", className: "num" }, { value: "$32.0M", className: "num" }, { value: "$75.7M", className: "num" }, { value: "345", className: "num" }, { value: "310", className: "num" }, { value: "8.0%", className: "num" }] },
          { cells: [{ value: "CYBER" }, { value: "Office of Cybersecurity" }, { value: "$21.8M", className: "num" }, { value: "$16.2M", className: "num" }, { value: "$38.0M", className: "num" }, { value: "135", className: "num" }, { value: "104", className: "num warn" }, { value: "22.1%", className: "num warn" }] },
          { cells: [{ value: "OSD" }, { value: "Operational Services Div" }, { value: "$20.6M", className: "num" }, { value: "$11.3M", className: "num" }, { value: "$31.9M", className: "num" }, { value: "125", className: "num" }, { value: "110", className: "num" }, { value: "10.2%", className: "num" }] },
        ],
      },
      sql: `SELECT s.AGENCY_CODE, s.AGENCY_NAME,
       SUM(s.TOTAL_EXPENDITURES) AS operational_spending,
       w.total_salary,
       SUM(s.TOTAL_EXPENDITURES) + COALESCE(w.total_salary, 0) AS total_cost,
       w.total_positions, w.total_filled, w.avg_vacancy_rate
FROM EOTSS_STAGING.V_CIW_SPENDING s
LEFT JOIN (
    SELECT AGENCY_CODE,
           SUM(SALARY_OBLIGATIONS) AS total_salary,
           SUM(POSITION_COUNT) AS total_positions,
           SUM(FILLED_POSITIONS) AS total_filled,
           AVG(VACANCY_RATE) AS avg_vacancy_rate
    FROM EOTSS_STAGING.V_CTHR_WORKFORCE
    GROUP BY AGENCY_CODE
) w ON s.AGENCY_CODE = w.AGENCY_CODE
WHERE s.FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, w.total_salary,
         w.total_positions, w.total_filled, w.avg_vacancy_rate
ORDER BY total_cost DESC`,
      insight: "CYBER has the highest vacancy rate at 22.1% — driven by competitive private-sector demand for security talent. MSP salary obligations ($258.6M) dominate due to 2,200+ sworn officers.",
      source: "V_CIW_SPENDING + V_CTHR_WORKFORCE",
      verified: true,
    },
    { role: "user", content: "Show me cybersecurity spending across all sources" },
    {
      role: "assistant",
      content: "**CYBER (Office of Cybersecurity)** — cross-source intelligence from all 4 PRISM data sources:",
      chart: {
        type: "pie",
        title: "CYBER Spending by Source",
        data: [
          { source: "CIW (Operations)", amount: 21.8 },
          { source: "CTHR (Salaries)", amount: 16.2 },
          { source: "Commbuys (Procurement)", amount: 24.5 },
          { source: "CIP (Capital)", amount: 30.2 },
        ],
        series: [
          { dataKey: "amount", label: "Amount ($M)", color: "#29B5E8", formatter: "currency" },
        ],
        xAxis: { dataKey: "source" },
        availableTypes: ["pie", "bar"],
      },
      table: {
        headers: ["Source", "Metric", "Value"],
        rows: [
          { cells: [{ value: "CIW" }, { value: "Operational Spending (FY2026 YTD)" }, { value: "$21.8M", className: "num" }] },
          { cells: [{ value: "CTHR" }, { value: "Salary Obligations (135 positions)" }, { value: "$16.2M", className: "num" }] },
          { cells: [{ value: "Commbuys" }, { value: "Procurement Awards (6 contracts)" }, { value: "$24.5M", className: "num" }] },
          { cells: [{ value: "CIP" }, { value: "Active Projects (2)" }, { value: "$30.2M planned", className: "num" }] },
          { cells: [{ value: "CTHR" }, { value: "Vacancy Rate" }, { value: "22.1%", className: "num warn" }] },
        ],
      },
      sql: `SELECT 'Cybersecurity' AS domain,
    (SELECT SUM(TOTAL_EXPENDITURES) FROM EOTSS_STAGING.V_CIW_SPENDING
     WHERE AGENCY_CODE = 'CYBER' AND FISCAL_YEAR_LABEL = 'FY2026') AS operational_spending,
    (SELECT SUM(SALARY_OBLIGATIONS) FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS salary_costs,
    (SELECT SUM(AWARD_AMOUNT) FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
     WHERE AGENCY_CODE = 'CYBER') AS procurement_awards,
    (SELECT AVG(VACANCY_RATE) FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS avg_vacancy_rate,
    (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIP_INVESTMENTS
     WHERE AGENCY_CODE = 'CYBER') AS active_projects`,
      insight: "Total cybersecurity footprint: $92.7M across all sources. The 22.1% vacancy rate is the highest across all agencies — security talent gap is the top risk. 2 CIP projects ($30.2M) include the Zero Trust Architecture initiative.",
      source: "CIW + Commbuys + CTHR + CIP",
      verified: true,
    },
  ],
  chips: ["Vendor concentration risk", "CIP projects at risk from staffing", "Expiring contracts > $500K"],
};

// ── Export ──────────────────────────────────────────────────────────────

export const scenarios: ScenarioData[] = [
  spendingScenario,
  anomaliesScenario,
  forecastScenario,
  crossScenario,
];

export const scenarioMap: Record<ScenarioId, ScenarioData> = {
  spending: spendingScenario,
  anomalies: anomaliesScenario,
  forecast: forecastScenario,
  cross: crossScenario,
};
