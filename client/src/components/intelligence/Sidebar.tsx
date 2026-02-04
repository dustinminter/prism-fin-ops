import { motion } from "framer-motion";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarios, type ScenarioId } from "@/data/intelligenceData";
import { MessageSquarePlus, Circle } from "lucide-react";

const dataSources = [
  "CIW — Financial Data",
  "CIP — Capital Investments",
  "Commbuys — Procurement",
  "CTHR — Workforce",
];

const governance = [
  "Row-Level Security",
  "Query Audit Trail",
  "Trust State Workflow",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-[#5c6370] px-4 mb-2">
      {children}
    </div>
  );
}

function StatusList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2 px-4 py-1 text-[12px] text-[#5c6370]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
          {item}
        </div>
      ))}
    </>
  );
}

export default function Sidebar() {
  const { activeScenario, setScenario } = useIntelligence();

  return (
    <div id="si-sidebar" className="w-[240px] bg-[#151b23]/80 backdrop-blur-sm border-r border-[#2a3040] py-4 shrink-0 overflow-y-auto flex flex-col">
      {/* New Chat button */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setScenario("spending" as ScenarioId)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#1c2333] border border-[#2a3040] text-[13px] text-[#d0d7de] font-medium hover:bg-[#252d3d] hover:border-[#58a6ff]/30 transition-all duration-200"
        >
          <MessageSquarePlus className="w-4 h-4 text-[#29B5E8]" />
          New Chat
        </button>
      </div>

      {/* Agent pill */}
      <div className="px-3 mb-4">
        <div id="si-agent-pill" className="flex items-center gap-2 px-3 py-2 bg-[#1c2333]/60 border border-[#2a3040] rounded-lg text-[11px] text-[#8b949e]">
          <Circle className="w-2.5 h-2.5 fill-[#22c55e] text-[#22c55e] shrink-0" />
          <span className="font-medium text-[#d0d7de]">PRISM_EOTSS_FINOPS</span>
        </div>
      </div>

      <div className="h-px bg-[#2a3040] mx-4 mb-3" />

      <SectionLabel>Topics</SectionLabel>
      {scenarios.map((s, i) => {
        const Icon = s.icon;
        const isActive = activeScenario === s.id;
        return (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            onClick={() => setScenario(s.id as ScenarioId)}
            className={`flex items-center gap-2.5 w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-md text-[13px] text-left transition-all duration-200
              ${isActive
                ? "bg-[#58a6ff]/10 text-[#58a6ff] shadow-[inset_0_0_0_1px_rgba(88,166,255,0.2)]"
                : "text-[#8b949e] hover:bg-[#1c2333] hover:text-[#d0d7de]"
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{s.label}</span>
            {s.badgeCount && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#f85149]/15 text-[#f85149]">
                {s.badgeCount}
              </span>
            )}
          </motion.button>
        );
      })}

      <div className="h-px bg-[#2a3040] mx-4 my-3" />
      <SectionLabel>Data Sources</SectionLabel>
      <StatusList items={dataSources} />

      <div className="h-px bg-[#2a3040] mx-4 my-3" />
      <div id="si-governance">
        <SectionLabel>Governance</SectionLabel>
        <StatusList items={governance} />
      </div>

      {/* Spacer to push content up */}
      <div className="flex-1" />
    </div>
  );
}
