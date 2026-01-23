import React, { createContext, useContext, useState, ReactNode, PropsWithChildren } from 'react';
import { FilterState, RiskFinding } from '../types';
import { RISK_FINDINGS as INITIAL_RISKS } from '../data';

interface AppContextType {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  riskQueue: RiskFinding[];
  addRiskFinding: (finding: RiskFinding) => void;
  updateRiskStatus: (id: string, status: RiskFinding['status']) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>({
    fiscalYear: 'FY2026',
    timeRange: 'FYTD',
    selectedAgencyId: 'ALL',
  });

  const [riskQueue, setRiskQueue] = useState<RiskFinding[]>(INITIAL_RISKS);

  const addRiskFinding = (finding: RiskFinding) => {
    setRiskQueue((prev) => [finding, ...prev]);
  };

  const updateRiskStatus = (id: string, status: RiskFinding['status']) => {
    setRiskQueue(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  }

  return (
    <AppContext.Provider value={{ filters, setFilters, riskQueue, addRiskFinding, updateRiskStatus }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};