import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronRight, BarChart3, TrendingUp, PieChart as PieIcon, Layers } from "lucide-react";
import type { ChartData, ChartType } from "@/data/intelligenceData";
import { formatValue, tickFormatter } from "./chartUtils";

const TYPE_ICONS: Record<ChartType, typeof BarChart3> = {
  bar: BarChart3,
  line: TrendingUp,
  area: TrendingUp,
  pie: PieIcon,
  composed: Layers,
  heatmap: Layers,
};

const TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  composed: "Mixed",
  heatmap: "Heat Map",
};

const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 12,
  color: "#1e293b",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

function CustomTooltip({
  active,
  payload,
  label,
  chart,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  chart: ChartData;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      {label && <div className="text-[11px] text-[#64748b] font-medium mb-1">{label}</div>}
      {payload.map((p) => {
        const series = chart.series.find((s) => s.dataKey === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-[12px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[#64748b]">{series?.label || p.name}:</span>
            <span className="font-semibold text-[#1e293b]">
              {formatValue(p.value, series?.formatter)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DataTable({ chart }: { chart: ChartData }) {
  const [open, setOpen] = useState(false);
  if (!chart.data.length) return null;

  const keys = Object.keys(chart.data[0]);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-[#475569] hover:text-[#29B5E8] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? "Hide" : "Show"} data table ({chart.data.length} rows)
      </button>
      {open && (
        <div className="overflow-x-auto mt-1 max-h-[200px] overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th
                    key={k}
                    className="text-left px-2 py-1 bg-[#f8fafc] text-[#94a3b8] font-semibold text-[10px] uppercase tracking-wider border-b border-[#e2e8f0] sticky top-0"
                  >
                    {k.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.map((row, ri) => (
                <tr key={ri}>
                  {keys.map((k) => (
                    <td key={k} className="px-2 py-1 border-b border-[#f1f5f9] text-[#475569]">
                      {String(row[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function renderBarChart(chart: ChartData) {
  return (
    <BarChart data={chart.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis
        dataKey={chart.xAxis?.dataKey}
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={tickFormatter(chart.yAxis?.formatter)}
      />
      <Tooltip content={<CustomTooltip chart={chart} />} />
      <Legend
        wrapperStyle={{ fontSize: 11 }}
        iconSize={8}
        formatter={(value) => {
          const s = chart.series.find((s) => s.dataKey === value);
          return s?.label || value;
        }}
      />
      {chart.series.map((s) => (
        <Bar
          key={s.dataKey}
          dataKey={s.dataKey}
          fill={s.color}
          radius={[3, 3, 0, 0]}
          stackId={s.stackId}
          isAnimationActive={false}
        />
      ))}
    </BarChart>
  );
}

function renderLineChart(chart: ChartData) {
  return (
    <LineChart data={chart.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis
        dataKey={chart.xAxis?.dataKey}
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={tickFormatter(chart.yAxis?.formatter)}
      />
      <Tooltip content={<CustomTooltip chart={chart} />} />
      <Legend
        wrapperStyle={{ fontSize: 11 }}
        iconSize={8}
        formatter={(value) => {
          const s = chart.series.find((s) => s.dataKey === value);
          return s?.label || value;
        }}
      />
      {chart.series.map((s) => (
        <Line
          key={s.dataKey}
          type="monotone"
          dataKey={s.dataKey}
          stroke={s.color}
          strokeWidth={2}
          dot={{ r: 3, fill: s.color }}
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  );
}

function renderAreaChart(chart: ChartData) {
  return (
    <AreaChart data={chart.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis
        dataKey={chart.xAxis?.dataKey}
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={tickFormatter(chart.yAxis?.formatter)}
      />
      <Tooltip content={<CustomTooltip chart={chart} />} />
      <Legend
        wrapperStyle={{ fontSize: 11 }}
        iconSize={8}
        formatter={(value) => {
          const s = chart.series.find((s) => s.dataKey === value);
          return s?.label || value;
        }}
      />
      {chart.series.map((s) => (
        <Area
          key={s.dataKey}
          type="monotone"
          dataKey={s.dataKey}
          stroke={s.color}
          fill={s.color}
          fillOpacity={0.15}
          strokeWidth={2}
          isAnimationActive={false}
        />
      ))}
    </AreaChart>
  );
}

function renderPieChart(chart: ChartData) {
  const dataKey = chart.series[0]?.dataKey;
  const nameKey = chart.xAxis?.dataKey || "name";
  if (!dataKey) return null;

  return (
    <PieChart>
      <Pie
        data={chart.data}
        dataKey={dataKey}
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        outerRadius={80}
        innerRadius={40}
        paddingAngle={2}
        isAnimationActive={false}
        label={({ name, percent }: { name: string; percent: number }) =>
          `${name} ${(percent * 100).toFixed(0)}%`
        }
        labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
      >
        {chart.data.map((_, i) => (
          <Cell
            key={i}
            fill={chart.series[0]?.color ? undefined : undefined}
            style={{ fill: ["#29B5E8", "#22c55e", "#b45309", "#dc2626", "#7c3aed", "#3b82f6", "#f59e0b", "#10b981"][i % 8] }}
          />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip chart={chart} />} />
    </PieChart>
  );
}

function renderComposedChart(chart: ChartData) {
  return (
    <ComposedChart data={chart.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis
        dataKey={chart.xAxis?.dataKey}
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: "#64748b", fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={tickFormatter(chart.yAxis?.formatter)}
      />
      <Tooltip content={<CustomTooltip chart={chart} />} />
      <Legend
        wrapperStyle={{ fontSize: 11 }}
        iconSize={8}
        formatter={(value) => {
          const s = chart.series.find((s) => s.dataKey === value);
          return s?.label || value;
        }}
      />
      {chart.series.map((s) => {
        if (s.type === "line") {
          return (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color }}
              isAnimationActive={false}
            />
          );
        }
        if (s.type === "area") {
          return (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.15}
              isAnimationActive={false}
            />
          );
        }
        return (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            fill={s.color}
            radius={[3, 3, 0, 0]}
            stackId={s.stackId}
            isAnimationActive={false}
          />
        );
      })}
    </ComposedChart>
  );
}

export default function ChatChart({ chart: initialChart }: { chart: ChartData }) {
  const [activeType, setActiveType] = useState(initialChart.type);
  const chart = { ...initialChart, type: activeType };
  const available = chart.availableTypes || [chart.type];

  return (
    <div className="my-2">
      {/* Chart type tabs */}
      {available.length > 1 && (
        <div className="flex items-center gap-1 mb-2">
          {available
            .filter((t) => t !== "heatmap")
            .map((t) => {
              const Icon = TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    activeType === t
                      ? "bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]"
                      : "text-[#94a3b8] hover:text-[#475569] hover:bg-[#f8fafc]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
        </div>
      )}

      {/* Chart title */}
      {chart.title && (
        <div className="text-[12px] font-semibold text-[#1e293b] mb-1">{chart.title}</div>
      )}

      {/* Chart */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {activeType === "bar" ? (
            renderBarChart(chart)
          ) : activeType === "line" ? (
            renderLineChart(chart)
          ) : activeType === "area" ? (
            renderAreaChart(chart)
          ) : activeType === "pie" ? (
            renderPieChart(chart) || <></>
          ) : activeType === "composed" ? (
            renderComposedChart(chart)
          ) : (
            renderBarChart(chart)
          )}
        </ResponsiveContainer>
      </div>

      {/* Collapsible data table */}
      <DataTable chart={chart} />
    </div>
  );
}
