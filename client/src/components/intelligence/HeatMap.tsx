import { useMemo, useState } from "react";
import type { HeatMapConfig } from "@/data/intelligenceData";
import { formatValue } from "./chartUtils";

interface HeatMapProps {
  data: Record<string, unknown>[];
  config: HeatMapConfig;
  title?: string;
}

function getColor(value: number, min: number, max: number, scale: HeatMapConfig["colorScale"]): string {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);

  if (scale === "severity") {
    if (ratio > 0.75) return "rgba(220,38,38,0.7)";
    if (ratio > 0.5) return "rgba(180,83,9,0.6)";
    if (ratio > 0.25) return "rgba(234,179,8,0.4)";
    return "rgba(34,197,94,0.3)";
  }

  if (scale === "diverging") {
    if (ratio > 0.75) return "rgba(220,38,38,0.65)";
    if (ratio > 0.5) return "rgba(234,179,8,0.45)";
    if (ratio > 0.25) return "rgba(234,179,8,0.25)";
    return "rgba(34,197,94,0.35)";
  }

  // sequential
  const alpha = 0.15 + ratio * 0.6;
  return `rgba(41,181,232,${alpha.toFixed(2)})`;
}

export default function HeatMap({ data, config, title }: HeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string; value: number } | null>(null);

  const { rows, cols, matrix, min, max } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const valueMap = new Map<string, number>();

    let min = Infinity;
    let max = -Infinity;

    for (const d of data) {
      const r = String(d[config.rowKey] ?? "");
      const c = String(d[config.colKey] ?? "");
      const v = Number(d[config.valueKey] ?? 0);
      rowSet.add(r);
      colSet.add(c);
      valueMap.set(`${r}|${c}`, v);
      if (v < min) min = v;
      if (v > max) max = v;
    }

    return {
      rows: Array.from(rowSet),
      cols: Array.from(colSet),
      matrix: valueMap,
      min,
      max,
    };
  }, [data, config]);

  if (!rows.length || !cols.length) return null;

  return (
    <div className="my-2">
      {title && <div className="text-[12px] font-semibold text-[#1e293b] mb-2">{title}</div>}

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-[2px]"
          style={{
            gridTemplateColumns: `auto repeat(${cols.length}, minmax(60px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div />
          {cols.map((c) => (
            <div
              key={c}
              className="text-[10px] font-semibold text-[#64748b] text-center px-1 py-1 truncate"
              title={c}
            >
              {c}
            </div>
          ))}

          {/* Data rows */}
          {rows.map((r) => (
            <>
              <div
                key={`label-${r}`}
                className="text-[10px] font-medium text-[#475569] pr-2 py-1 truncate flex items-center"
                title={r}
              >
                {r}
              </div>
              {cols.map((c) => {
                const value = matrix.get(`${r}|${c}`) ?? 0;
                const isHovered = hoveredCell?.row === r && hoveredCell?.col === c;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="rounded-[3px] flex items-center justify-center text-[10px] font-semibold py-1.5 px-1 cursor-default transition-all"
                    style={{
                      backgroundColor: getColor(value, min, max, config.colorScale),
                      color: "#1e293b",
                      outline: isHovered ? "2px solid #29B5E8" : "none",
                      outlineOffset: -1,
                    }}
                    onMouseEnter={() => setHoveredCell({ row: r, col: c, value })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${r} × ${c}: ${formatValue(value, "compact")}`}
                  >
                    {formatValue(value, "compact")}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Tooltip overlay */}
      {hoveredCell && (
        <div className="text-[11px] text-[#64748b] mt-1">
          <span className="font-medium text-[#1e293b]">{hoveredCell.row}</span>
          {" × "}
          <span className="font-medium text-[#1e293b]">{hoveredCell.col}</span>
          {": "}
          <span className="font-semibold text-[#0369a1]">{formatValue(hoveredCell.value, "compact")}</span>
        </div>
      )}
    </div>
  );
}
