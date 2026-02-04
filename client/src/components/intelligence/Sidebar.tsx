import { useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarios, type ScenarioId } from "@/data/intelligenceData";
import { MessageSquarePlus, Circle, Clock } from "lucide-react";

export default function Sidebar() {
  const { activeScenario, setScenario } = useIntelligence();

  return (
    <div className="w-[240px] bg-[#0d1117] border-r border-[#21262d] py-4 shrink-0 overflow-y-auto flex flex-col">
      {/* New Chat */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setScenario("spending" as ScenarioId)}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-[#161b22] border border-[#21262d] text-[13px] text-[#c9d1d9] font-medium hover:bg-[#1c2333] hover:border-[#30363d] transition-all duration-200"
        >
          <MessageSquarePlus className="w-4 h-4 text-[#29B5E8]" />
          New Chat
        </button>
      </div>

      {/* Agent selector */}
      <div className="px-3 mb-3">
        <div className="text-[10px] font-semibold tracking-[1px] uppercase text-[#484f58] mb-2 px-1">
          Agent
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22]/60 border border-[#21262d] rounded-lg text-[11px] text-[#8b949e]">
          <Circle className="w-2.5 h-2.5 fill-[#3fb950] text-[#3fb950] shrink-0" />
          <span className="font-medium text-[#c9d1d9] truncate">PRISM_EOTSS_FINOPS</span>
        </div>
      </div>

      <div className="h-px bg-[#21262d] mx-4 mb-3" />

      {/* Use case scenarios */}
      <div className="px-3 mb-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[1px] uppercase text-[#484f58] mb-2 px-1">
          <Clock className="w-3 h-3" />
          Recent
        </div>
      </div>
      {scenarios.map((s) => {
        const Icon = s.icon;
        const isActive = activeScenario === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setScenario(s.id as ScenarioId)}
            className={`flex items-center gap-2.5 w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-md text-[13px] text-left transition-all duration-200
              ${isActive
                ? "bg-[#1f6feb]/15 text-[#58a6ff] shadow-[inset_0_0_0_1px_rgba(31,111,235,0.25)]"
                : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{s.label}</span>
            {s.badgeCount && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#f85149]/15 text-[#f85149]">
                {s.badgeCount}
              </span>
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Footer */}
      <div className="px-4 py-2 text-[10px] text-[#484f58]">
        Powered by <span className="text-[#29B5E8]">Snowflake</span> · Archetype
      </div>
    </div>
  );
}
