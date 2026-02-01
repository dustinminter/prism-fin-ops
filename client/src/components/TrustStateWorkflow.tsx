import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Briefcase,
  Crown,
  ChevronRight,
  Loader2,
  Lock,
  Unlock,
  Eye,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export type TrustState = "draft" | "internal" | "client" | "executive";

interface TrustStateWorkflowProps {
  currentState: TrustState;
  onStateChange?: (newState: TrustState, rationale: string) => Promise<void>;
  documentTitle?: string;
  canPromote?: boolean;
  compact?: boolean;
}

const TRUST_STATES: {
  id: TrustState;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: "draft",
    label: "Draft",
    icon: FileText,
    description: "Working document, not yet reviewed",
    color: "text-[#8b949e]",
    bgColor: "bg-[#8b949e]/10",
    borderColor: "border-[#8b949e]/30",
  },
  {
    id: "internal",
    label: "Internal",
    icon: Users,
    description: "Reviewed by team, ready for internal use",
    color: "text-[#58a6ff]",
    bgColor: "bg-[#58a6ff]/10",
    borderColor: "border-[#58a6ff]/30",
  },
  {
    id: "client",
    label: "Client",
    icon: Briefcase,
    description: "Approved for external stakeholder viewing",
    color: "text-[#d29922]",
    bgColor: "bg-[#d29922]/10",
    borderColor: "border-[#d29922]/30",
  },
  {
    id: "executive",
    label: "Executive",
    icon: Crown,
    description: "Final approval for executive presentation",
    color: "text-[#3fb950]",
    bgColor: "bg-[#3fb950]/10",
    borderColor: "border-[#3fb950]/30",
  },
];

const getStateIndex = (state: TrustState) =>
  TRUST_STATES.findIndex(s => s.id === state);

const getNextState = (current: TrustState): TrustState | null => {
  const idx = getStateIndex(current);
  return idx < TRUST_STATES.length - 1 ? TRUST_STATES[idx + 1].id : null;
};

