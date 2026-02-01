import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Shield, ShieldCheck, ShieldAlert, AlertTriangle, User } from "lucide-react";
import { Link } from "wouter";

// =============================================================================
// Types
// =============================================================================

export interface GovernanceMetadata {
  agreementId: string | null;
  agreementTitle?: string;
  policyVersion: string | null;
  enforcementDecision: "ALLOWED" | "DENIED" | "DEGRADED";
}

export interface GovernanceIndicatorProps {
  governanceMetadata?: GovernanceMetadata | null;
  restrictions?: string[];
  trustState?: "DRAFT" | "INTERNAL" | "CLIENT" | "EXECUTIVE";
  canPromoteToExecutive?: boolean;
  compact?: boolean;
}

// =============================================================================
// Main Component
// =============================================================================

export function GovernanceIndicator({
  governanceMetadata,
  restrictions = [],
  trustState,
  canPromoteToExecutive = true,
  compact = false,
}: GovernanceIndicatorProps) {
  if (!governanceMetadata) {
    return (
      <Badge variant="outline" className="bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e] gap-1">
        <Shield className="h-3 w-3" />
        No Policy
      </Badge>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <GovernanceBadge
          agreementId={governanceMetadata.agreementId}
          policyVersion={governanceMetadata.policyVersion}
        />
        {trustState && <TrustStateBadge state={trustState} />}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <GovernanceBadge
        agreementId={governanceMetadata.agreementId}
        agreementTitle={governanceMetadata.agreementTitle}
        policyVersion={governanceMetadata.policyVersion}
      />

      {trustState && <TrustStateBadge state={trustState} />}

      {restrictions.length > 0 && (
        <RestrictionsBadge restrictions={restrictions} />
      )}

      {trustState === "CLIENT" && !canPromoteToExecutive && (
        <HumanReviewBadge />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function GovernanceBadge({
  agreementId,
  agreementTitle,
  policyVersion,
}: {
  agreementId: string | null;
  agreementTitle?: string;
  policyVersion: string | null;
}) {
  if (!agreementId) {
    return (
      <Badge variant="outline" className="bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e] gap-1">
        <Shield className="h-3 w-3" />
        Ungoverned
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`/agreements/${agreementId}`}>
          <Badge
            variant="outline"
            className="bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff] gap-1 cursor-pointer hover:bg-[#58a6ff]/30"
          >
            <ShieldCheck className="h-3 w-3" />
            {policyVersion || agreementId}
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent className="bg-[#161b22] border-[#30363d]">
        <p className="text-sm">
          <strong>Governed by:</strong> {agreementTitle || agreementId}
        </p>
        {policyVersion && (
          <p className="text-xs text-[#8b949e]">Policy: {policyVersion}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function TrustStateBadge({
  state,
  size = "default",
}: {
  state: string;
  size?: "default" | "sm" | "lg";
}) {
  const colors: Record<string, string> = {
    DRAFT: "bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]",
    INTERNAL: "bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]",
    CLIENT: "bg-[#a371f7]/20 text-[#a371f7] border-[#a371f7]",
    EXECUTIVE: "bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]",
  };

  const descriptions: Record<string, string> = {
    DRAFT: "AI-generated, unvalidated",
    INTERNAL: "Analyst-reviewed, fact-checked",
    CLIENT: "Stakeholder-approved, context added",
    EXECUTIVE: "Leadership-ready, audit complete",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={colors[state] || colors.DRAFT}>
          {state}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="bg-[#161b22] border-[#30363d]">
        <p className="text-sm">{descriptions[state] || state}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function RestrictionsBadge({ restrictions }: { restrictions: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="bg-[#d29922]/20 text-[#d29922] border-[#d29922] gap-1">
          <AlertTriangle className="h-3 w-3" />
          {restrictions.length} restriction(s)
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="bg-[#161b22] border-[#30363d] max-w-xs">
        <ul className="text-sm space-y-1">
          {restrictions.map((r, i) => (
            <li key={i} className="text-[#d29922]">{r}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function HumanReviewBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff] gap-1">
          <User className="h-3 w-3" />
          Review Required
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="bg-[#161b22] border-[#30363d]">
        <p className="text-sm">Human review required before promoting to EXECUTIVE</p>
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Decision Badges
// =============================================================================

export function DecisionBadge({ decision }: { decision: string }) {
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

// =============================================================================
// AI Processing Badge
// =============================================================================

export function AIProcessingBadge({ allowed }: { allowed: boolean }) {
  return allowed ? (
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

// =============================================================================
// Governance Card (for displaying in dashboards)
// =============================================================================

export function GovernanceCard({
  agreementId,
  agreementTitle,
  aiAllowed,
  trustStateCeiling,
  restrictions,
}: {
  agreementId: string;
  agreementTitle: string;
  aiAllowed: boolean;
  trustStateCeiling?: string;
  restrictions?: string[];
}) {
  return (
    <div className="p-4 rounded-lg border border-[#30363d] bg-[#161b22]">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-[#58a6ff]" />
        <span className="text-sm font-medium text-[#c9d1d9]">Data Governance</span>
      </div>

      <div className="space-y-2">
        <Link href={`/agreements/${agreementId}`}>
          <p className="text-sm text-[#58a6ff] hover:underline">{agreementTitle}</p>
        </Link>

        <div className="flex flex-wrap gap-2">
          <AIProcessingBadge allowed={aiAllowed} />
          {trustStateCeiling && (
            <Badge variant="outline" className="bg-[#8b949e]/20 text-[#8b949e] border-[#8b949e]">
              Max: {trustStateCeiling}
            </Badge>
          )}
        </div>

        {restrictions && restrictions.length > 0 && (
          <div className="pt-2 border-t border-[#30363d] mt-2">
            <p className="text-xs text-[#8b949e] mb-1">Active Restrictions:</p>
            <ul className="text-xs text-[#d29922] space-y-1">
              {restrictions.slice(0, 3).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              {restrictions.length > 3 && (
                <li className="text-[#8b949e]">+{restrictions.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
