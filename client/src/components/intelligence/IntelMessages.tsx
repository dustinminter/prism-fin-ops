import { useState } from "react";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { ChatMessage } from "@/data/intelligenceData";

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-[#0f172a]">{part.slice(2, -2)}</strong>;
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

function SqlToggle({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-[#475569] hover:text-[#29B5E8] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Show SQL
      </button>
      {open && (
        <div className="bg-[#f1f5f9] border border-[#e2e8f0] rounded-[5px] px-3 py-2 mt-1 font-mono text-[11px] text-[#475569] overflow-x-auto whitespace-pre leading-[1.4]">
          {sql}
        </div>
      )}
    </div>
  );
}

export default function IntelMessages({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => {
        if (msg.role === "user") {
          return (
            <div
              key={i}
              className="self-end max-w-[94%] bg-[#1e293b] text-white rounded-[14px_14px_4px_14px] px-4 py-2.5 text-[13px] leading-[1.45]"
            >
              {msg.content}
            </div>
          );
        }

        return (
          <div
            key={i}
            className="self-start max-w-[94%] bg-white border border-[#e1e4e8] rounded-[14px_14px_14px_4px] px-4 py-3 text-[13px] text-[#1e293b] leading-[1.5] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <div>{renderMarkdown(msg.content)}</div>

            {msg.table && (
              <table className="w-full border-collapse my-2 text-[12px]">
                <thead>
                  <tr>
                    {msg.table.headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="text-left px-2 py-1.5 bg-[#f8fafc] text-[#94a3b8] font-semibold text-[10px] uppercase tracking-wider border-b border-[#e2e8f0]"
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
                        let color = "#475569";
                        if (cell.className?.includes("danger")) color = "#dc2626";
                        else if (cell.className?.includes("warn")) color = "#b45309";
                        const isNum = cell.className?.includes("num");
                        return (
                          <td
                            key={ci}
                            className="px-2 py-1.5 border-b border-[#f1f5f9]"
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

            {msg.sql && <SqlToggle sql={msg.sql} />}

            {msg.insight && (
              <div className="bg-[#f0fdf4] border-l-2 border-l-[#22c55e] px-3 py-2 my-2 text-[12px] text-[#374151] rounded-r-[5px] leading-[1.4]">
                {msg.insight}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              {msg.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#f0fdf4] text-[#059669] border border-[#bbf7d0]">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Query
                </span>
              )}
              {msg.source && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-[#ecfdf5] text-[#059669]">
                  Source: {msg.source}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
