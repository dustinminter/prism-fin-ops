import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import type { ExecutiveNarrative as ExecutiveNarrativeType } from "@/data/intelligenceData";

const STATUS_STYLES = {
  good: { icon: CheckCircle2, color: "#3fb950", bg: "rgba(63,185,80,0.1)", border: "rgba(63,185,80,0.2)" },
  warn: { icon: AlertCircle, color: "#d29922", bg: "rgba(210,153,34,0.1)", border: "rgba(210,153,34,0.2)" },
  critical: { icon: AlertTriangle, color: "#f85149", bg: "rgba(248,81,73,0.1)", border: "rgba(248,81,73,0.2)" },
};

interface Props {
  narrative: ExecutiveNarrativeType;
}

export default function ExecutiveNarrative({ narrative }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-4 bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[#1c2333] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[#29B5E8]/10 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-[#29B5E8]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#e6edf3]">{narrative.title}</div>
          <div className="text-[11px] text-[#484f58]">{narrative.period}</div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#484f58] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#484f58] shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Summary */}
          <p className="text-[13px] text-[#8b949e] leading-[1.5]">{narrative.summary}</p>

          {/* KPI highlights */}
          <div className="grid grid-cols-4 gap-2">
            {narrative.highlights.map((h, i) => {
              const style = STATUS_STYLES[h.status];
              return (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2 text-center"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}
                >
                  <div className="text-[18px] font-bold" style={{ color: style.color }}>
                    {h.value}
                  </div>
                  <div className="text-[10px] font-medium text-[#8b949e] mt-0.5 uppercase tracking-wider">
                    {h.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risks */}
          {narrative.risks.length > 0 && (
            <div className="bg-[#0d1117] rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#484f58]">
                Key Risks & Actions
              </div>
              {narrative.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-[#8b949e] leading-[1.4]">
                  <AlertTriangle className="w-3 h-3 text-[#d29922] shrink-0 mt-0.5" />
                  {risk}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
