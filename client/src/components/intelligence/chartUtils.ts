import type { ChartData, ChartType, ChartSeries, ValueFormat } from "@/data/intelligenceData";

const CHART_COLORS = ["#29B5E8", "#22c55e", "#b45309", "#dc2626", "#7c3aed", "#3b82f6", "#f59e0b", "#10b981"];

/**
 * Format a numeric value based on a format hint
 */
export function formatValue(value: unknown, format?: ValueFormat): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);

  switch (format) {
    case "currency":
      if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
      if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
      if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
      return `$${num.toLocaleString()}`;
    case "percent":
      return `${num.toFixed(1)}%`;
    case "compact":
      if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
      if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
      if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
      return num.toLocaleString();
    default:
      return num.toLocaleString();
  }
}

/**
 * Create a recharts tick formatter from a ValueFormat hint
 */
export function tickFormatter(format?: ValueFormat): (value: unknown) => string {
  return (value: unknown) => formatValue(value, format);
}

/**
 * Detect whether a column looks like a date/time field
 */
function isDateColumn(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("date") ||
    lower.includes("month") ||
    lower.includes("period") ||
    lower.includes("year") ||
    lower.includes("quarter")
  );
}

/**
 * Detect whether a column is numeric based on sample values
 */
function isNumericColumn(rows: Record<string, unknown>[], key: string): boolean {
  for (const row of rows.slice(0, 5)) {
    const v = row[key];
    if (v !== null && v !== undefined && typeof v !== "number") return false;
  }
  return true;
}

/**
 * Auto-detect the best chart type from data shape
 */
function detectChartType(
  rows: Record<string, unknown>[],
  stringCols: string[],
  numericCols: string[],
): ChartType {
  if (rows.length === 0) return "bar";

  // Time-series → line chart
  if (stringCols.some(isDateColumn) && numericCols.length >= 1) {
    return "line";
  }

  // Few categories with one numeric → pie
  if (stringCols.length === 1 && numericCols.length === 1 && rows.length <= 8) {
    return "pie";
  }

  // Cross-tab (two string cols + one numeric) → heatmap
  if (stringCols.length >= 2 && numericCols.length === 1 && rows.length > 8) {
    return "heatmap";
  }

  // Multiple numeric series → composed
  if (numericCols.length >= 3) {
    return "composed";
  }

  return "bar";
}

/**
 * Determine which alternative chart types make sense for a given dataset
 */
function availableChartTypes(
  primary: ChartType,
  stringCols: string[],
  numericCols: string[],
  rows: Record<string, unknown>[],
): ChartType[] {
  const types = new Set<ChartType>([primary]);

  if (numericCols.length >= 1 && stringCols.length >= 1) {
    types.add("bar");
    if (rows.length <= 10) types.add("pie");
  }
  if (stringCols.some(isDateColumn)) {
    types.add("line");
    types.add("area");
  }
  if (numericCols.length >= 2) {
    types.add("composed");
  }

  return Array.from(types);
}

/**
 * Guess the value format from column name
 */
function guessFormat(key: string): ValueFormat | undefined {
  const lower = key.toLowerCase();
  if (
    lower.includes("spend") ||
    lower.includes("budget") ||
    lower.includes("obligation") ||
    lower.includes("expenditure") ||
    lower.includes("cost") ||
    lower.includes("amount") ||
    lower.includes("salary") ||
    lower.includes("authority") ||
    lower.includes("award")
  ) {
    return "currency";
  }
  if (lower.includes("rate") || lower.includes("pct") || lower.includes("percent")) {
    return "percent";
  }
  return undefined;
}

/**
 * Build a ChartData object from raw NL query results.
 * This is the main entry point used by IntelligenceChat when a live query returns data.
 */
export function buildChartDataFromResults(
  rows: Record<string, unknown>[],
  columns: { name: string; type: string }[],
): ChartData | null {
  if (!rows.length || !columns.length) return null;

  const stringCols = columns
    .filter((c) => c.type === "string" || (!isNumericColumn(rows, c.name) && !isDateColumn(c.name)))
    .map((c) => c.name);

  const numericCols = columns
    .filter((c) => c.type === "number" || isNumericColumn(rows, c.name))
    .map((c) => c.name);

  if (numericCols.length === 0) return null;

  const chartType = detectChartType(rows, stringCols, numericCols);
  const xKey = stringCols[0] || columns[0].name;

  const series: ChartSeries[] = numericCols.slice(0, 5).map((key, i) => ({
    dataKey: key,
    label: key.replace(/_/g, " "),
    color: CHART_COLORS[i % CHART_COLORS.length],
    formatter: guessFormat(key),
    type: chartType === "composed"
      ? (i === 0 ? "bar" : "line")
      : undefined,
  }));

  return {
    type: chartType,
    data: rows,
    series,
    xAxis: {
      dataKey: xKey,
      label: xKey.replace(/_/g, " "),
    },
    yAxis: {
      dataKey: numericCols[0],
      formatter: guessFormat(numericCols[0]),
    },
    availableTypes: availableChartTypes(chartType, stringCols, numericCols, rows),
  };
}
