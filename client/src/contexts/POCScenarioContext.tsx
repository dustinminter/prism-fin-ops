import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScenarioId } from "@/data/pocDemoData";

interface POCScenarioContextValue {
  activeScenario: ScenarioId;
  setScenario: (id: ScenarioId) => void;
}

const POCScenarioContext = createContext<POCScenarioContextValue | null>(null);

export function POCScenarioProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setScenario] = useState<ScenarioId>("spending");

  return (
    <POCScenarioContext.Provider value={{ activeScenario, setScenario }}>
      {children}
    </POCScenarioContext.Provider>
  );
}

export function usePOCScenario() {
  const ctx = useContext(POCScenarioContext);
  if (!ctx) throw new Error("usePOCScenario must be used inside POCScenarioProvider");
  return ctx;
}
