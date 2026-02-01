import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Layers,
  Users,
  Briefcase,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Agency {
  code: string;
  name: string;
  shortName?: string;
  totalSpend: number;
  spendChange: number;
  awardCount: number;
  secretariat?: string;
  children?: Agency[];
}

interface AgencyDiagramProps {
  agencies?: Agency[];
  onAgencySelect?: (agencyCode: string) => void;
  selectedAgency?: string;
  compact?: boolean;
  showSecretariats?: boolean;
}

// Federal secretariats (cabinet-level groupings)
const SECRETARIATS = [
  { id: "defense", name: "Defense & Security", color: "#58a6ff" },
  { id: "health", name: "Health & Human Services", color: "#3fb950" },
  { id: "commerce", name: "Commerce & Treasury", color: "#d29922" },
  { id: "infrastructure", name: "Infrastructure & Energy", color: "#a371f7" },
  { id: "other", name: "Other Agencies", color: "#8b949e" },
];

// Mock agency data with secretariat groupings
const MOCK_AGENCIES: Agency[] = [
  {
    code: "DOD",
    name: "Department of Defense",
    shortName: "DoD",
    totalSpend: 847000000000,
    spendChange: 5.2,
    awardCount: 145892,
    secretariat: "defense",
    children: [
      { code: "ARMY", name: "Department of the Army", totalSpend: 187000000000, spendChange: 3.1, awardCount: 34521, secretariat: "defense" },
      { code: "NAVY", name: "Department of the Navy", totalSpend: 213000000000, spendChange: 6.7, awardCount: 42198, secretariat: "defense" },
      { code: "USAF", name: "Department of the Air Force", totalSpend: 198000000000, spendChange: 4.8, awardCount: 38762, secretariat: "defense" },
    ],
  },
  {
    code: "HHS",
    name: "Department of Health and Human Services",
    shortName: "HHS",
    totalSpend: 156000000000,
    spendChange: 12.3,
    awardCount: 89234,
    secretariat: "health",
    children: [
      { code: "CDC", name: "Centers for Disease Control", totalSpend: 12000000000, spendChange: 8.2, awardCount: 15234, secretariat: "health" },
      { code: "NIH", name: "National Institutes of Health", totalSpend: 47000000000, spendChange: 9.1, awardCount: 28912, secretariat: "health" },
      { code: "CMS", name: "Centers for Medicare & Medicaid", totalSpend: 89000000000, spendChange: 15.4, awardCount: 12987, secretariat: "health" },
    ],
  },
  {
    code: "DHS",
    name: "Department of Homeland Security",
    shortName: "DHS",
    totalSpend: 78000000000,
    spendChange: -2.1,
    awardCount: 45123,
    secretariat: "defense",
    children: [
      { code: "CBP", name: "Customs and Border Protection", totalSpend: 18000000000, spendChange: -3.2, awardCount: 12345, secretariat: "defense" },
      { code: "FEMA", name: "Federal Emergency Management Agency", totalSpend: 28000000000, spendChange: 8.9, awardCount: 18234, secretariat: "defense" },
      { code: "TSA", name: "Transportation Security Admin", totalSpend: 9000000000, spendChange: 1.2, awardCount: 8912, secretariat: "defense" },
    ],
  },
  {
    code: "VA",
    name: "Department of Veterans Affairs",
    shortName: "VA",
    totalSpend: 297000000000,
    spendChange: 7.8,
    awardCount: 67891,
    secretariat: "health",
  },
  {
    code: "DOE",
    name: "Department of Energy",
    shortName: "DOE",
    totalSpend: 52000000000,
    spendChange: 18.5,
    awardCount: 23456,
    secretariat: "infrastructure",
  },
  {
    code: "DOT",
    name: "Department of Transportation",
    shortName: "DOT",
    totalSpend: 108000000000,
    spendChange: 22.1,
    awardCount: 34567,
    secretariat: "infrastructure",
  },
  {
    code: "TREAS",
    name: "Department of the Treasury",
    shortName: "Treasury",
    totalSpend: 18000000000,
    spendChange: -5.3,
    awardCount: 12345,
    secretariat: "commerce",
  },
  {
    code: "DOC",
    name: "Department of Commerce",
    shortName: "Commerce",
    totalSpend: 14000000000,
    spendChange: 3.7,
    awardCount: 9876,
    secretariat: "commerce",
  },
  {
    code: "NASA",
    name: "National Aeronautics and Space Administration",
    shortName: "NASA",
    totalSpend: 25000000000,
    spendChange: 8.9,
    awardCount: 18234,
    secretariat: "other",
  },
  {
    code: "EPA",
    name: "Environmental Protection Agency",
    shortName: "EPA",
    totalSpend: 11000000000,
    spendChange: 15.2,
    awardCount: 8765,
    secretariat: "infrastructure",
  },
];

