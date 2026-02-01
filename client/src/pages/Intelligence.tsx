import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle,
  Database,
  FileText,
  Lock,
  Shield,
  ShieldCheck,
  Snowflake,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

// Types
interface Agreement {
  agreementId: string;
  agreementTitle: string;
  status: string;
  aiProcessingAllowed: boolean;
}

interface EnforcementLogEntry {
  logId: string;
  requestTimestamp: string;
  userId: string;
  agencyContext: string | null;
  decision: string;
  trustStateOutput: string | null;
}

export default function Intelligence() {
  const { data: agreements } = trpc.governance.getAgreements.useQuery();
  const { data: stats } = trpc.governance.getAgreementStats.useQuery();
  const { data: enforcementLog } = trpc.governance.getEnforcementLog.useQuery();

  const activeAgreements = agreements?.filter((a: Agreement) => a.status === "EXECUTED") || [];
  const aiEnabledCount = agreements?.filter((a: Agreement) => a.aiProcessingAllowed).length || 0;

  return (
    <PrismLayout title="Snowflake Intelligence Hub">
      <div className="container py-8">
        {/* Hero Banner */}
        <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-[#58a6ff]/20 via-[#a371f7]/10 to-[#3fb950]/20 border border-[#30363d]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-lg bg-[#58a6ff]/20">
              <Snowflake className="h-8 w-8 text-[#58a6ff]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#c9d1d9]">Cortex AI-Powered Governance</h2>
              <p className="text-[#8b949e]">Real-time policy enforcement with the Governance Triangle</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]">
              <CheckCircle className="h-3 w-3 mr-1" />
              Triangle Closed
            </Badge>
            <Badge className="bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]">
              <Database className="h-3 w-3 mr-1" />
              Snowflake Connected
            </Badge>
            <Badge className="bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]">
              <Bot className="h-3 w-3 mr-1" />
              Cortex AI Active
            </Badge>
          </div>
        </div>

        {/* Governance Triangle Visualization */}
        <Card className="bg-[#161b22] border-[#30363d] mb-8">
          <CardHeader>
            <CardTitle className="text-[#c9d1d9] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#58a6ff]" />
              The Governance Triangle
            </CardTitle>
            <CardDescription className="text-[#8b949e]">
              Integrated control loop ensuring every action is authenticated, authorized, and audited
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Identity Leg */}
              <div className="p-6 rounded-lg border border-[#30363d] bg-[#0d1117] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#58a6ff] to-[#58a6ff]/50" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#58a6ff]/20">
                    <User className="h-5 w-5 text-[#58a6ff]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#c9d1d9]">IDENTITY</h3>
                    <p className="text-xs text-[#8b949e]">SSO + Role Mapping</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-[#8b949e]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    State IdP Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Deterministic Role Resolution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Session Attribution
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">Status</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]">VERIFIED</Badge>
                  </div>
                </div>
              </div>

              {/* Authorization Leg */}
              <div className="p-6 rounded-lg border border-[#30363d] bg-[#0d1117] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#a371f7] to-[#a371f7]/50" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#a371f7]/20">
                    <ShieldCheck className="h-5 w-5 text-[#a371f7]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#c9d1d9]">AUTHORIZATION</h3>
                    <p className="text-xs text-[#8b949e]">DULA Enforcement</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-[#8b949e]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    {stats?.total || 0} Agreements Loaded
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Policy Compilation Active
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Clause-Level Enforcement
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">Active DULAs</span>
                    <Badge className="bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]">{stats?.active || 0}</Badge>
                  </div>
                </div>
              </div>

              {/* Isolation Leg */}
              <div className="p-6 rounded-lg border border-[#30363d] bg-[#0d1117] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3fb950] to-[#3fb950]/50" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#3fb950]/20">
                    <Lock className="h-5 w-5 text-[#3fb950]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#c9d1d9]">ISOLATION</h3>
                    <p className="text-xs text-[#8b949e]">Snowflake RLS</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-[#8b949e]">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Row Access Policies
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Database-Enforced Boundaries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#3fb950]" />
                    Cross-Agency Blocked
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8b949e]">RLS Status</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]">ENFORCED</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Triangle Diagram */}
            <div className="mt-8 flex justify-center">
              <div className="relative w-80 h-64">
                <svg viewBox="0 0 320 260" className="w-full h-full">
                  {/* Triangle */}
                  <polygon
                    points="160,20 40,220 280,220"
                    fill="none"
                    stroke="#30363d"
                    strokeWidth="2"
                  />
                  {/* Center circle */}
                  <circle cx="160" cy="150" r="40" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                  <text x="160" y="145" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">TRIANGLE</text>
                  <text x="160" y="160" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">CLOSED</text>

                  {/* Vertices */}
                  <circle cx="160" cy="30" r="25" fill="#58a6ff" fillOpacity="0.2" stroke="#58a6ff" strokeWidth="2" />
                  <text x="160" y="35" textAnchor="middle" fill="#58a6ff" fontSize="10">SSO</text>

                  <circle cx="50" cy="210" r="25" fill="#a371f7" fillOpacity="0.2" stroke="#a371f7" strokeWidth="2" />
                  <text x="50" y="215" textAnchor="middle" fill="#a371f7" fontSize="10">DULA</text>

                  <circle cx="270" cy="210" r="25" fill="#3fb950" fillOpacity="0.2" stroke="#3fb950" strokeWidth="2" />
                  <text x="270" y="215" textAnchor="middle" fill="#3fb950" fontSize="10">RLS</text>

                  {/* Connecting lines to center */}
                  <line x1="160" y1="55" x2="160" y2="110" stroke="#58a6ff" strokeWidth="1" strokeDasharray="4" />
                  <line x1="70" y1="195" x2="125" y2="165" stroke="#a371f7" strokeWidth="1" strokeDasharray="4" />
                  <line x1="250" y1="195" x2="195" y2="165" stroke="#3fb950" strokeWidth="1" strokeDasharray="4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust State Workflow */}
        <Card className="bg-[#161b22] border-[#30363d] mb-8">
          <CardHeader>
            <CardTitle className="text-[#c9d1d9] flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#a371f7]" />
              AI Trust State Workflow
            </CardTitle>
            <CardDescription className="text-[#8b949e]">
              Human-in-the-loop governance for AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-[#0d1117] rounded-lg">
              <TrustStateStep
                state="DRAFT"
                icon={Bot}
                color="#8b949e"
                description="AI-generated, unvalidated"
                active
              />
              <ArrowRight className="h-5 w-5 text-[#30363d] hidden md:block" />
              <TrustStateStep
                state="INTERNAL"
                icon={User}
                color="#58a6ff"
                description="Analyst-reviewed"
              />
              <ArrowRight className="h-5 w-5 text-[#30363d] hidden md:block" />
              <TrustStateStep
                state="CLIENT"
                icon={Users}
                color="#a371f7"
                description="Stakeholder-approved"
              />
              <ArrowRight className="h-5 w-5 text-[#30363d] hidden md:block" />
              <TrustStateStep
                state="EXECUTIVE"
                icon={ShieldCheck}
                color="#3fb950"
                description="Leadership-ready"
                requiresHitl
              />
            </div>
            <p className="mt-4 text-sm text-[#8b949e] text-center">
              Per DULA clause 6.1: Executive-level content requires human review before promotion
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Active Agreements"
            value={stats?.active || 0}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="AI-Enabled"
            value={aiEnabledCount}
            icon={Bot}
            color="purple"
          />
          <StatCard
            title="Enforcement Events"
            value={enforcementLog?.length || 0}
            icon={Activity}
            color="green"
          />
          <StatCard
            title="Expiring Soon"
            value={stats?.expiringSoon || 0}
            icon={AlertTriangle}
            color="yellow"
          />
        </div>

        {/* Recent Enforcement Decisions */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#c9d1d9]">Recent Policy Enforcement</CardTitle>
              <CardDescription className="text-[#8b949e]">
                Real-time decisions from the governance engine
              </CardDescription>
            </div>
            <Link href="/agreements">
              <Button variant="outline" size="sm" className="border-[#30363d] text-[#8b949e]">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enforcementLog?.slice(0, 5).map((entry: EnforcementLogEntry) => (
                <div
                  key={entry.logId}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]"
                >
                  <div className="flex items-center gap-3">
                    <DecisionIcon decision={entry.decision} />
                    <div>
                      <p className="text-sm text-[#c9d1d9]">{entry.userId}</p>
                      <p className="text-xs text-[#8b949e]">
                        {entry.agencyContext ? `Agency: ${entry.agencyContext}` : 'System request'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.trustStateOutput && (
                      <Badge variant="outline" className={getTrustStateColor(entry.trustStateOutput)}>
                        {entry.trustStateOutput}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={getDecisionColor(entry.decision)}
                    >
                      {entry.decision}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PrismLayout>
  );
}

function TrustStateStep({
  state,
  icon: Icon,
  color,
  description,
  active,
  requiresHitl,
}: {
  state: string;
  icon: React.ElementType;
  color: string;
  description: string;
  active?: boolean;
  requiresHitl?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center p-4 rounded-lg ${active ? 'bg-[#21262d]' : ''}`}>
      <div
        className="p-3 rounded-full mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <span className="font-semibold text-[#c9d1d9]">{state}</span>
      <span className="text-xs text-[#8b949e] text-center">{description}</span>
      {requiresHitl && (
        <Badge className="mt-2 bg-[#d29922]/20 text-[#d29922] border-[#d29922]" variant="outline">
          HITL Required
        </Badge>
      )}
    </div>
  );
}

function StatCard({
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

function DecisionIcon({ decision }: { decision: string }) {
  if (decision === "ALLOWED") {
    return <ShieldCheck className="h-5 w-5 text-[#3fb950]" />;
  }
  if (decision === "DENIED") {
    return <Shield className="h-5 w-5 text-[#f85149]" />;
  }
  return <Shield className="h-5 w-5 text-[#d29922]" />;
}

function getDecisionColor(decision: string): string {
  if (decision === "ALLOWED") return "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]";
  if (decision === "DENIED") return "bg-[#f85149]/20 text-[#f85149] border-[#f85149]";
  return "bg-[#d29922]/20 text-[#d29922] border-[#d29922]";
}

function getTrustStateColor(state: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
    INTERNAL: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
    CLIENT: "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]",
    EXECUTIVE: "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]",
  };
  return colors[state] || colors.DRAFT;
}
