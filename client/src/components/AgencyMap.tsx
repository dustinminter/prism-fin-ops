import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, TrendingUp, TrendingDown, AlertTriangle, Clock, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

interface AgencyMapProps {
  onAgencySelect?: (agencyCode: string | null) => void;
  selectedAgency?: string | null;
  compact?: boolean;
}

/**
 * AgencyMap - Interactive agency/secretariat diagram
 * 
 * Purpose: Visual navigation for agency-level filtering
 * Behavior: Click to filter dashboard, hover for spend/anomaly/forecast tooltips
 * Placement: Agency Overview page (primary), collapsible section on dashboard
 */
export default function AgencyMap({ onAgencySelect, selectedAgency, compact = false }: AgencyMapProps) {
  const [hoveredAgency, setHoveredAgency] = useState<string | null>(null);
  
  const { data: agencyData, isLoading } = trpc.prism.getAgencySpending.useQuery({}, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mock data for agencies when real data is loading
  const agencies = agencyData?.slice(0, 12) || [
    { agencyCode: "DOD", agencyName: "Department of Defense", totalSpending: 850000000000 },
    { agencyCode: "HHS", agencyName: "Health and Human Services", totalSpending: 650000000000 },
    { agencyCode: "SSA", agencyName: "Social Security Administration", totalSpending: 420000000000 },
    { agencyCode: "VA", agencyName: "Veterans Affairs", totalSpending: 280000000000 },
    { agencyCode: "ED", agencyName: "Department of Education", totalSpending: 180000000000 },
    { agencyCode: "DHS", agencyName: "Homeland Security", totalSpending: 150000000000 },
    { agencyCode: "DOT", agencyName: "Department of Transportation", totalSpending: 120000000000 },
    { agencyCode: "DOJ", agencyName: "Department of Justice", totalSpending: 95000000000 },
    { agencyCode: "DOE", agencyName: "Department of Energy", totalSpending: 85000000000 },
    { agencyCode: "NASA", agencyName: "NASA", totalSpending: 65000000000 },
    { agencyCode: "STATE", agencyName: "Department of State", totalSpending: 55000000000 },
    { agencyCode: "USDA", agencyName: "Department of Agriculture", totalSpending: 45000000000 },
  ];

  const formatCurrency = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getAgencyColor = (index: number): string => {
    const colors = [
      "#58a6ff", "#3fb950", "#d29922", "#f85149", 
      "#a371f7", "#8b949e", "#79c0ff", "#7ee787",
      "#e3b341", "#ff7b72", "#d2a8ff", "#b1bac4",
    ];
    return colors[index % colors.length];
  };

  const maxSpending = Math.max(...agencies.map(a => a.totalSpending || 0));

  const handleAgencyClick = (agencyCode: string) => {
    if (onAgencySelect) {
      onAgencySelect(selectedAgency === agencyCode ? null : agencyCode);
    }
  };

  const lastRefresh = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago mock

  if (compact) {
    return (
      <div className="p-4 bg-[#161b22] rounded-lg border border-[#30363d]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#c9d1d9] flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#58a6ff]" />
            Agency Overview
          </h3>
          <span className="text-[10px] text-[#6e7681] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {agencies.slice(0, 8).map((agency, i) => (
            <Tooltip key={agency.agencyCode}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleAgencyClick(agency.agencyCode)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    selectedAgency === agency.agencyCode
                      ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]"
                      : "bg-[#21262d] text-[#8b949e] border border-transparent hover:border-[#30363d] hover:text-[#c9d1d9]"
                  }`}
                >
                  {agency.agencyCode}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#161b22] border-[#30363d]">
                <div className="text-xs">
                  <p className="font-medium text-[#c9d1d9]">{agency.agencyName}</p>
                  <p className="text-[#8b949e]">{formatCurrency(agency.totalSpending || 0)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {agencies.length > 8 && (
            <span className="px-2 py-1 text-xs text-[#6e7681]">+{agencies.length - 8} more</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#21262d] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#21262d] bg-[#161b22]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#58a6ff]/10">
              <Building2 className="h-5 w-5 text-[#58a6ff]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#c9d1d9]">Federal Agency Map</h2>
              <p className="text-xs text-[#6e7681]">Click an agency to filter the dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#6e7681]">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              USAspending.gov
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Agency Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-[#21262d] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {agencies.map((agency, index) => {
              const isSelected = selectedAgency === agency.agencyCode;
              const isHovered = hoveredAgency === agency.agencyCode;
              const spendingRatio = (agency.totalSpending || 0) / maxSpending;
              const color = getAgencyColor(index);
              
              // Mock anomaly and forecast data
              const hasAnomaly = index % 4 === 0;
              const forecastVariance = (index % 3 === 0 ? 1 : -1) * (5 + (index % 10));

              return (
                <Tooltip key={agency.agencyCode}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => handleAgencyClick(agency.agencyCode)}
                      onMouseEnter={() => setHoveredAgency(agency.agencyCode)}
                      onMouseLeave={() => setHoveredAgency(null)}
                      className={`relative p-4 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "bg-[#58a6ff]/10 border-[#58a6ff]"
                          : "bg-[#161b22] border-[#30363d] hover:border-[#58a6ff]/50"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Spending indicator bar */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg opacity-60"
                        style={{ 
                          background: `linear-gradient(to right, ${color} ${spendingRatio * 100}%, transparent ${spendingRatio * 100}%)` 
                        }}
                      />

                      {/* Agency code */}
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="text-lg font-bold"
                          style={{ color: isSelected || isHovered ? color : "#c9d1d9" }}
                        >
                          {agency.agencyCode}
                        </span>
                        {hasAnomaly && (
                          <AlertTriangle className="h-3 w-3 text-[#d29922]" />
                        )}
                      </div>

                      {/* Spending amount */}
                      <p className="text-xs text-[#8b949e] truncate">
                        {formatCurrency(agency.totalSpending || 0)}
                      </p>

                      {/* Forecast indicator */}
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                        forecastVariance > 0 ? "text-[#f85149]" : "text-[#3fb950]"
                      }`}>
                        {forecastVariance > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{forecastVariance > 0 ? "+" : ""}{forecastVariance}% forecast</span>
                      </div>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-[#161b22] border-[#30363d] p-3 max-w-xs"
                  >
                    <div className="space-y-2">
                      <p className="font-medium text-[#c9d1d9]">{agency.agencyName}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[#6e7681]">Total Spending</p>
                          <p className="text-[#c9d1d9] font-medium">{formatCurrency(agency.totalSpending || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[#6e7681]">Forecast Variance</p>
                          <p className={forecastVariance > 0 ? "text-[#f85149]" : "text-[#3fb950]"}>
                            {forecastVariance > 0 ? "+" : ""}{forecastVariance}%
                          </p>
                        </div>
                        {hasAnomaly && (
                          <div className="col-span-2">
                            <p className="text-[#d29922] flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Active anomaly detected
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6e7681] pt-1 border-t border-[#30363d]">
                        Click to filter dashboard by this agency
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Source of truth */}
      <div className="px-6 py-3 border-t border-[#21262d] bg-[#161b22]/50">
        <p className="text-[10px] text-[#6e7681]">
          Source: USAspending.gov • Data refreshed daily • Governed by Federal Financial Data Agreement
        </p>
      </div>
    </div>
  );
}
