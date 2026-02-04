import { useEffect } from "react";
import { IntelligenceProvider, useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarios, type ScenarioId } from "@/data/intelligenceData";
import TopBar from "@/components/intelligence/TopBar";
import Sidebar from "@/components/intelligence/Sidebar";
import IntelligenceChat from "@/components/intelligence/IntelligenceChat";
import { PathfinderProvider } from "@/components/pathfinder/PathfinderProvider";

function IntelligenceLayout() {
  const { activeScenario, setScenario } = useIntelligence();

  // Keyboard navigation: arrow keys cycle scenarios
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ids = scenarios.map((s) => s.id);
      const idx = ids.indexOf(activeScenario);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setScenario(ids[(idx + 1) % ids.length] as ScenarioId);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setScenario(ids[(idx - 1 + ids.length) % ids.length] as ScenarioId);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeScenario, setScenario]);

  return (
    <div
      id="prism-topbar"
      className="flex flex-col h-screen bg-[#0d1117] text-[#d0d7de] overflow-hidden"
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <IntelligenceChat />
      </div>
      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-1.5 bg-[#151b23] border-t border-[#2a3040] text-[11px] text-[#5c6370] shrink-0">
        <div className="flex items-center gap-3">
          {["RLS Active", "Query Audit", "Trust State", "PRISM v1.0"].map((item) => (
            <div key={item} className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-[#3fb950]" />
              {item}
            </div>
          ))}
        </div>
        <span>
          Powered by <strong className="text-[#29B5E8]">Snowflake</strong> &middot; Archetype
          Consulting
        </span>
      </div>
    </div>
  );
}

export default function Intelligence() {
  return (
    <IntelligenceProvider>
      <PathfinderProvider>
        <IntelligenceLayout />
      </PathfinderProvider>
    </IntelligenceProvider>
  );
}
