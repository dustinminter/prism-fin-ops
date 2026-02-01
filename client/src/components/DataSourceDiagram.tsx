import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  FileText,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  Cloud,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "active" | "pending" | "planned";
  lastRefresh?: Date;
  coverage?: string;
  governingAgreement?: string;
  details?: string[];
}

interface DataSourceDiagramProps {
  targetObject?: string;
  compact?: boolean;
  showAllSources?: boolean;
}

// All PRISM data sources
const DATA_SOURCES: DataSource[] = [
  {
    id: "usaspending",
    name: "USAspending.gov",
    description: "Federal contracts, grants, and spending data",
    icon: Database,
    status: "active",
    lastRefresh: new Date(Date.now() - 2 * 60 * 60 * 1000),
    coverage: "FY2008 - Present",
    governingAgreement: "Federal Financial Data Agreement",
    details: [
      "Prime awards and sub-awards",
      "Agency obligation records",
      "Recipient and vendor information",
      "Contract and grant details",
    ],
  },
  {
    id: "cip",
    name: "Capital Investment Plan (CIP)",
    description: "Federal IT investment planning data FY26-FY30",
    icon: Calendar,
    status: "active",
    lastRefresh: new Date(Date.now() - 24 * 60 * 60 * 1000),
    coverage: "FY2026 - FY2030",
    governingAgreement: "OMB IT Investment Agreement",
    details: [
      "5-year investment projections",
      "Agency IT portfolios",
      "Policy area classifications",
      "Planned vs actual tracking",
    ],
  },
  {
    id: "cloud-aws",
    name: "AWS Cloud Billing",
    description: "Amazon Web Services cost and usage data",
    icon: Cloud,
    status: "planned",
    coverage: "Coming Q2 2026",
    details: [
      "Cost allocation by service",
      "Usage metrics and trends",
      "Reserved instance utilization",
    ],
  },
  {
    id: "cloud-azure",
    name: "Azure Cloud Billing",
    description: "Microsoft Azure cost and usage data",
    icon: Cloud,
    status: "planned",
    coverage: "Coming Q3 2026",
    details: [
      "Enterprise agreement costs",
      "Resource group allocation",
      "Subscription-level tracking",
    ],
  },
  {
    id: "cloud-gcp",
    name: "GCP Cloud Billing",
    description: "Google Cloud Platform cost and usage data",
    icon: Cloud,
    status: "planned",
    coverage: "Coming Q4 2026",
    details: [
      "Project-level costs",
      "BigQuery and Compute usage",
      "Committed use discounts",
    ],
  },
];

export default function DataSourceDiagram({ 
  targetObject, 
  compact = false,
  showAllSources = false 
}: DataSourceDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default for more chat space

  const { data: lineage } = trpc.prism.getDataLineage.useQuery(
    { targetObject: targetObject || "V_AGENCY_SPEND_MONTHLY" },
    { enabled: isExpanded && !!targetObject }
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-[#8b949e] hover:text-[#c9d1d9] gap-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <GitBranch className="h-3 w-3" />
            View lineage
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px]">
          <p className="text-xs">View data source and transformation lineage for this metric</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-auto py-2 px-3 text-left hover:bg-[#f6f8fa] group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#f6f8fa] group-hover:bg-[#e6eaef]">
              <Database className="h-3.5 w-3.5 text-[#656d76]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#1f2328]">About this data</p>
              <p className="text-[10px] text-[#656d76]">Source, lineage & governance</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[#656d76]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#656d76]" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2">
          {/* Compact Data Sources List */}
          <p className="text-[10px] text-[#656d76] uppercase tracking-wider font-medium">
            Connected Data Sources
          </p>

          <div className="space-y-1">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.id}
                className={`flex items-center justify-between py-1.5 px-2 rounded ${
                  source.status === "active"
                    ? "bg-white hover:bg-[#f6f8fa]"
                    : "bg-[#f6f8fa] opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <source.icon className={`h-3.5 w-3.5 flex-shrink-0 ${
                    source.status === "active" ? "text-[#0969da]" : "text-[#656d76]"
                  }`} />
                  <span className="text-xs text-[#1f2328] truncate">{source.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {source.lastRefresh && (
                    <span className="text-[10px] text-[#656d76] hidden sm:inline">
                      {formatDistanceToNow(source.lastRefresh, { addSuffix: true })}
                    </span>
                  )}
                  {source.status === "active" ? (
                    <span className="text-[10px] text-[#1a7f37] font-medium">Active</span>
                  ) : (
                    <span className="text-[10px] text-[#656d76]">{source.coverage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Lineage for specific target object */}
          {targetObject && lineage && (
            <div className="bg-[#f6f8fa] rounded p-2 border border-[#d0d7de]">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-[#1a7f37]" />
                <span className="text-[10px] font-medium text-[#1f2328]">{lineage.targetObject}</span>
                <Badge variant="outline" className="text-[9px] border-[#d0d7de] text-[#656d76] h-4">
                  {lineage.targetType}
                </Badge>
              </div>
            </div>
          )}

          {/* Compact summary */}
          <p className="text-[10px] text-[#656d76]">
            {DATA_SOURCES.filter(s => s.status === "active").length} active • {DATA_SOURCES.filter(s => s.status === "planned").length} planned
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Inline lineage badge for metrics
export function LineageBadge({ targetObject }: { targetObject: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { data: lineage } = trpc.prism.getDataLineage.useQuery(
    { targetObject },
    { enabled: showTooltip }
  );

  return (
    <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[10px] text-[#6e7681] hover:text-[#8b949e] transition-colors">
          <GitBranch className="h-2.5 w-2.5" />
          <span>Lineage</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px] p-3 bg-[#161b22] border-[#30363d]">
        {lineage ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#58a6ff]" />
              <span className="text-xs font-medium text-[#c9d1d9]">{lineage.targetObject}</span>
            </div>
            <p className="text-[10px] text-[#8b949e]">{lineage.transformationLogic}</p>
            <div className="flex items-center gap-2 pt-1 border-t border-[#30363d]">
              <Shield className="h-3 w-3 text-[#d29922]" />
              <span className="text-[10px] text-[#8b949e]">{lineage.governingAgreement}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#8b949e]">Loading lineage...</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Data freshness indicator
export function DataFreshnessIndicator({ 
  lastUpdated, 
  refreshFrequency 
}: { 
  lastUpdated?: string; 
  refreshFrequency?: string;
}) {
  const isStale = lastUpdated 
    ? new Date().getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000 
    : false;

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <Clock className={`h-3 w-3 ${isStale ? "text-[#d29922]" : "text-[#3fb950]"}`} />
      <span className={isStale ? "text-[#d29922]" : "text-[#8b949e]"}>
        {lastUpdated 
          ? `Updated ${new Date(lastUpdated).toLocaleDateString()}`
          : refreshFrequency || "Real-time"
        }
      </span>
    </div>
  );
}
