import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle,
  ChevronRight,
  Database,
  FileText,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// Types
interface AgreementClause {
  clauseId: string;
  clauseType: string;
  clauseTitle: string | null;
  clauseText: string;
}

interface DraftAgreement {
  agreementId: string;
  title: string;
  suggestedClauses: AgreementClause[];
}

const DATA_DOMAINS = [
  { id: "CLOUD_COST", label: "Cloud Cost", description: "AWS, Azure, GCP billing and usage" },
  { id: "BILLING", label: "Billing", description: "Financial billing records" },
  { id: "CIP_PROGRAM", label: "CIP Program", description: "Capital improvement program data" },
  { id: "MODERNIZATION_STATUS", label: "Modernization Status", description: "Project and initiative status" },
  { id: "OPERATIONAL", label: "Operational", description: "ServiceNow, monitoring, incidents" },
  { id: "ERP_GL", label: "ERP/GL", description: "General ledger and ERP data" },
];

const AGENCIES = [
  { id: "HHS", name: "Health and Human Services" },
  { id: "DOT", name: "Department of Transportation" },
  { id: "DOE", name: "Department of Education" },
  { id: "DPS", name: "Department of Public Safety" },
  { id: "DEP", name: "Department of Environmental Protection" },
  { id: "DOR", name: "Department of Revenue" },
];

type Step = "type" | "details" | "domains" | "permissions" | "review";

