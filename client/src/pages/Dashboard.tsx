import PrismLayout from "@/components/PrismLayout";
import AgencyMap from "@/components/AgencyMap";
import SignalFlowVisual from "@/components/SignalFlowVisual";
import AgencyDiagram from "@/components/AgencyDiagram";
import TrustStateWorkflow from "@/components/TrustStateWorkflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  HelpCircle,
  Info,
  Layers,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from "recharts";

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#8b949e"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [showAgencyDiagram, setShowAgencyDiagram] = useState(false);
  const [trustState, setTrustState] = useState<"draft" | "internal" | "client" | "executive">("draft");

  const { data: agencySpending, isLoading: loadingAgencies } = trpc.prism.getAgencySpending.useQuery({ limit: 10 });
  const { data: awardSummary, isLoading: loadingSummary } = trpc.prism.getAwardSummary.useQuery();
  const { data: awardsByType, isLoading: loadingTypes } = trpc.prism.getAwardsByType.useQuery();
  const { data: topAwards, isLoading: loadingTopAwards } = trpc.prism.getTopAwards.useQuery({ limit: 5 });
  const { data: driftAlerts, isLoading: loadingAlerts } = trpc.prism.getDriftAlerts.useQuery();
  const { data: consumptionMetrics, isLoading: loadingMetrics } = trpc.prism.getConsumptionMetrics.useQuery();

  const criticalAlerts = driftAlerts?.filter((a) => a.severity === "critical").length || 0;
  const warningAlerts = driftAlerts?.filter((a) => a.severity === "warning").length || 0;

  // Handle bar click to drill down to agency
  const handleBarClick = (data: any) => {
    if (data?.code) {
      setLocation(`/agency/${data.code}`);
    }
  };

  // Handle trust state promotion
  const handleTrustStateChange = async (newState: typeof trustState, rationale: string) => {
    // In a real app, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setTrustState(newState);
  };

  return (
    <PrismLayout title="Federal Spending Dashboard" trustState={trustState}>
      <div className="container py-6">
        {/* Signal Flow Visual - Shows continuous data processing */}
        <div className="mb-6">
          <SignalFlowVisual compact />
        </div>

        {/* Alert Banner - Simplified */}
        {(criticalAlerts > 0 || warningAlerts > 0) && (
          <div className="mb-6 p-3 rounded-lg bg-[#d29922]/10 border border-[#d29922]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#d29922]" />
              <span className="text-sm">
                <strong>{criticalAlerts + warningAlerts}</strong> anomalies detected
                {criticalAlerts > 0 && (
                  <span className="text-[#f85149]"> ({criticalAlerts} critical)</span>
                )}
              </span>
            </div>
            <Link href="/anomalies">
              <Button variant="ghost" size="sm" className="text-[#d29922] hover:bg-[#d29922]/20 h-8">
                View
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Summary Cards - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Obligations"
            value={awardSummary?.totalObligations}
            format="currency"
            icon={DollarSign}
            loading={loadingSummary}
            tooltip="Total federal spending obligations across all agencies"
          />
          <SummaryCard
            title="Total Awards"
            value={awardSummary?.totalAwards}
            format="number"
            icon={FileText}
            loading={loadingSummary}
            tooltip="Number of federal contract and grant awards"
          />
          <SummaryCard
            title="Agencies"
            value={awardSummary?.uniqueAgencies}
            format="number"
            icon={Building2}
            loading={loadingSummary}
            tooltip="Federal agencies with spending activity"
          />
          <SummaryCard
            title="Recipients"
            value={awardSummary?.uniqueRecipients}
            format="number"
            icon={Users}
            loading={loadingSummary}
            tooltip="Unique vendors and grant recipients"
          />
        </div>

        {/* Agency Hierarchy - Collapsible */}
        <Collapsible open={showAgencyDiagram} onOpenChange={setShowAgencyDiagram} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9]"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#58a6ff]" />
                <span>Agency Hierarchy</span>
                <Badge variant="outline" className="border-[#30363d] text-[#8b949e] text-xs ml-2">
                  {awardSummary?.uniqueAgencies || "—"} agencies
                </Badge>
              </div>
              {showAgencyDiagram ? (
                <ChevronDown className="h-4 w-4 text-[#8b949e]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#8b949e]" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4">
              <AgencyDiagram
                onAgencySelect={(code) => setLocation(`/agency/${code}`)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Agency Map - Compact view */}
        {!showAgencyDiagram && (
          <div className="mb-6">
            <AgencyMap
              compact
              onAgencySelect={(code) => code && setLocation(`/agency/${code}`)}
            />
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Agency Spending Bar Chart - Interactive */}
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-[#c9d1d9]">Top Agencies by Spending</CardTitle>
                  <CardDescription className="text-xs text-[#6e7681]">
                    Click a bar to drill down
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-[#6e7681]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Federal agencies ranked by total obligations. Click any bar to see detailed agency spending breakdown.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAgencies ? (
                <Skeleton className="h-[280px] bg-[#21262d]" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={agencySpending?.slice(0, 8).map((a) => ({
                      name: a.agencyName?.substring(0, 20) || "Unknown",
                      spending: a.totalSpending / 1e9,
                      code: a.agencyCode,
                    }))}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis type="number" stroke="#8b949e" tickFormatter={(v) => `$${v.toFixed(1)}B`} fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#8b949e" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}B`, "Spending"]}
                      cursor={{ fill: "#58a6ff", fillOpacity: 0.1 }}
                    />
                    <Bar 
                      dataKey="spending" 
                      fill="#58a6ff" 
                      radius={[0, 4, 4, 0]} 
                      cursor="pointer"
                      onClick={handleBarClick}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Award Types Pie Chart */}
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-[#c9d1d9]">Awards by Type</CardTitle>
                  <CardDescription className="text-xs text-[#6e7681]">
                    Distribution by category
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-[#6e7681]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Breakdown of federal awards by type: contracts, grants, loans, and other assistance.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTypes ? (
                <Skeleton className="h-[280px] bg-[#21262d]" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={awardsByType?.slice(0, 6).map((t) => ({
                        name: t.awardType || "Other",
                        value: t.totalAmount / 1e9,
                        percentage: t.percentage,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={{ stroke: "#6e7681" }}
                    >
                      {awardsByType?.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}B`, "Amount"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spending Trend - Full Width */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-[#c9d1d9]">Spending Trend</CardTitle>
                <CardDescription className="text-xs text-[#6e7681]">
                  Monthly spending vs baseline
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#58a6ff]" />
                  <span className="text-[#8b949e]">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#8b949e]" style={{ borderStyle: "dashed" }} />
                  <span className="text-[#8b949e]">Baseline</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMetrics ? (
              <Skeleton className="h-[220px] bg-[#21262d]" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={consumptionMetrics?.slice().reverse().map((m) => ({
                    date: m.date,
                    actual: m.actual / 1e9,
                    baseline: m.baseline ? m.baseline / 1e9 : null,
                  }))}
                >
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="date" stroke="#8b949e" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8b949e" tickFormatter={(v) => `$${v}B`} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px" }}
                    formatter={(value: number) => [`$${value?.toFixed(2)}B`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#58a6ff"
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="#8b949e"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Baseline"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Awards Table - Compact */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#c9d1d9]">Highest Value Awards</CardTitle>
              <Badge variant="outline" className="border-[#30363d] text-[#8b949e] text-xs">
                Top 5
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTopAwards ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 bg-[#21262d]" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-2 px-3 text-[#6e7681] font-medium text-xs">Recipient</th>
                      <th className="text-left py-2 px-3 text-[#6e7681] font-medium text-xs">Agency</th>
                      <th className="text-left py-2 px-3 text-[#6e7681] font-medium text-xs">Type</th>
                      <th className="text-right py-2 px-3 text-[#6e7681] font-medium text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAwards?.map((award) => (
                      <tr key={award.awardId} className="border-b border-[#30363d]/50 hover:bg-[#21262d]">
                        <td className="py-2 px-3 text-sm text-[#c9d1d9]">{award.recipientName || "N/A"}</td>
                        <td className="py-2 px-3 text-sm text-[#8b949e]">{award.agencyName?.substring(0, 25) || "N/A"}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="border-[#30363d] text-[#58a6ff] text-xs">
                            {award.awardType || "Other"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-[#3fb950]">
                          ${(award.awardAmount / 1e6).toFixed(1)}M
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust State Workflow - Shows governance approval flow */}
        <TrustStateWorkflow
          currentState={trustState}
          onStateChange={handleTrustStateChange}
          documentTitle="This dashboard view"
          canPromote={true}
        />
      </div>
    </PrismLayout>
  );
}

function SummaryCard({
  title,
  value,
  format,
  icon: Icon,
  loading,
  tooltip,
}: {
  title: string;
  value: number | undefined;
  format: "currency" | "number";
  icon: React.ElementType;
  loading: boolean;
  tooltip?: string;
}) {
  const formatValue = (v: number | undefined) => {
    if (v === undefined) return "—";
    if (format === "currency") {
      if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toLocaleString()}`;
    }
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
  };

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs text-[#6e7681]">{title}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-[#6e7681]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-7 w-20 bg-[#21262d]" />
            ) : (
              <p className="text-xl font-bold text-[#c9d1d9]">{formatValue(value)}</p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-[#21262d]">
            <Icon className="h-4 w-4 text-[#58a6ff]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
