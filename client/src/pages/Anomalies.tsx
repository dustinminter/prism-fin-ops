import PrismLayout from "@/components/PrismLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Info,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
  RefreshCw,
  ExternalLink,
  Snowflake,
  Database,
  Shield,
  Clock,
  User,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Anomalies() {
  const { isAuthenticated, user } = useAuth();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [acknowledgeReason, setAcknowledgeReason] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);

  const { data: anomalies, isLoading, refetch, isFetching } = trpc.prism.getSpendingAnomalies.useQuery({
    severityFilter: severityFilter === "all" ? undefined : severityFilter,
  });

  const acknowledgeMutation = trpc.prism.acknowledgeAnomaly.useMutation({
    onSuccess: () => {
      toast.success("Anomaly acknowledged and logged to governance audit trail");
      setSelectedAnomaly(null);
      setAcknowledgeReason("");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to acknowledge anomaly: " + error.message);
    },
  });

  const criticalCount = anomalies?.filter((a) => a.severity === "critical").length || 0;
  const warningCount = anomalies?.filter((a) => a.severity === "warning").length || 0;
  const infoCount = anomalies?.filter((a) => a.severity === "info").length || 0;

  const handleAcknowledge = () => {
    if (selectedAnomaly) {
      acknowledgeMutation.mutate({
        anomalyId: selectedAnomaly.id,
        reason: acknowledgeReason,
      });
    }
  };

  const openInSnowflakeIntelligence = () => {
    const params = new URLSearchParams();
    params.set("source", "prism_anomalies");
    if (severityFilter) params.set("severity", severityFilter);
    
    const snowflakeUrl = `https://app.snowflake.com/${import.meta.env.VITE_SNOWFLAKE_ACCOUNT || ""}#/intelligence?${params.toString()}`;
    window.open(snowflakeUrl, "_blank");
  };

  return (
    <PrismLayout title="Spending Anomalies">
      <div className="container py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SeverityCard
            severity="critical"
            count={criticalCount}
            icon={XCircle}
            description=">50% deviation - Immediate attention"
          />
          <SeverityCard
            severity="warning"
            count={warningCount}
            icon={AlertTriangle}
            description="30-50% deviation - Review recommended"
          />
          <SeverityCard
            severity="info"
            count={infoCount}
            icon={Info}
            description="20-30% deviation - For awareness"
          />
        </div>

        {/* Cortex Detection Info */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-[#58a6ff] flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-[#c9d1d9]">
                    Anomalies detected using <span className="font-mono text-[#58a6ff]">Cortex ANOMALY_DETECTION</span>
                  </p>
                  <p className="text-[#8b949e] mt-1">
                    Statistical analysis identifies spending deviations &gt;20% from expected baseline using z-score methodology
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInSnowflakeIntelligence}
                  className="border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  Open in Snowflake
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#8b949e]" />
                <span className="text-sm text-[#8b949e]">Filter by severity:</span>
              </div>
              <Select value={severityFilter || "all"} onValueChange={(v) => setSeverityFilter(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-[180px] bg-[#0d1117] border-[#30363d]">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b22] border-[#30363d]">
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                  <SelectItem value="warning">Warning only</SelectItem>
                  <SelectItem value="info">Info only</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <span className="text-sm text-[#8b949e]">
                Showing {anomalies?.length || 0} anomalies
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies List */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#c9d1d9]">Detected Anomalies</CardTitle>
                <CardDescription className="text-[#8b949e]">
                  Spending deviations exceeding 20% from expected baseline
                </CardDescription>
              </div>
              {isAuthenticated && (
                <Badge variant="outline" className="border-[#30363d] text-[#8b949e]">
                  <Shield className="h-3 w-3 mr-1" />
                  Governance Enabled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-[#21262d]" />
                ))}
              </div>
            ) : anomalies?.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[#3fb950]" />
                <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">No Anomalies Found</h3>
                <p className="text-[#8b949e]">All spending patterns are within expected ranges</p>
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies?.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    onInvestigate={() => setSelectedAnomaly(anomaly)}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investigate/Acknowledge Dialog */}
        <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
          <DialogContent className="bg-[#161b22] border-[#30363d] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#c9d1d9]">Investigate Anomaly</DialogTitle>
              <DialogDescription className="text-[#8b949e]">
                Review the anomaly details and acknowledge if resolved. Actions are logged to the governance audit trail.
              </DialogDescription>
            </DialogHeader>

            {selectedAnomaly && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <div className="flex items-center gap-2 mb-3">
                    <SeverityBadge severity={selectedAnomaly.severity} />
                    <span className="text-sm text-[#8b949e]">{selectedAnomaly.type}</span>
                  </div>
                  <h4 className="font-semibold text-[#c9d1d9] mb-2">{selectedAnomaly.agency}</h4>
                  <p className="text-sm text-[#8b949e] mb-4">{selectedAnomaly.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[#8b949e]">Expected:</span>
                      <span className="ml-2 font-mono text-[#c9d1d9]">
                        ${(selectedAnomaly.expectedValue / 1e6).toFixed(2)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8b949e]">Actual:</span>
                      <span className="ml-2 font-mono text-[#c9d1d9]">
                        ${(selectedAnomaly.actualValue / 1e6).toFixed(2)}M
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8b949e]">Deviation:</span>
                      <span
                        className={`ml-2 font-mono ${
                          selectedAnomaly.deviation > 0 ? "text-[#f85149]" : "text-[#3fb950]"
                        }`}
                      >
                        {selectedAnomaly.deviation > 0 ? "+" : ""}
                        {selectedAnomaly.deviation.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8b949e]">Detected:</span>
                      <span className="ml-2 text-[#c9d1d9]">{selectedAnomaly.detectedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Governance Info */}
                <div className="p-3 rounded-lg bg-[#0d1117]/50 border border-[#30363d]">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Shield className="h-4 w-4 text-[#58a6ff]" />
                    <span>
                      Acknowledging this anomaly will log to{" "}
                      <span className="font-mono text-[#c9d1d9]">GOVERNANCE.ANOMALY_AUDIT</span>
                    </span>
                  </div>
                </div>

                {isAuthenticated ? (
                  <div>
                    <label className="text-sm text-[#8b949e] mb-2 block">
                      Acknowledgment reason (optional)
                    </label>
                    <Textarea
                      value={acknowledgeReason}
                      onChange={(e) => setAcknowledgeReason(e.target.value)}
                      placeholder="Enter reason for acknowledging this anomaly..."
                      className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder:text-[#6e7681]"
                      rows={3}
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[#d29922]/10 border border-[#d29922]/30">
                    <div className="flex items-center gap-2 text-[#d29922]">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Sign in to acknowledge anomalies</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Link href={`/agency/${selectedAnomaly.agencyCode}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Agency Details
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedAnomaly(null)}
                className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
              >
                Cancel
              </Button>
              {isAuthenticated ? (
                <Button
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                  className="bg-[#3fb950] text-[#0d1117] hover:bg-[#3fb950]/80"
                >
                  {acknowledgeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Acknowledging...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </>
                  )}
                </Button>
              ) : (
                <Button asChild className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd]">
                  <a href={getLoginUrl()}>Sign In to Acknowledge</a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PrismLayout>
  );
}

function SeverityCard({
  severity,
  count,
  icon: Icon,
  description,
}: {
  severity: "critical" | "warning" | "info";
  count: number;
  icon: React.ElementType;
  description: string;
}) {
  const colors = {
    critical: { bg: "bg-severity-critical", text: "text-[#f85149]", border: "border-[#f85149]" },
    warning: { bg: "bg-severity-warning", text: "text-[#d29922]", border: "border-[#d29922]" },
    info: { bg: "bg-severity-info", text: "text-[#58a6ff]", border: "border-[#58a6ff]" },
  };

  return (
    <Card className={`${colors[severity].bg} ${colors[severity].border} border`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${colors[severity].text} mb-1 capitalize`}>{severity}</p>
            <p className="text-3xl font-bold text-[#c9d1d9]">{count}</p>
            <p className="text-xs text-[#8b949e] mt-1">{description}</p>
          </div>
          <Icon className={`h-8 w-8 ${colors[severity].text}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function AnomalyCard({
  anomaly,
  onInvestigate,
  isAuthenticated,
}: {
  anomaly: any;
  onInvestigate: () => void;
  isAuthenticated: boolean;
}) {
  const isPositive = anomaly.deviation > 0;

  return (
    <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff]/50 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <SeverityBadge severity={anomaly.severity} />
            <span className="text-xs text-[#8b949e]">{anomaly.type}</span>
            <span className="text-xs text-[#6e7681]">•</span>
            <span className="text-xs text-[#6e7681] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {anomaly.detectedAt}
            </span>
          </div>
          <h4 className="font-semibold text-[#c9d1d9] mb-1">{anomaly.agency}</h4>
          <p className="text-sm text-[#8b949e]">{anomaly.description}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-[#8b949e] mb-1">Expected</p>
            <p className="font-mono text-sm text-[#c9d1d9]">
              ${(anomaly.expectedValue / 1e6).toFixed(1)}M
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#8b949e] mb-1">Actual</p>
            <p className="font-mono text-sm text-[#c9d1d9]">
              ${(anomaly.actualValue / 1e6).toFixed(1)}M
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#8b949e] mb-1">Deviation</p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-[#f85149]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#3fb950]" />
              )}
              <span
                className={`font-mono text-sm font-semibold ${
                  isPositive ? "text-[#f85149]" : "text-[#3fb950]"
                }`}
              >
                {isPositive ? "+" : ""}
                {anomaly.deviation.toFixed(1)}%
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onInvestigate}
            className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
          >
            <Search className="h-4 w-4 mr-1" />
            Investigate
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const colors = {
    critical: "bg-[#f85149]/20 text-[#f85149] border-[#f85149]",
    warning: "bg-[#d29922]/20 text-[#d29922] border-[#d29922]",
    info: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
  };

  return (
    <Badge variant="outline" className={`${colors[severity]} capitalize text-xs`}>
      {severity}
    </Badge>
  );
}
