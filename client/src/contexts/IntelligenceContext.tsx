import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScenarioId } from "@/data/intelligenceData";

interface IntelligenceContextValue {
  activeScenario: ScenarioId;
  setScenario: (id: ScenarioId) => void;
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setScenario] = useState<ScenarioId>("spending");

  return (
    <IntelligenceContext.Provider value={{ activeScenario, setScenario }}>
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used inside IntelligenceProvider");
  return ctx;
}
