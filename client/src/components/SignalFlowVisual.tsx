import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Cpu,
  Bell,
  FileText,
  ChevronRight,
  Zap,
  Activity,
  Cloud,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignalSource {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  status: "active" | "syncing" | "idle";
  lastSignal?: string;
}

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const SIGNAL_SOURCES: SignalSource[] = [
  {
    id: "usaspending",
    name: "USAspending.gov",
    icon: Database,
    color: "#58a6ff",
    status: "active",
    lastSignal: "2 min ago",
  },
  {
    id: "cip",
    name: "CIP FY26-30",
    icon: Calendar,
    color: "#3fb950",
    status: "active",
    lastSignal: "1 hour ago",
  },
  {
    id: "cloud",
    name: "Cloud Billing",
    icon: Cloud,
    color: "#a371f7",
    status: "idle",
    lastSignal: "Planned Q2",
  },
];

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: "ingest",
    name: "Ingest",
    description: "Data collection from federated sources",
    icon: Database,
    color: "#58a6ff",
  },
  {
    id: "analyze",
    name: "Analyze",
    description: "Cortex AI pattern detection",
    icon: Cpu,
    color: "#a371f7",
  },
  {
    id: "alert",
    name: "Alert",
    description: "Anomaly and trend notifications",
    icon: Bell,
    color: "#d29922",
  },
  {
    id: "report",
    name: "Report",
    description: "Governed intelligence delivery",
    icon: FileText,
    color: "#3fb950",
  },
];

interface SignalFlowVisualProps {
  compact?: boolean;
  showSources?: boolean;
  animated?: boolean;
}

