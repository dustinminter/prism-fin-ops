import { useState } from "react";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { ChatMessage } from "@/data/intelligenceData";
import ChatChart from "./ChatChart";
import HeatMap from "./HeatMap";
import KPISparkline from "./KPISparkline";

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-[#e6edf3]">{part.slice(2, -2)}</strong>;
    }
    const lines = part.split("\n");
    return lines.map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ));
  });
}

function DetailsToggle({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-[#8b949e] hover:text-[#29B5E8] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Show Details
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#484f58] mb-1">Generated SQL</div>
          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 font-mono text-[11px] text-[#8b949e] overflow-x-auto whitespace-pre leading-[1.4]">
            {sql}
          </div>
        </div>
      )}
    </div>
  );
}

interface IntelMessagesProps {
  messages: ChatMessage[];
  onSuggestionClick?: (text: string) => void;
}

export default function IntelMessages({ messages, onSuggestionClick }: IntelMessagesProps) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        if (msg.role === "user") {
          return (
            <div
              key={i}
              className="self-end max-w-[80%] bg-[#1f6feb] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px] leading-[1.45]"
            >
              {msg.content}
            </div>
          );
        }

        const hasChart = !!msg.chart;
        const isLastAssistant = i === messages.length - 1 || messages.slice(i + 1).every(m => m.role === "user");

        return (
          <div key={i} className="self-start max-w-[94%]">
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl rounded-bl-sm px-4 py-3 text-[13px] text-[#c9d1d9] leading-[1.5]">
              {/* Text content */}
              <div>{renderMarkdown(msg.content)}</div>

              {/* Inline KPI cards */}
              {msg.kpis && msg.kpis.length > 0 && <KPISparkline kpis={msg.kpis} />}

              {/* Chart (if present) */}
              {msg.chart && (
                msg.chart.type === "heatmap" && msg.chart.heatmap ? (
                  <HeatMap
                    data={msg.chart.data}
                    config={msg.chart.heatmap}
                    title={msg.chart.title}
                  />
                ) : (
                  <ChatChart chart={msg.chart} />
                )
              )}

              {/* Data table: only render msg.table when there's no chart (ChatChart has its own table) */}
              {msg.table && !hasChart && (
                  <table className="w-full border-collapse my-2 text-[12px]">
                    <thead>
                      <tr>
                        {msg.table.headers.map((h, hi) => (
                          <th
                            key={hi}
                            className="text-left px-2 py-1.5 bg-[#0d1117] text-[#484f58] font-semibold text-[10px] uppercase tracking-wider border-b border-[#21262d]"
                            style={hi > 0 ? { textAlign: "right" } : {}}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.cells.map((cell, ci) => {
                            let color = "#c9d1d9";
                            if (cell.className?.includes("danger")) color = "#f85149";
                            else if (cell.className?.includes("warn")) color = "#d29922";
                            const isNum = cell.className?.includes("num");
                            return (
                              <td
                                key={ci}
                                className="px-2 py-1.5 border-b border-[#21262d]"
                                style={{
                                  color,
                                  fontWeight: isNum ? 600 : 400,
                                  textAlign: ci > 0 ? "right" : "left",
                                }}
                              >
                                {cell.value}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}

              {/* Details toggle (SQL + reasoning) */}
              {msg.sql && <DetailsToggle sql={msg.sql} />}

              {/* Insight callout */}
              {msg.insight && (
                <div className="bg-[#0d1117] border-l-2 border-l-[#3fb950] px-3 py-2 my-2 text-[12px] text-[#8b949e] rounded-r-lg leading-[1.4]">
                  {msg.insight}
                </div>
              )}

              {/* Source & verification badges */}
              <div className="flex items-center gap-2 mt-2">
                {msg.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Query
                  </span>
                )}
                {msg.source && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
                    Source: {msg.source}
                  </span>
                )}
              </div>
            </div>

            {/* Follow-up suggestions — only on last assistant message */}
            {isLastAssistant && onSuggestionClick && msg.role === "assistant" && (
              <div className="flex flex-wrap gap-2 mt-2 ml-1">
                {(msg.suggestions || []).map((s, si) => (
                  <button
                    key={si}
                    onClick={() => onSuggestionClick(s)}
                    className="text-[12px] text-[#29B5E8] bg-[#29B5E8]/10 border border-[#29B5E8]/20 rounded-full px-3 py-1 hover:bg-[#29B5E8]/20 hover:border-[#29B5E8]/40 transition-all cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
