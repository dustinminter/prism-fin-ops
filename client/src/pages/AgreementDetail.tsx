import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  Edit,
  FileText,
  History,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export default function AgreementDetail() {
  const params = useParams<{ id: string }>();
  const agreementId = params.id;

  const { data: agreement, isLoading: loadingAgreement } = trpc.governance.getAgreementById.useQuery(
    { agreementId: agreementId || "" },
    { enabled: !!agreementId }
  );

  const { data: clauses, isLoading: loadingClauses } = trpc.governance.getAgreementClauses.useQuery(
    { agreementId: agreementId || "" },
    { enabled: !!agreementId }
  );

  const { data: permissions, isLoading: loadingPermissions } = trpc.governance.getPermissionsMatrix.useQuery(
    { agreementId: agreementId || "" },
    { enabled: !!agreementId }
  );

  const { data: events, isLoading: loadingEvents } = trpc.governance.getAgreementEvents.useQuery(
    { agreementId: agreementId || "" },
    { enabled: !!agreementId }
  );

  if (loadingAgreement) {
    return (
      <PrismLayout title="Agreement Detail">
        <div className="container py-8">
          <Skeleton className="h-8 w-64 bg-[#21262d] mb-6" />
          <div className="grid gap-6">
            <Skeleton className="h-48 bg-[#21262d]" />
            <Skeleton className="h-64 bg-[#21262d]" />
          </div>
        </div>
      </PrismLayout>
    );
  }

  if (!agreement) {
    return (
      <PrismLayout title="Agreement Not Found">
        <div className="container py-8">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-[#8b949e]" />
            <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">Agreement Not Found</h3>
            <p className="text-[#8b949e] mb-4">The requested agreement could not be found</p>
            <Link href="/agreements">
              <Button variant="outline" className="border-[#30363d] text-[#c9d1d9]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Agreements
              </Button>
            </Link>
          </div>
        </div>
      </PrismLayout>
    );
  }

  return (
    <PrismLayout title="">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#8b949e] mb-6">
          <Link href="/agreements" className="hover:text-[#58a6ff]">
            Agreements
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#c9d1d9]">{agreement.agreementId}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TypeBadge type={agreement.agreementType} />
              <StatusBadge status={agreement.status} />
              <AIBadge enabled={agreement.aiProcessingAllowed} />
            </div>
            <h1 className="text-2xl font-bold text-[#c9d1d9] mb-2">{agreement.agreementTitle}</h1>
            <p className="text-[#8b949e]">
              {agreement.counterpartyType} Agreement with {agreement.counterpartyName}
            </p>
          </div>

          <div className="flex gap-3">
            <RequestAmendmentDialog agreementId={agreementId || ""} agreementTitle={agreement.agreementTitle} />
            <Button variant="outline" className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details and Permissions */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="permissions" className="space-y-6">
              <TabsList className="bg-[#161b22] border border-[#30363d]">
                <TabsTrigger value="permissions" className="data-[state=active]:bg-[#21262d]">
                  Permissions Matrix
                </TabsTrigger>
                <TabsTrigger value="clauses" className="data-[state=active]:bg-[#21262d]">
                  Clauses
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-[#21262d]">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permissions">
                <PermissionsMatrixCard permissions={permissions} loading={loadingPermissions} />
              </TabsContent>

              <TabsContent value="clauses">
                <ClausesCard clauses={clauses || []} loading={loadingClauses} />
              </TabsContent>

              <TabsContent value="history">
                <HistoryCard events={events || []} loading={loadingEvents} />
              </TabsContent>
            </Tabs>

            {/* Agreement Details */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-[#c9d1d9]">Agreement Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <DetailItem label="Agreement ID" value={agreement.agreementId} mono />
                  <DetailItem label="Owner Organization" value={agreement.ownerOrg} />
                  <DetailItem label="Agreement Owner" value={agreement.agreementOwner} />
                  <DetailItem label="Counterparty" value={agreement.counterpartyName} />
                  <DetailItem label="Effective Date" value={agreement.effectiveDate} />
                  <DetailItem
                    label="Expiration Date"
                    value={agreement.expirationDate || "Perpetual"}
                  />
                  <DetailItem
                    label="Data Classification"
                    value={agreement.dataClassificationMax}
                  />
                  <DetailItem
                    label="Days Until Expiration"
                    value={
                      agreement.daysUntilExpiration !== null
                        ? agreement.daysUntilExpiration.toString()
                        : "N/A"
                    }
                    highlight={
                      agreement.daysUntilExpiration !== null && agreement.daysUntilExpiration <= 30
                    }
                  />
                </div>

                <Separator className="my-6 bg-[#30363d]" />

                <div>
                  <h4 className="text-sm font-medium text-[#8b949e] mb-3">Data Domains</h4>
                  <div className="flex flex-wrap gap-2">
                    {agreement.dataDomains.map((domain: string) => (
                      <Badge
                        key={domain}
                        variant="outline"
                        className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9]"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>

                {agreement.aiRestrictionsSummary && (
                  <>
                    <Separator className="my-6 bg-[#30363d]" />
                    <div>
                      <h4 className="text-sm font-medium text-[#8b949e] mb-3">AI Restrictions Summary</h4>
                      <p className="text-sm text-[#c9d1d9] bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                        {agreement.aiRestrictionsSummary}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <AgreementChat agreementId={agreementId || ""} />
          </div>
        </div>
      </div>
    </PrismLayout>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function PermissionsMatrixCard({
  permissions,
  loading,
}: {
  permissions: any;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="pt-6">
          <Skeleton className="h-64 bg-[#21262d]" />
        </CardContent>
      </Card>
    );
  }

  if (!permissions) {
    return (
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="pt-6">
          <p className="text-[#8b949e] text-center py-8">No compiled policy available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader>
        <CardTitle className="text-[#c9d1d9]">Permissions Matrix</CardTitle>
        <CardDescription className="text-[#8b949e]">
          Compiled policy constraints from agreement clauses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <PermissionItem label="AI Processing" allowed={permissions.aiAllowed} />
          <PermissionItem label="PII Data" allowed={permissions.piiAllowed} />
          <PermissionItem label="PHI Data" allowed={permissions.phiAllowed} />
          <PermissionItem label="Cross-Agency Sharing" allowed={permissions.crossAgencyAllowed} />
          <PermissionItem label="External Sharing" allowed={permissions.externalSharingAllowed} />
        </div>

        <Separator className="my-6 bg-[#30363d]" />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[#8b949e] mb-2">Allowed Domains</h4>
            <div className="flex flex-wrap gap-2">
              {permissions.domainsAllowed?.length > 0 ? (
                permissions.domainsAllowed.map((domain: string) => (
                  <Badge key={domain} className="bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]">
                    <Check className="h-3 w-3 mr-1" />
                    {domain}
                  </Badge>
                ))
              ) : (
                <span className="text-[#8b949e] text-sm">All domains</span>
              )}
            </div>
          </div>

          {permissions.fieldsProhibited?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#8b949e] mb-2">Prohibited Fields</h4>
              <div className="flex flex-wrap gap-2">
                {permissions.fieldsProhibited.map((field: string) => (
                  <Badge key={field} className="bg-[#f85149]/20 text-[#f85149] border-[#f85149]">
                    <Ban className="h-3 w-3 mr-1" />
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {permissions.requirements?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#8b949e] mb-2">Requirements</h4>
              <ul className="space-y-2">
                {permissions.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#c9d1d9]">
                    <Shield className="h-4 w-4 text-[#58a6ff] mt-0.5 shrink-0" />
                    {req.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionItem({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
      <span className="text-sm text-[#c9d1d9]">{label}</span>
      {allowed ? (
        <Badge className="bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]">
          <Check className="h-3 w-3 mr-1" />
          Allowed
        </Badge>
      ) : (
        <Badge className="bg-[#f85149]/20 text-[#f85149] border-[#f85149]">
          <X className="h-3 w-3 mr-1" />
          Prohibited
        </Badge>
      )}
    </div>
  );
}

function ClausesCard({ clauses, loading }: { clauses: any[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="pt-6">
          <Skeleton className="h-64 bg-[#21262d]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader>
        <CardTitle className="text-[#c9d1d9]">Agreement Clauses</CardTitle>
        <CardDescription className="text-[#8b949e]">
          {clauses.length} clause(s) defining data use permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clauses.length === 0 ? (
          <p className="text-[#8b949e] text-center py-8">No clauses defined</p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {clauses.map((clause) => (
              <AccordionItem
                key={clause.clauseId}
                value={clause.clauseId}
                className="border border-[#30363d] rounded-lg bg-[#0d1117] px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <ClauseTypeBadge type={clause.clauseType} />
                    <span className="text-[#c9d1d9]">{clause.clauseTitle || clause.clauseType}</span>
                    {clause.sourceSection && (
                      <span className="text-xs text-[#8b949e]">Section {clause.sourceSection}</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <p className="text-sm text-[#8b949e] mb-4">{clause.clauseText}</p>
                  {clause.policyJson && (
                    <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
                      <h5 className="text-xs font-medium text-[#8b949e] mb-2">Policy Constraints</h5>
                      <pre className="text-xs text-[#58a6ff] overflow-x-auto">
                        {JSON.stringify(clause.policyJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function ClauseTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PURPOSE_LIMITATION: "bg-[#58a6ff]/20 text-[#58a6ff]",
    DATA_SCOPE: "bg-[#3fb950]/20 text-[#3fb950]",
    AI_USE: "bg-[#a371f7]/20 text-[#a371f7]",
    CROSS_SHARING: "bg-[#d29922]/20 text-[#d29922]",
    RETENTION: "bg-[#8b949e]/20 text-[#8b949e]",
  };

  return (
    <Badge variant="outline" className={`${colors[type] || colors.RETENTION} border-0 text-xs`}>
      {type.replace(/_/g, " ")}
    </Badge>
  );
}

function HistoryCard({ events, loading }: { events: any[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="pt-6">
          <Skeleton className="h-64 bg-[#21262d]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardHeader>
        <CardTitle className="text-[#c9d1d9]">Agreement History</CardTitle>
        <CardDescription className="text-[#8b949e]">
          Audit trail of agreement lifecycle events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-[#8b949e] text-center py-8">No events recorded</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-start gap-4 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]"
              >
                <div className="p-2 rounded-lg bg-[#21262d]">
                  <EventIcon type={event.eventType} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <EventTypeBadge type={event.eventType} />
                    <span className="text-xs text-[#8b949e]">
                      {new Date(event.eventAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#c9d1d9]">
                    by {event.actorId}
                    {event.actorRole && ` (${event.actorRole})`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    CREATED: FileText,
    COMPILED: Shield,
    VALIDATED: CheckCircle,
    ACTIVATED: ShieldCheck,
    POLICY_ENFORCED: Shield,
  };
  const Icon = icons[type] || History;
  return <Icon className="h-4 w-4 text-[#8b949e]" />;
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CREATED: "bg-[#58a6ff]/20 text-[#58a6ff]",
    COMPILED: "bg-[#a371f7]/20 text-[#a371f7]",
    VALIDATED: "bg-[#3fb950]/20 text-[#3fb950]",
    ACTIVATED: "bg-[#3fb950]/20 text-[#3fb950]",
    POLICY_ENFORCED: "bg-[#d29922]/20 text-[#d29922]",
  };

  return (
    <Badge variant="outline" className={`${colors[type] || "bg-[#8b949e]/20 text-[#8b949e]"} border-0 text-xs`}>
      {type}
    </Badge>
  );
}

function DetailItem({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-[#8b949e] mb-1">{label}</p>
      <p
        className={`text-[#c9d1d9] ${mono ? "font-mono text-sm" : ""} ${
          highlight ? "text-[#d29922]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AgreementChat({ agreementId }: { agreementId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.governance.askAboutAgreement.useMutation({
    onSuccess: (response: ChatMessage) => {
      setMessages((prev) => [...prev, response]);
    },
    onError: () => {
      toast.error("Failed to get response");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || askMutation.isPending) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    askMutation.mutate({
      agreementId,
      question: input,
      conversationHistory: [...messages, userMessage],
    });
  };

  return (
    <Card className="bg-[#161b22] border-[#30363d] h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#c9d1d9] flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#58a6ff]" />
          Ask About This Agreement
        </CardTitle>
        <CardDescription className="text-[#8b949e]">
          Get answers about permissions, restrictions, and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 pr-4 -mr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-10 w-10 mx-auto mb-3 text-[#8b949e]" />
                <p className="text-[#8b949e] text-sm mb-4">
                  Ask questions about this agreement
                </p>
                <div className="space-y-2">
                  {[
                    "Is AI processing allowed?",
                    "What data domains are covered?",
                    "Can I share data cross-agency?",
                    "When does this agreement expire?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="block w-full text-left text-sm text-[#58a6ff] hover:text-[#388bfd] p-2 rounded-lg hover:bg-[#21262d] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="p-2 rounded-lg bg-[#58a6ff]/20 h-fit">
                      <Bot className="h-4 w-4 text-[#58a6ff]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-[#238636] text-white"
                        : "bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#30363d]">
                        <p className="text-xs text-[#8b949e] mb-1">Citations:</p>
                        {msg.citations.map((cite, j) => (
                          <p key={j} className="text-xs text-[#58a6ff]">
                            {cite}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="p-2 rounded-lg bg-[#21262d] h-fit">
                      <User className="h-4 w-4 text-[#8b949e]" />
                    </div>
                  )}
                </div>
              ))
            )}
            {askMutation.isPending && (
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-[#58a6ff]/20 h-fit">
                  <Bot className="h-4 w-4 text-[#58a6ff]" />
                </div>
                <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-[#8b949e] rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9]"
            disabled={askMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || askMutation.isPending}
            className="bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestAmendmentDialog({
  agreementId,
  agreementTitle,
}: {
  agreementId: string;
  agreementTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [amendmentType, setAmendmentType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");

  const createMutation = trpc.governance.createAmendmentRequest.useMutation({
    onSuccess: () => {
      toast.success("Amendment request submitted");
      setOpen(false);
      setAmendmentType("");
      setDescription("");
      setJustification("");
    },
    onError: () => {
      toast.error("Failed to submit request");
    },
  });

  const handleSubmit = () => {
    if (!amendmentType || !description || !justification) {
      toast.error("Please fill in all fields");
      return;
    }

    createMutation.mutate({
      agreementId,
      requestedBy: "current-user@mass.gov", // Would come from auth context
      requestedAt: new Date().toISOString(),
      amendmentType: amendmentType as any,
      description,
      justification,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]">
          <FileText className="h-4 w-4 mr-2" />
          Request Amendment
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#161b22] border-[#30363d]">
        <DialogHeader>
          <DialogTitle className="text-[#c9d1d9]">Request Amendment</DialogTitle>
          <DialogDescription className="text-[#8b949e]">
            Submit a request to modify {agreementTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm text-[#8b949e] mb-2 block">Amendment Type</label>
            <Select value={amendmentType} onValueChange={setAmendmentType}>
              <SelectTrigger className="bg-[#0d1117] border-[#30363d]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                <SelectItem value="EXPAND_DOMAINS">Expand Data Domains</SelectItem>
                <SelectItem value="ENABLE_AI">Enable AI Processing</SelectItem>
                <SelectItem value="EXTEND_EXPIRATION">Extend Expiration</SelectItem>
                <SelectItem value="MODIFY_SHARING">Modify Sharing Rules</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-[#8b949e] mb-2 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the requested change"
              className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9]"
            />
          </div>

          <div>
            <label className="text-sm text-[#8b949e] mb-2 block">Business Justification</label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this amendment is needed..."
              className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9] min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            {createMutation.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reuse badges from Agreements page
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DULA: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
    MOU: "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]",
    ADDENDUM: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
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
      AI Enabled
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e] gap-1">
      <Bot className="h-3 w-3" />
      AI Disabled
    </Badge>
  );
}