export default function AgencyDiagram({
  agencies = MOCK_AGENCIES,
  onAgencySelect,
  selectedAgency,
  compact = false,
  showSecretariats = true,
}: AgencyDiagramProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"hierarchy" | "flat">("hierarchy");

  const filteredAgencies = useMemo(() => {
    if (!searchTerm) return agencies;
    const term = searchTerm.toLowerCase();
    return agencies.filter(
      a =>
        a.name.toLowerCase().includes(term) ||
        a.code.toLowerCase().includes(term) ||
        a.shortName?.toLowerCase().includes(term)
    );
  }, [agencies, searchTerm]);

  const groupedBySecretariat = useMemo(() => {
    const groups: Record<string, Agency[]> = {};
    SECRETARIATS.forEach(s => (groups[s.id] = []));
    filteredAgencies.forEach(a => {
      const sec = a.secretariat || "other";
      if (groups[sec]) groups[sec].push(a);
    });
    return groups;
  }, [filteredAgencies]);

  const toggleExpand = (code: string) => {
    setExpandedAgencies(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const formatSpend = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${(value / 1e3).toFixed(0)}K`;
  };

  const SpendChange = ({ change }: { change: number }) => {
    if (change > 0)
      return (
        <span className="flex items-center gap-0.5 text-[#3fb950] text-xs">
          <TrendingUp className="h-3 w-3" />
          +{change.toFixed(1)}%
        </span>
      );
    if (change < 0)
      return (
        <span className="flex items-center gap-0.5 text-[#f85149] text-xs">
          <TrendingDown className="h-3 w-3" />
          {change.toFixed(1)}%
        </span>
      );
    return (
      <span className="flex items-center gap-0.5 text-[#8b949e] text-xs">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  };

  const AgencyNode = ({ agency, depth = 0 }: { agency: Agency; depth?: number }) => {
    const hasChildren = agency.children && agency.children.length > 0;
    const isExpanded = expandedAgencies.has(agency.code);
    const isSelected = selectedAgency === agency.code;

    return (
      <div className="space-y-1">
        <button
          onClick={() => {
            if (hasChildren) toggleExpand(agency.code);
            onAgencySelect?.(agency.code);
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
            isSelected
              ? "bg-[#0969da]/10 border-[#0969da] border"
              : "bg-white border border-[#d0d7de] hover:border-[#0969da]/50 hover:bg-[#f6f8fa]"
          }`}
          style={{ marginLeft: depth * 16 }}
        >
          {hasChildren && (
            <div className="w-5 h-5 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#656d76]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#656d76]" />
              )}
            </div>
          )}
          {!hasChildren && <div className="w-5" />}

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <Building2 className={`h-4 w-4 ${isSelected ? "text-[#0969da]" : "text-[#656d76]"}`} />
              <span className="font-medium text-sm text-[#1f2328] truncate">
                {agency.shortName || agency.code}
              </span>
              <span className="text-xs text-[#656d76] truncate hidden sm:inline">
                {agency.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1f2328]">{formatSpend(agency.totalSpend)}</p>
              <SpendChange change={agency.spendChange} />
            </div>
            <Badge variant="outline" className="text-[10px] border-[#d0d7de] text-[#656d76]">
              {agency.awardCount.toLocaleString()} awards
            </Badge>
          </div>
        </button>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 pt-1">
                {agency.children?.map(child => (
                  <AgencyNode key={child.code} agency={child} depth={depth + 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {filteredAgencies.slice(0, 5).map(agency => (
          <button
            key={agency.code}
            onClick={() => onAgencySelect?.(agency.code)}
            className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
              selectedAgency === agency.code
                ? "bg-[#0969da]/10 border-[#0969da]"
                : "bg-[#f6f8fa] hover:bg-white"
            } border border-[#d0d7de]`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[#656d76]" />
              <span className="text-xs font-medium text-[#1f2328]">
                {agency.shortName || agency.code}
              </span>
            </div>
            <span className="text-xs text-[#656d76]">{formatSpend(agency.totalSpend)}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#d0d7de] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0969da]" />
            <h3 className="text-sm font-semibold text-[#1f2328]">Agency Hierarchy</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "hierarchy" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("hierarchy")}
              className={`h-7 text-xs ${
                viewMode === "hierarchy"
                  ? "bg-[#0969da] text-white"
                  : "border-[#d0d7de] text-[#656d76]"
              }`}
            >
              <Layers className="h-3 w-3 mr-1" />
              Hierarchy
            </Button>
            <Button
              variant={viewMode === "flat" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("flat")}
              className={`h-7 text-xs ${
                viewMode === "flat"
                  ? "bg-[#0969da] text-white"
                  : "border-[#d0d7de] text-[#656d76]"
              }`}
            >
              <Users className="h-3 w-3 mr-1" />
              Flat
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#656d76]" />
          <Input
            placeholder="Search agencies..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#d0d7de] text-[#1f2328] placeholder:text-[#656d76] h-9"
          />
        </div>
      </div>

      {/* Agency List */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {showSecretariats && viewMode === "hierarchy" ? (
          <div className="space-y-4">
            {SECRETARIATS.map(secretariat => {
              const secAgencies = groupedBySecretariat[secretariat.id];
              if (secAgencies.length === 0) return null;

              return (
                <div key={secretariat.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: secretariat.color }}
                    />
                    <span className="text-xs font-medium text-[#656d76] uppercase tracking-wider">
                      {secretariat.name}
                    </span>
                    <span className="text-[10px] text-[#8b949e]">
                      ({secAgencies.length} agencies)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {secAgencies.map(agency => (
                      <AgencyNode key={agency.code} agency={agency} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAgencies.map(agency => (
              <AgencyNode key={agency.code} agency={agency} />
            ))}
          </div>
        )}

        {filteredAgencies.length === 0 && (
          <div className="text-center py-8 text-[#656d76]">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agencies found</p>
            <p className="text-xs">Try adjusting your search</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center justify-between text-xs text-[#656d76]">
          <span>{filteredAgencies.length} agencies shown</span>
          <span>
            Total: {formatSpend(filteredAgencies.reduce((sum, a) => sum + a.totalSpend, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact agency selector for use in filters
export function AgencySelector({
  value,
  onChange,
  agencies = MOCK_AGENCIES,
}: {
  value?: string;
  onChange: (code: string) => void;
  agencies?: Agency[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = agencies.find(a => a.code === value);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between border-[#d0d7de] text-[#1f2328] h-9"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#656d76]" />
          {selected ? selected.shortName || selected.code : "All Agencies"}
        </div>
        <ChevronDown className={`h-4 w-4 text-[#656d76] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d0d7de] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            <button
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[#656d76] hover:bg-[#f6f8fa]"
            >
              All Agencies
            </button>
            {agencies.map(agency => (
              <button
                key={agency.code}
                onClick={() => {
                  onChange(agency.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#f6f8fa] flex items-center justify-between ${
                  value === agency.code ? "bg-[#0969da]/5 text-[#0969da]" : "text-[#1f2328]"
                }`}
              >
                <span>{agency.shortName || agency.code}</span>
                <span className="text-xs text-[#656d76]">{agency.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
