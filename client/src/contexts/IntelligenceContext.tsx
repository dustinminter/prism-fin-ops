import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScenarioId } from "@/data/intelligenceData";

interface IntelligenceContextValue {
  activeScenario: ScenarioId;
  isNewChat: boolean;
  setScenario: (id: ScenarioId) => void;
  startNewChat: () => void;
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("spending");
  const [isNewChat, setIsNewChat] = useState(true);

  const setScenario = (id: ScenarioId) => {
    setActiveScenario(id);
    setIsNewChat(false);
  };

  const startNewChat = () => {
    setIsNewChat(true);
  };

  return (
    <IntelligenceContext.Provider value={{ activeScenario, isNewChat, setScenario, startNewChat }}>
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used inside IntelligenceProvider");
  return ctx;
}
