import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPICard } from "@/data/intelligenceData";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function KPISparkline({ kpis }: { kpis: KPICard[] }) {
  if (!kpis.length) return null;

  return (
    <div className="flex gap-2 my-2 flex-wrap">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="flex-1 min-w-[120px] max-w-[200px] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div
                className="text-[15px] font-bold leading-none"
                style={{ color: kpi.color || "#1e293b" }}
              >
                {kpi.value}
              </div>
              <div className="text-[10px] text-[#64748b] font-medium mt-1 truncate">
                {kpi.label}
              </div>
            </div>
            {kpi.sparklineData && (
              <Sparkline data={kpi.sparklineData} color={kpi.color || "#29B5E8"} />
            )}
          </div>
          {kpi.change && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {kpi.changeDirection === "up" && <TrendingUp className="w-2.5 h-2.5 text-[#22c55e]" />}
              {kpi.changeDirection === "down" && <TrendingDown className="w-2.5 h-2.5 text-[#dc2626]" />}
              {kpi.changeDirection === "neutral" && <Minus className="w-2.5 h-2.5 text-[#94a3b8]" />}
              <span className="text-[9px] text-[#94a3b8] truncate">{kpi.change}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