export default function TrustStateWorkflow({
  currentState,
  onStateChange,
  documentTitle = "This insight",
  canPromote = true,
  compact = false,
}: TrustStateWorkflowProps) {
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [rationale, setRationale] = useState("");

  const currentStateConfig = TRUST_STATES.find(s => s.id === currentState)!;
  const nextState = getNextState(currentState);
  const nextStateConfig = nextState ? TRUST_STATES.find(s => s.id === nextState) : null;

  const handlePromote = async () => {
    if (!nextState || !onStateChange) return;

    setIsPromoting(true);
    try {
      await onStateChange(nextState, rationale);
      toast.success(`Promoted to ${nextStateConfig?.label}`, {
        description: `${documentTitle} is now visible at ${nextStateConfig?.label} level`,
      });
      setIsPromoteDialogOpen(false);
      setRationale("");
    } catch (error) {
      toast.error("Failed to promote", {
        description: "Please try again or contact support",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={`${currentStateConfig.bgColor} ${currentStateConfig.color} ${currentStateConfig.borderColor} text-[10px] border`}>
          <currentStateConfig.icon className="h-3 w-3 mr-1" />
          {currentStateConfig.label}
        </Badge>
        {nextState && canPromote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPromoteDialogOpen(true)}
                className="h-6 px-2 text-[10px] text-[#58a6ff] hover:bg-[#58a6ff]/10"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Promote
              </Button>
            </TooltipTrigger>
            <TooltipContent>Promote to {nextStateConfig?.label}</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-[#d0d7de] p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#0969da]" />
            <h3 className="text-sm font-semibold text-[#1f2328]">Trust State</h3>
          </div>
          <Badge className={`${currentStateConfig.bgColor} ${currentStateConfig.color} ${currentStateConfig.borderColor} border`}>
            <currentStateConfig.icon className="h-3 w-3 mr-1" />
            {currentStateConfig.label}
          </Badge>
        </div>

        {/* State Progress */}
        <div className="flex items-center justify-between mb-4">
          {TRUST_STATES.map((state, index) => {
            const isActive = state.id === currentState;
            const isPast = getStateIndex(state.id) < getStateIndex(currentState);
            const StateIcon = state.icon;

            return (
              <div key={state.id} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`relative flex flex-col items-center ${
                        isActive ? "scale-110" : ""
                      } transition-transform`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isActive
                            ? `${state.bgColor} ${state.borderColor} ${state.color}`
                            : isPast
                            ? "bg-[#3fb950]/10 border-[#3fb950] text-[#3fb950]"
                            : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <StateIcon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={`mt-1 text-[10px] font-medium ${
                          isActive ? state.color : isPast ? "text-[#3fb950]" : "text-[#656d76]"
                        }`}
                      >
                        {state.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className={`absolute -bottom-1 w-full h-0.5 rounded ${state.color.replace("text-", "bg-")}`}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{state.description}</TooltipContent>
                </Tooltip>

                {index < TRUST_STATES.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 rounded ${
                      getStateIndex(TRUST_STATES[index + 1].id) <= getStateIndex(currentState)
                        ? "bg-[#3fb950]"
                        : "bg-[#d0d7de]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current State Description */}
        <div className={`p-3 rounded-lg ${currentStateConfig.bgColor} mb-4`}>
          <p className="text-sm text-[#1f2328]">
            <strong>{documentTitle}</strong> {" "}
            {currentState === "draft" && "is in draft state and visible only to the author."}
            {currentState === "internal" && "has been reviewed and is visible to the internal team."}
            {currentState === "client" && "is approved for external stakeholder viewing."}
            {currentState === "executive" && "has received final executive approval."}
          </p>
        </div>

        {/* Promote Action */}
        {nextState && canPromote && (
          <Button
            onClick={() => setIsPromoteDialogOpen(true)}
            className="w-full bg-[#0969da] hover:bg-[#0860ca] text-white"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Promote to {nextStateConfig?.label}
          </Button>
        )}

        {!nextState && (
          <div className="flex items-center justify-center gap-2 p-3 bg-[#3fb950]/10 rounded-lg text-[#1a7f37]">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">Executive Approved</span>
          </div>
        )}

        {!canPromote && nextState && (
          <div className="flex items-center justify-center gap-2 p-3 bg-[#f6f8fa] rounded-lg text-[#656d76]">
            <Lock className="h-4 w-4" />
            <span className="text-sm">You don't have permission to promote</span>
          </div>
        )}
      </div>

      {/* Promotion Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="bg-white border-[#d0d7de]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1f2328]">
              <Shield className="h-5 w-5 text-[#0969da]" />
              Promote to {nextStateConfig?.label}
            </DialogTitle>
            <DialogDescription className="text-[#656d76]">
              {nextState === "executive"
                ? "This action requires executive approval confirmation. This insight will be visible to all executive stakeholders."
                : `Promoting will make this insight visible at the ${nextStateConfig?.label} level.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* State Change Preview */}
            <div className="flex items-center justify-center gap-4 p-4 bg-[#f6f8fa] rounded-lg">
              <div className={`flex flex-col items-center ${currentStateConfig.color}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStateConfig.bgColor}`}>
                  <currentStateConfig.icon className="h-6 w-6" />
                </div>
                <span className="text-xs mt-1 font-medium">{currentStateConfig.label}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-[#656d76]" />
              <div className={`flex flex-col items-center ${nextStateConfig?.color}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${nextStateConfig?.bgColor}`}>
                  {nextStateConfig && <nextStateConfig.icon className="h-6 w-6" />}
                </div>
                <span className="text-xs mt-1 font-medium">{nextStateConfig?.label}</span>
              </div>
            </div>

            {/* Executive Warning */}
            {nextState === "executive" && (
              <div className="flex items-start gap-3 p-3 bg-[#d29922]/10 rounded-lg border border-[#d29922]/30">
                <AlertTriangle className="h-5 w-5 text-[#d29922] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#9a6700]">Executive Approval Required</p>
                  <p className="text-xs text-[#9a6700]/80 mt-1">
                    This action will make the insight visible to executive leadership. Ensure all data has been verified and reviewed.
                  </p>
                </div>
              </div>
            )}

            {/* Rationale Input */}
            <div className="space-y-2">
              <Label htmlFor="rationale" className="text-[#1f2328]">
                Rationale {nextState === "executive" && <span className="text-[#cf222e]">*</span>}
              </Label>
              <Textarea
                id="rationale"
                placeholder="Explain why this insight is ready for promotion..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="bg-white border-[#d0d7de] text-[#1f2328] placeholder:text-[#656d76] focus:border-[#0969da] focus:ring-[#0969da]"
                rows={3}
              />
              <p className="text-xs text-[#656d76]">
                This will be recorded in the audit trail for governance compliance.
              </p>
            </div>

            {/* Checklist for Executive */}
            {nextState === "executive" && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1f2328]">Pre-promotion checklist:</p>
                <div className="space-y-1">
                  {[
                    "Data sources have been verified",
                    "Calculations have been reviewed",
                    "Narrative has been fact-checked",
                    "Stakeholder impact has been considered",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#656d76]">
                      <FileCheck className="h-4 w-4 text-[#3fb950]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPromoteDialogOpen(false)}
              className="border-[#d0d7de] text-[#656d76] hover:bg-[#f6f8fa]"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePromote}
              disabled={isPromoting || (nextState === "executive" && !rationale.trim())}
              className="bg-[#0969da] hover:bg-[#0860ca] text-white"
            >
              {isPromoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Promotion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact badge for inline use
export function TrustStateBadge({ state }: { state: TrustState }) {
  const config = TRUST_STATES.find(s => s.id === state)!;
  const StateIcon = config.icon;

  return (
    <Badge className={`${config.bgColor} ${config.color} ${config.borderColor} text-[10px] border`}>
      <StateIcon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
