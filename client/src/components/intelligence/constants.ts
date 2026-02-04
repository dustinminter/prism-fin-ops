// Intelligence Design System — shared constants across all Intelligence components

export const COLORS = {
  blue: "#58a6ff",
  green: "#3fb950",
  gold: "#d29922",
  red: "#f85149",
  purple: "#a371f7",
  sfBlue: "#29B5E8",
  default: "#8b949e",
  muted: "#5c6370",
  text: "#d0d7de",
  surface: "#151b23",
  bg: "#0d1117",
  border: "#2a3040",
  surfaceHeader: "#1c2333",
} as const;

export const SEVERITY_STYLES = {
  critical: { bg: "rgba(248,81,73,0.12)", text: "#f85149" },
  warning: { bg: "rgba(210,153,34,0.12)", text: "#d29922" },
  watch: { bg: "rgba(63,185,80,0.12)", text: "#3fb950" },
} as const;

export const CHANGE_COLORS = {
  up: "#3fb950",
  down: "#f85149",
  neutral: "#5c6370",
} as const;

export const CHART_TOOLTIP_STYLE = {
  background: "#151b23",
  border: "1px solid #2a3040",
  borderRadius: 6,
  fontSize: 12,
  color: "#d0d7de",
} as const;

export const CHART_AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
} as const;

export const CHART_TICK_STYLE = { fill: "#5c6370", fontSize: 11 } as const;
