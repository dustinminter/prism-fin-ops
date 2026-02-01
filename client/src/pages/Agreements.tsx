import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

// Types for governance data
interface Agreement {
  agreementId: string;
  agreementType: "MOU" | "DULA" | "ADDENDUM" | "AMENDMENT" | "APPENDIX";
  agreementTitle: string;
  counterpartyName: string;
  status: "DRAFT" | "IN_REVIEW" | "EXECUTED" | "EXPIRED" | "SUPERSEDED" | "TERMINATED";
  aiProcessingAllowed: boolean;
  expirationDate: string | null;
  daysUntilExpiration: number | null;
  expirationStatus: string;
}

interface EnforcementLogEntry {
  logId: string;
  requestTimestamp: string;
  userId: string;
  agencyContext: string | null;
  agreementIdSelected: string | null;
  decision: "ALLOWED" | "DENIED" | "DEGRADED";
  decisionReason: string | null;
  trustStateOutput: string | null;
}

export default function Agreements() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: agreements, isLoading } = trpc.governance.getAgreements.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    agreementType: typeFilter === "all" ? undefined : typeFilter,
  });

  const { data: stats } = trpc.governance.getAgreementStats.useQuery();

  const filteredAgreements = agreements?.filter((a: Agreement) =>
    searchQuery
      ? a.agreementTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.counterpartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.agreementId.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <PrismLayout title="Agreement Intelligence">
      <div className="container py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Agreements"
            value={stats?.total || 0}
            icon={FileText}
            color="blue"
          />
          <StatsCard
            title="Active"
            value={stats?.active || 0}
            icon={ShieldCheck}
            color="green"
          />
          <StatsCard
            title="Expiring Soon"
            value={stats?.expiringSoon || 0}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="AI Enabled"
            value={stats?.aiEnabled || 0}
            icon={Bot}
            color="purple"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="library" className="space-y-6">
          <TabsList className="bg-[#161b22] border border-[#30363d]">
            <TabsTrigger value="library" className="data-[state=active]:bg-[#21262d]">
              Agreement Library
            </TabsTrigger>
            <TabsTrigger value="enforcement" className="data-[state=active]:bg-[#21262d]">
              Enforcement Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-6">
            {/* Filters and Actions */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <div className="relative flex-1 w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b949e]" />
                    <Input
                      placeholder="Search agreements..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#0d1117] border-[#30363d] text-[#c9d1d9]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-[#8b949e]" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px] bg-[#0d1117] border-[#30363d]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161b22] border-[#30363d]">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="EXECUTED">Executed</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[150px] bg-[#0d1117] border-[#30363d]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161b22] border-[#30363d]">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="DULA">DULA</SelectItem>
                        <SelectItem value="MOU">MOU</SelectItem>
                        <SelectItem value="ADDENDUM">Addendum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1" />

                  <Link href="/agreements/new">
                    <Button className="bg-[#238636] hover:bg-[#2ea043] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Draft Agreement
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Agreements Table */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-[#c9d1d9]">Data Use Agreements</CardTitle>
                <CardDescription className="text-[#8b949e]">
                  MOUs and DULAs governing PRISM data access and AI usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 bg-[#21262d]" />
                    ))}
                  </div>
                ) : filteredAgreements?.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-[#8b949e]" />
                    <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">No Agreements Found</h3>
                    <p className="text-[#8b949e]">No agreements match your current filters</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#30363d] hover:bg-transparent">
                        <TableHead className="text-[#8b949e]">Agreement</TableHead>
                        <TableHead className="text-[#8b949e]">Type</TableHead>
                        <TableHead className="text-[#8b949e]">Counterparty</TableHead>
                        <TableHead className="text-[#8b949e]">Status</TableHead>
                        <TableHead className="text-[#8b949e]">AI</TableHead>
                        <TableHead className="text-[#8b949e]">Expiration</TableHead>
                        <TableHead className="text-[#8b949e]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgreements?.map((agreement: Agreement) => (
                        <TableRow
                          key={agreement.agreementId}
                          className="border-[#30363d] hover:bg-[#21262d]/50"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-[#c9d1d9] truncate max-w-xs">
                                {agreement.agreementTitle}
                              </p>
                              <p className="text-xs text-[#8b949e] font-mono">
                                {agreement.agreementId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={agreement.agreementType} />
                          </TableCell>
                          <TableCell className="text-[#c9d1d9]">
                            {agreement.counterpartyName}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={agreement.status} />
                          </TableCell>
                          <TableCell>
                            <AIBadge enabled={agreement.aiProcessingAllowed} />
                          </TableCell>
                          <TableCell>
                            <ExpirationBadge
                              status={agreement.expirationStatus}
                              days={agreement.daysUntilExpiration}
                              date={agreement.expirationDate}
                            />
                          </TableCell>
                          <TableCell>
                            <Link href={`/agreements/${agreement.agreementId}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#58a6ff] hover:text-[#58a6ff] hover:bg-[#21262d]"
                              >
                                View
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enforcement">
            <EnforcementLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </PrismLayout>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colors = {
    blue: "text-[#58a6ff] bg-[#58a6ff]/10",
    green: "text-[#3fb950] bg-[#3fb950]/10",
    yellow: "text-[#d29922] bg-[#d29922]/10",
    purple: "text-[#a371f7] bg-[#a371f7]/10",
  };

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8b949e]">{title}</p>
            <p className="text-2xl font-bold text-[#c9d1d9]">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DULA: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
    MOU: "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]",
    ADDENDUM: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
    AMENDMENT: "bg-[#d29922]/20 text-[#d29922] border-[#d29922]",
    APPENDIX: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
  };

  return (
    <Badge variant="outline" className={colors[type] || colors.ADDENDUM}>
      {type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    EXECUTED: { color: "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]", icon: CheckCircle },
    DRAFT: { color: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]", icon: FileText },
    IN_REVIEW: { color: "bg-[#d29922]/20 text-[#d29922] border-[#d29922]", icon: Clock },
    EXPIRED: { color: "bg-[#f85149]/20 text-[#f85149] border-[#f85149]", icon: XCircle },
    SUPERSEDED: { color: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]", icon: FileText },
    TERMINATED: { color: "bg-[#f85149]/20 text-[#f85149] border-[#f85149]", icon: XCircle },
  };

  const { color, icon: Icon } = config[status] || config.DRAFT;

  return (
    <Badge variant="outline" className={`${color} gap-1`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function AIBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge variant="outline" className="bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7] gap-1">
      <Bot className="h-3 w-3" />
      Enabled
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e] gap-1">
      <Bot className="h-3 w-3" />
      Disabled
    </Badge>
  );
}

function ExpirationBadge({
  status,
  days,
  date,
}: {
  status: string;
  days: number | null;
  date: string | null;
}) {
  if (!date) {
    return (
      <span className="text-sm text-[#8b949e]">Perpetual</span>
    );
  }

  if (status === "EXPIRED" || (days !== null && days < 0)) {
    return (
      <Badge variant="outline" className="bg-[#f85149]/20 text-[#f85149] border-[#f85149] gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  if (status === "EXPIRING_SOON" || (days !== null && days <= 30)) {
    return (
      <Badge variant="outline" className="bg-[#d29922]/20 text-[#d29922] border-[#d29922] gap-1">
        <Clock className="h-3 w-3" />
        {days} days
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm text-[#8b949e]">
      <Calendar className="h-3 w-3" />
      {date}
    </div>
  );
}

function EnforcementLogTab() {
  const { data: log, isLoading } = trpc.governance.getEnforcementLog.useQuery({
    limit: 50,
  });

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader>
        <CardTitle className="text-[#c9d1d9]">Policy Enforcement Log</CardTitle>
        <CardDescription className="text-[#8b949e]">
          Audit trail of all policy enforcement decisions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 bg-[#21262d]" />
            ))}
          </div>
        ) : log?.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-[#8b949e]" />
            <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">No Enforcement Events</h3>
            <p className="text-[#8b949e]">Policy enforcement events will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#30363d] hover:bg-transparent">
                <TableHead className="text-[#8b949e]">Timestamp</TableHead>
                <TableHead className="text-[#8b949e]">User</TableHead>
                <TableHead className="text-[#8b949e]">Context</TableHead>
                <TableHead className="text-[#8b949e]">Agreement</TableHead>
                <TableHead className="text-[#8b949e]">Decision</TableHead>
                <TableHead className="text-[#8b949e]">Trust State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log?.map((entry: EnforcementLogEntry) => (
                <TableRow
                  key={entry.logId}
                  className="border-[#30363d] hover:bg-[#21262d]/50"
                >
                  <TableCell className="text-[#8b949e] text-sm">
                    {new Date(entry.requestTimestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-[#c9d1d9]">{entry.userId}</TableCell>
                  <TableCell className="text-[#c9d1d9]">
                    {entry.agencyContext || "-"}
                  </TableCell>
                  <TableCell className="text-[#8b949e] font-mono text-xs">
                    {entry.agreementIdSelected || "-"}
                  </TableCell>
                  <TableCell>
                    <DecisionBadge decision={entry.decision} />
                  </TableCell>
                  <TableCell>
                    {entry.trustStateOutput ? (
                      <TrustStateBadge state={entry.trustStateOutput} />
                    ) : (
                      <span className="text-[#8b949e]">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    ALLOWED: { color: "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]", icon: ShieldCheck },
    DENIED: { color: "bg-[#f85149]/20 text-[#f85149] border-[#f85149]", icon: ShieldAlert },
    DEGRADED: { color: "bg-[#d29922]/20 text-[#d29922] border-[#d29922]", icon: Shield },
  };

  const { color, icon: Icon } = config[decision] || config.ALLOWED;

  return (
    <Badge variant="outline" className={`${color} gap-1`}>
      <Icon className="h-3 w-3" />
      {decision}
    </Badge>
  );
}

function TrustStateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
    INTERNAL: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
    CLIENT: "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]",
    EXECUTIVE: "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]",
  };

  return (
    <Badge variant="outline" className={colors[state] || colors.DRAFT}>
      {state}
    </Badge>
  );
}