export default function NewAgreement() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("type");

  // Form state
  const [agreementType, setAgreementType] = useState<"MOU" | "DULA" | "">("");
  const [agencyId, setAgencyId] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [dataDomains, setDataDomains] = useState<string[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [crossAgencySharing, setCrossAgencySharing] = useState(false);
  const [expirationMonths, setExpirationMonths] = useState(24);

  // Generated draft
  const [draft, setDraft] = useState<DraftAgreement | null>(null);

  const generateMutation = trpc.governance.generateDraftAgreement.useMutation({
    onSuccess: (data: DraftAgreement) => {
      setDraft(data);
      toast.success("Draft agreement generated");
    },
    onError: () => {
      toast.error("Failed to generate draft");
    },
  });

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: "type", label: "Agreement Type", icon: FileText },
    { id: "details", label: "Details", icon: Shield },
    { id: "domains", label: "Data Domains", icon: Database },
    { id: "permissions", label: "Permissions", icon: Bot },
    { id: "review", label: "Review", icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "type":
        return !!agreementType;
      case "details":
        return !!agencyId && !!agencyName;
      case "domains":
        return dataDomains.length > 0;
      case "permissions":
        return true;
      case "review":
        return !!draft;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (currentStep === "permissions") {
      // Generate draft
      generateMutation.mutate({
        agreementType: agreementType as "MOU" | "DULA",
        agencyId,
        agencyName,
        dataDomains,
        aiEnabled,
        crossAgencySharing,
        expirationMonths,
      });
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleAgencyChange = (id: string) => {
    setAgencyId(id);
    const agency = AGENCIES.find((a) => a.id === id);
    if (agency) {
      setAgencyName(agency.name);
    }
  };

  const toggleDomain = (domain: string) => {
    setDataDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  return (
    <PrismLayout title="">
      <div className="container py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#8b949e] mb-6">
          <Link href="/agreements" className="hover:text-[#58a6ff]">
            Agreements
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#c9d1d9]">Draft New Agreement</span>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => {
              const isActive = step.id === currentStep;
              const isComplete = i < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isComplete ? "bg-[#3fb950]" : isActive ? "bg-[#58a6ff]" : "bg-[#21262d]"}
                        ${isActive ? "ring-4 ring-[#58a6ff]/20" : ""}
                      `}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <step.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-[#8b949e]"}`} />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 ${
                        isActive ? "text-[#58a6ff]" : isComplete ? "text-[#3fb950]" : "text-[#8b949e]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-2 ${
                        isComplete ? "bg-[#3fb950]" : "bg-[#30363d]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="pt-6">
            {currentStep === "type" && (
              <StepType
                value={agreementType}
                onChange={(v) => setAgreementType(v as any)}
              />
            )}

            {currentStep === "details" && (
              <StepDetails
                agencyId={agencyId}
                agencyName={agencyName}
                expirationMonths={expirationMonths}
                onAgencyChange={handleAgencyChange}
                onAgencyNameChange={setAgencyName}
                onExpirationChange={setExpirationMonths}
              />
            )}

            {currentStep === "domains" && (
              <StepDomains
                selected={dataDomains}
                onToggle={toggleDomain}
              />
            )}

            {currentStep === "permissions" && (
              <StepPermissions
                aiEnabled={aiEnabled}
                crossAgencySharing={crossAgencySharing}
                onAiEnabledChange={setAiEnabled}
                onCrossAgencySharingChange={setCrossAgencySharing}
              />
            )}

            {currentStep === "review" && (
              <StepReview
                draft={draft}
                loading={generateMutation.isPending}
                agreementType={agreementType}
                agencyName={agencyName}
                dataDomains={dataDomains}
                aiEnabled={aiEnabled}
                crossAgencySharing={crossAgencySharing}
                expirationMonths={expirationMonths}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === "review" && draft ? (
            <Button
              onClick={() => {
                toast.success("Agreement draft saved");
                setLocation("/agreements");
              }}
              className="bg-[#238636] hover:bg-[#2ea043] text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || generateMutation.isPending}
              className="bg-[#238636] hover:bg-[#2ea043] text-white"
            >
              {generateMutation.isPending ? (
                "Generating..."
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </PrismLayout>
  );
}

// =============================================================================
// Step Components
// =============================================================================

function StepType({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#c9d1d9] mb-2">Select Agreement Type</h2>
        <p className="text-[#8b949e]">
          Choose the type of data use agreement to draft
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TypeCard
          type="DULA"
          title="Data Use and License Agreement"
          description="Comprehensive agreement covering data access, AI usage, and license terms. Best for new data partnerships."
          selected={value === "DULA"}
          onClick={() => onChange("DULA")}
        />
        <TypeCard
          type="MOU"
          title="Memorandum of Understanding"
          description="High-level agreement establishing intent and general terms. Best for initial inter-agency coordination."
          selected={value === "MOU"}
          onClick={() => onChange("MOU")}
        />
      </div>
    </div>
  );
}

function TypeCard({
  type,
  title,
  description,
  selected,
  onClick,
}: {
  type: string;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        p-6 rounded-lg border-2 text-left transition-all
        ${selected
          ? "border-[#58a6ff] bg-[#58a6ff]/10"
          : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"
        }
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <Badge
          variant="outline"
          className={
            type === "DULA"
              ? "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]"
              : "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]"
          }
        >
          {type}
        </Badge>
        {selected && <Check className="h-4 w-4 text-[#3fb950]" />}
      </div>
      <h3 className="font-semibold text-[#c9d1d9] mb-2">{title}</h3>
      <p className="text-sm text-[#8b949e]">{description}</p>
    </button>
  );
}

function StepDetails({
  agencyId,
  agencyName,
  expirationMonths,
  onAgencyChange,
  onAgencyNameChange,
  onExpirationChange,
}: {
  agencyId: string;
  agencyName: string;
  expirationMonths: number;
  onAgencyChange: (id: string) => void;
  onAgencyNameChange: (name: string) => void;
  onExpirationChange: (months: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#c9d1d9] mb-2">Agreement Details</h2>
        <p className="text-[#8b949e]">
          Specify the counterparty and agreement duration
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-[#8b949e]">Agency</Label>
          <Select value={agencyId} onValueChange={onAgencyChange}>
            <SelectTrigger className="bg-[#0d1117] border-[#30363d] mt-2">
              <SelectValue placeholder="Select an agency" />
            </SelectTrigger>
            <SelectContent className="bg-[#161b22] border-[#30363d]">
              {AGENCIES.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[#8b949e]">Agency Full Name</Label>
          <Input
            value={agencyName}
            onChange={(e) => onAgencyNameChange(e.target.value)}
            placeholder="Full legal name of the agency"
            className="bg-[#0d1117] border-[#30363d] text-[#c9d1d9] mt-2"
          />
        </div>

        <div>
          <Label className="text-[#8b949e]">Agreement Duration</Label>
          <Select
            value={expirationMonths.toString()}
            onValueChange={(v) => onExpirationChange(parseInt(v))}
          >
            <SelectTrigger className="bg-[#0d1117] border-[#30363d] mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#161b22] border-[#30363d]">
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
              <SelectItem value="36">36 months</SelectItem>
              <SelectItem value="60">60 months (5 years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepDomains({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (domain: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#c9d1d9] mb-2">Data Domains</h2>
        <p className="text-[#8b949e]">
          Select the data domains this agreement will cover
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {DATA_DOMAINS.map((domain) => {
          const isSelected = selected.includes(domain.id);
          return (
            <button
              key={domain.id}
              onClick={() => onToggle(domain.id)}
              className={`
                p-4 rounded-lg border text-left transition-all flex items-start gap-3
                ${isSelected
                  ? "border-[#3fb950] bg-[#3fb950]/10"
                  : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"
                }
              `}
            >
              <div
                className={`
                  w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5
                  ${isSelected ? "bg-[#3fb950] border-[#3fb950]" : "border-[#30363d]"}
                `}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#58a6ff]" />
                  <span className="font-medium text-[#c9d1d9]">{domain.label}</span>
                </div>
                <p className="text-sm text-[#8b949e] mt-1">{domain.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepPermissions({
  aiEnabled,
  crossAgencySharing,
  onAiEnabledChange,
  onCrossAgencySharingChange,
}: {
  aiEnabled: boolean;
  crossAgencySharing: boolean;
  onAiEnabledChange: (v: boolean) => void;
  onCrossAgencySharingChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#c9d1d9] mb-2">Permissions</h2>
        <p className="text-[#8b949e]">
          Configure AI and data sharing permissions
        </p>
      </div>

      <div className="space-y-4">
        <div
          className={`
            p-4 rounded-lg border transition-all
            ${aiEnabled ? "border-[#a371f7] bg-[#a371f7]/10" : "border-[#30363d] bg-[#0d1117]"}
          `}
        >
          <div className="flex items-start gap-4">
            <Checkbox
              checked={aiEnabled}
              onCheckedChange={(v) => onAiEnabledChange(v as boolean)}
              className="mt-1"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-[#a371f7]" />
                <span className="font-medium text-[#c9d1d9]">Enable AI Processing</span>
              </div>
              <p className="text-sm text-[#8b949e]">
                Allow Cortex AI to analyze data for forecasting, anomaly detection, and narrative generation.
                Human-in-the-loop will be required for executive-level outputs.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`
            p-4 rounded-lg border transition-all
            ${crossAgencySharing ? "border-[#d29922] bg-[#d29922]/10" : "border-[#30363d] bg-[#0d1117]"}
          `}
        >
          <div className="flex items-start gap-4">
            <Checkbox
              checked={crossAgencySharing}
              onCheckedChange={(v) => onCrossAgencySharingChange(v as boolean)}
              className="mt-1"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-[#d29922]" />
                <span className="font-medium text-[#c9d1d9]">Allow Cross-Agency Sharing</span>
              </div>
              <p className="text-sm text-[#8b949e]">
                Permit aggregated, de-identified data to be shared with other agencies for
                government-wide oversight. Raw data sharing will remain prohibited.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-[#30363d] bg-[#0d1117]">
          <div className="flex items-start gap-4">
            <div className="w-5 h-5 rounded border border-[#f85149] flex items-center justify-center shrink-0 mt-1">
              <Check className="h-3 w-3 text-[#f85149]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-[#f85149]" />
                <span className="font-medium text-[#c9d1d9]">PII/PHI Prohibited</span>
                <Badge variant="outline" className="bg-[#f85149]/20 text-[#f85149] border-[#f85149] text-xs">
                  Default
                </Badge>
              </div>
              <p className="text-sm text-[#8b949e]">
                Personally identifiable information (PII) and protected health information (PHI)
                are prohibited by default. This cannot be changed in the wizard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({
  draft,
  loading,
  agreementType,
  agencyName,
  dataDomains,
  aiEnabled,
  crossAgencySharing,
  expirationMonths,
}: {
  draft: any;
  loading: boolean;
  agreementType: string;
  agencyName: string;
  dataDomains: string[];
  aiEnabled: boolean;
  crossAgencySharing: boolean;
  expirationMonths: number;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-10 w-10 mx-auto mb-4 text-[#58a6ff] animate-pulse" />
        <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">Generating Draft Agreement</h3>
        <p className="text-[#8b949e]">AI is creating suggested clauses based on your inputs...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-12">
        <FileText className="h-10 w-10 mx-auto mb-4 text-[#8b949e]" />
        <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">No Draft Generated</h3>
        <p className="text-[#8b949e]">Go back and complete all steps to generate a draft</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#c9d1d9] mb-2">Review Draft Agreement</h2>
        <p className="text-[#8b949e]">
          Review the AI-generated draft and suggested clauses
        </p>
      </div>

      <Card className="bg-[#0d1117] border-[#30363d]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                agreementType === "DULA"
                  ? "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]"
                  : "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]"
              }
            >
              {agreementType}
            </Badge>
            <Badge variant="outline" className="bg-[#d29922]/20 text-[#d29922] border-[#d29922]">
              DRAFT
            </Badge>
          </div>
          <CardTitle className="text-[#c9d1d9]">{draft.title}</CardTitle>
          <CardDescription className="text-[#8b949e]">
            Agreement ID: {draft.agreementId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-[#8b949e]">Counterparty</p>
              <p className="text-[#c9d1d9]">{agencyName}</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Duration</p>
              <p className="text-[#c9d1d9]">{expirationMonths} months</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">AI Processing</p>
              <p className={aiEnabled ? "text-[#3fb950]" : "text-[#f85149]"}>
                {aiEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Cross-Agency Sharing</p>
              <p className={crossAgencySharing ? "text-[#3fb950]" : "text-[#f85149]"}>
                {crossAgencySharing ? "Allowed" : "Prohibited"}
              </p>
            </div>
          </div>

          <Separator className="bg-[#30363d] my-6" />

          <div className="mb-4">
            <p className="text-sm text-[#8b949e] mb-2">Data Domains</p>
            <div className="flex flex-wrap gap-2">
              {dataDomains.map((domain) => (
                <Badge
                  key={domain}
                  variant="outline"
                  className="bg-[#21262d] border-[#30363d] text-[#c9d1d9]"
                >
                  <Database className="h-3 w-3 mr-1" />
                  {domain}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-[#30363d] my-6" />

          <div>
            <p className="text-sm text-[#8b949e] mb-4">Suggested Clauses ({draft.suggestedClauses.length})</p>
            <div className="space-y-3">
              {draft.suggestedClauses.map((clause: any) => (
                <div
                  key={clause.clauseId}
                  className="p-4 rounded-lg border border-[#30363d] bg-[#161b22]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="bg-[#58a6ff]/20 text-[#58a6ff] border-0 text-xs"
                    >
                      {clause.clauseType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-[#8b949e]">Section {clause.sourceSection}</span>
                    <Badge variant="outline" className="bg-[#a371f7]/20 text-[#a371f7] border-0 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  </div>
                  <p className="text-sm text-[#c9d1d9]">{clause.clauseText}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg border border-[#d29922]/50 bg-[#d29922]/10">
        <p className="text-sm text-[#d29922]">
          <strong>Note:</strong> This is an AI-generated draft. All clauses require legal review
          and validation before the agreement can be executed.
        </p>
      </div>
    </div>
  );
}