export default function SignalFlowVisual({
  compact = false,
  showSources = true,
  animated = true,
}: SignalFlowVisualProps) {
  const [activeSignal, setActiveSignal] = useState(0);
  const [pulseStage, setPulseStage] = useState(0);

  // Animate signal flow
  useEffect(() => {
    if (!animated) return;

    const interval = setInterval(() => {
      setActiveSignal(prev => (prev + 1) % SIGNAL_SOURCES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [animated]);

  // Animate processing stages
  useEffect(() => {
    if (!animated) return;

    const interval = setInterval(() => {
      setPulseStage(prev => (prev + 1) % (PROCESSING_STAGES.length + 1));
    }, 800);

    return () => clearInterval(interval);
  }, [animated]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#d0d7de]">
        <Activity className="h-4 w-4 text-[#0969da]" />
        <span className="text-xs text-[#656d76]">Signal Flow:</span>
        <div className="flex items-center gap-1">
          {PROCESSING_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      pulseStage === index
                        ? "scale-110 shadow-lg"
                        : "scale-100"
                    }`}
                    style={{
                      backgroundColor: `${stage.color}20`,
                      borderColor: stage.color,
                      borderWidth: pulseStage === index ? 2 : 1,
                    }}
                  >
                    <stage.icon
                      className="h-3 w-3"
                      style={{ color: stage.color }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{stage.name}</TooltipContent>
              </Tooltip>
              {index < PROCESSING_STAGES.length - 1 && (
                <motion.div
                  animate={{
                    opacity: pulseStage === index ? 1 : 0.3,
                    scale: pulseStage === index ? 1.2 : 1,
                  }}
                  className="mx-0.5"
                >
                  <ChevronRight className="h-3 w-3 text-[#656d76]" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
        <Badge className="ml-auto bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30 text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#d0d7de] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#0969da]" />
            <h3 className="text-sm font-semibold text-[#1f2328]">Continuous Signal Flow</h3>
          </div>
          <Badge className="bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30 text-[10px]">
            <Zap className="h-3 w-3 mr-1" />
            Real-time
          </Badge>
        </div>
        <p className="text-xs text-[#656d76] mt-1">
          Monitoring financial signals across federated data sources
        </p>
      </div>

      {/* Signal Sources */}
      {showSources && (
        <div className="p-4 border-b border-[#d0d7de]">
          <p className="text-[10px] text-[#656d76] uppercase tracking-wider font-medium mb-3">
            Data Sources
          </p>
          <div className="flex items-center gap-4">
            {SIGNAL_SOURCES.map((source, index) => (
              <motion.div
                key={source.id}
                animate={{
                  scale: activeSignal === index && animated ? 1.05 : 1,
                  opacity: source.status === "idle" ? 0.5 : 1,
                }}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  activeSignal === index && animated
                    ? "border-[#0969da] bg-[#0969da]/5"
                    : "border-[#d0d7de] bg-[#f6f8fa]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${source.color}20` }}
                  >
                    <source.icon className="h-4 w-4" style={{ color: source.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1f2328] truncate">
                      {source.name}
                    </p>
                    <p className="text-[10px] text-[#656d76]">{source.lastSignal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      source.status === "active"
                        ? "bg-[#3fb950]"
                        : source.status === "syncing"
                        ? "bg-[#d29922] animate-pulse"
                        : "bg-[#8b949e]"
                    }`}
                  />
                  <span className="text-[10px] text-[#656d76] capitalize">
                    {source.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Pipeline */}
      <div className="p-4">
        <p className="text-[10px] text-[#656d76] uppercase tracking-wider font-medium mb-4">
          Processing Pipeline
        </p>
        <div className="flex items-center justify-between">
          {PROCESSING_STAGES.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    animate={{
                      scale: pulseStage === index ? 1.1 : 1,
                      boxShadow:
                        pulseStage === index
                          ? `0 0 20px ${stage.color}40`
                          : "none",
                    }}
                    className="relative flex flex-col items-center"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all ${
                        pulseStage >= index
                          ? ""
                          : "border-[#d0d7de] bg-[#f6f8fa]"
                      }`}
                      style={{
                        backgroundColor:
                          pulseStage >= index ? `${stage.color}20` : undefined,
                        borderColor:
                          pulseStage >= index ? stage.color : undefined,
                      }}
                    >
                      <stage.icon
                        className="h-6 w-6"
                        style={{
                          color: pulseStage >= index ? stage.color : "#8b949e",
                        }}
                      />
                    </div>
                    <span
                      className="mt-2 text-xs font-medium"
                      style={{
                        color: pulseStage >= index ? stage.color : "#8b949e",
                      }}
                    >
                      {stage.name}
                    </span>
                    {pulseStage === index && animated && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 rounded-xl"
                        style={{ backgroundColor: `${stage.color}30` }}
                      />
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{stage.name}</p>
                  <p className="text-xs text-[#656d76]">{stage.description}</p>
                </TooltipContent>
              </Tooltip>

              {index < PROCESSING_STAGES.length - 1 && (
                <div className="flex-1 mx-2 relative">
                  <div className="h-0.5 bg-[#d0d7de] rounded-full" />
                  <motion.div
                    animate={{
                      width: pulseStage > index ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-0 left-0 h-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        PROCESSING_STAGES[index + 1]?.color || "#3fb950",
                    }}
                  />
                  {pulseStage === index && animated && (
                    <motion.div
                      animate={{ x: [0, 30, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="absolute top-1/2 -translate-y-1/2"
                    >
                      <ArrowRight
                        className="h-4 w-4"
                        style={{ color: stage.color }}
                      />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      <div className="px-4 py-3 border-t border-[#d0d7de] bg-[#f6f8fa]">
        <div className="flex items-center justify-between text-xs text-[#656d76]">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Last updated: just now</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-[#3fb950]" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini signal indicator for use in headers/footers
export function SignalIndicator({ active = true }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        animate={{
          scale: active ? [1, 1.2, 1] : 1,
          opacity: active ? 1 : 0.5,
        }}
        transition={{ duration: 1, repeat: active ? Infinity : 0 }}
        className={`w-2 h-2 rounded-full ${active ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
      />
      <span className="text-[10px] text-[#656d76]">
        {active ? "Live signals" : "Paused"}
      </span>
    </div>
  );
}
