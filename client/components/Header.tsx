import React from 'react';
import { useApp } from '../context/AppContext';
import { AGENCIES } from '../data';
import { Search, ChevronDown, User, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  toggleChat: () => void;
  isChatOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ toggleChat, isChatOpen }) => {
  const { filters, setFilters } = useApp();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* Global Filters */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 space-x-1">
          <select
            className="bg-transparent text-sm font-medium text-slate-700 py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            value={filters.fiscalYear}
            onChange={(e) => setFilters({ ...filters, fiscalYear: e.target.value })}
          >
            <option value="FY2024">FY2024</option>
            <option value="FY2023">FY2023</option>
          </select>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <select
            className="bg-transparent text-sm font-medium text-slate-700 py-1.5 px-3 rounded-md focus:outline-none"
            value={filters.timeRange}
            onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as any })}
          >
            <option value="FYTD">FYTD</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Month">Month</option>
          </select>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <select
            className="pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 appearance-none min-w-[200px]"
            value={filters.selectedAgencyId}
            onChange={(e) => setFilters({ ...filters, selectedAgencyId: e.target.value })}
          >
            <option value="ALL">All Agencies</option>
            {AGENCIES.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          className="text-slate-400 text-sm font-medium hover:text-slate-600 disabled:opacity-50 cursor-not-allowed"
          disabled
          title="Coming soon"
        >
          Export
        </button>

        <button
          onClick={toggleChat}
          className={cn(
            "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
            isChatOpen
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 text-orange-700 cursor-pointer">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
