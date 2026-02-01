import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Database,
  ArrowRight,
  Brain,
  FileText,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LineageStage {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  lastRefresh: Date;
  status: "complete" | "processing" | "pending";
  details?: string[];
}

interface LineageDrawerProps {
  metricName: string;
  metricValue?: string;
  children: React.ReactNode;
}

/**
 * LineageDrawer - High-level data lineage visualization
 * 
 * Purpose: Show data provenance for KPIs and metrics
 * Behavior: Progressive disclosure, 3-5 stages max, no SQL or pipeline DAGs
 * Placement: "View lineage" links on KPIs, triggered from Intelligence Panel
 */
export default function LineageDrawer({ metricName, metricValue, children }: LineageDrawerProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Define lineage stages - simplified, no technical details
  const stages: LineageStage[] = [
    {
      id: "source",
      name: "Data Source",
      description: "USAspending.gov federal spending data",
      icon: Database,
      lastRefresh: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "complete",
      details: [
        "Federal contracts and grants",
        "Agency obligation records",
        "Recipient information",
      ],
    },
    {
      id: "ingest",
      name: "Data Ingestion",
      description: "Loaded into Snowflake data warehouse",
      icon: ArrowRight,
      lastRefresh: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      status: "complete",
      details: [
        "Daily automated refresh",
        "Data quality validation",
        "Schema normalization",
      ],
    },
    {
      id: "analysis",
      name: "AI Analysis",
      description: "Cortex AI pattern detection and forecasting",
      icon: Brain,
      lastRefresh: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: "complete",
      details: [
        "Anomaly detection",
        "Trend analysis",
        "Forecast generation",
      ],
    },
    {
      id: "governance",
      name: "Governance Review",
      description: "Trust state and agreement validation",
      icon: Shield,
      lastRefresh: new Date(Date.now() - 30 * 60 * 1000),
      status: "complete",
      details: [
        "Federal Financial Data Agreement",
        "Trust state: Internal",
        "Audit trail maintained",
      ],
    },
    {
      id: "presentation",
      name: "Metric Presentation",
      description: "Displayed in PRISM dashboard",
      icon: FileText,
      lastRefresh: new Date(),
      status: "complete",
      details: [
        "Real-time calculation",
        "Governed by display rules",
        "Cached for performance",
      ],
    },
  ];

  const getStatusColor = (status: LineageStage["status"]) => {
    switch (status) {
      case "complete":
        return "text-[#3fb950]";
      case "processing":
        return "text-[#d29922]";
      case "pending":
        return "text-[#6e7681]";
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-[#0d1117] border-[#30363d]">
        <SheetHeader className="border-b border-[#30363d] pb-4">
          <SheetTitle className="text-[#c9d1d9] flex items-center gap-2">
            <Database className="h-5 w-5 text-[#58a6ff]" />
            Data Lineage
          </SheetTitle>
          <SheetDescription className="text-[#8b949e]">
            How "{metricName}" is derived from source data
          </SheetDescription>
          {metricValue && (
            <div className="mt-2 p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
              <p className="text-xs text-[#6e7681]">Current Value</p>
              <p className="text-lg font-semibold text-[#c9d1d9]">{metricValue}</p>
            </div>
          )}
        </SheetHeader>

        <div className="py-6">
          {/* Lineage Flow */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#58a6ff] via-[#3fb950] to-[#3fb950]" />

            <div className="space-y-4">
              {stages.map((stage, index) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-4 group">
                      {/* Stage icon */}
                      <div
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                          expandedStage === stage.id
                            ? "bg-[#58a6ff]/20 border-[#58a6ff]"
                            : "bg-[#161b22] border-[#30363d] group-hover:border-[#58a6ff]/50"
                        }`}
                      >
                        <stage.icon
                          className={`h-4 w-4 ${
                            expandedStage === stage.id ? "text-[#58a6ff]" : "text-[#8b949e]"
                          }`}
                        />
                      </div>

                      {/* Stage content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-[#c9d1d9] group-hover:text-[#58a6ff] transition-colors">
                            {stage.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={`h-3 w-3 ${getStatusColor(stage.status)}`} />
                            <ChevronRight
                              className={`h-4 w-4 text-[#6e7681] transition-transform ${
                                expandedStage === stage.id ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#6e7681] mt-0.5">{stage.description}</p>
                        <p className="text-[10px] text-[#6e7681] mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(stage.lastRefresh, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedStage === stage.id && stage.details && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-14 mt-2 p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
                          <ul className="space-y-1.5">
                            {stage.details.map((detail, i) => (
                              <li key={i} className="text-xs text-[#8b949e] flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-[#58a6ff]" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Agreement reference */}
          <div className="mt-6 p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#3fb950]" />
              <h4 className="text-sm font-medium text-[#c9d1d9]">Governing Agreement</h4>
            </div>
            <p className="text-xs text-[#8b949e]">
              This metric is governed by the Federal Financial Data Agreement, ensuring data
              accuracy, access controls, and audit compliance.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs text-[#58a6ff] hover:bg-[#58a6ff]/10 p-0"
            >
              View Agreement Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
