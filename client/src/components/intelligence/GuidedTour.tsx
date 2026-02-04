import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Target, BarChart3, MessageSquare, Brain, FileText } from "lucide-react";
import { SnowflakeIcon } from "./SnowflakeIcon";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "center" | "left" | "right" | "bottom";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to PRISM Intelligence",
    description: "PRISM FinOps Intelligence is powered by Snowflake Cortex — giving you natural language access to Massachusetts EOTSS financial data across 4 data sources, 7 semantic tables, and 10 agencies.",
    icon: <SnowflakeIcon className="w-6 h-6" />,
    position: "center",
  },
  {
    title: "Use Case Scenarios",
    description: "Navigate pre-built analysis scenarios in the sidebar — Agency Spending, Anomaly Investigation, Budget Forecasting, and Cross-Source Intelligence. Each scenario includes executive narratives, charts, and verified queries.",
    icon: <Target className="w-6 h-6 text-[#58a6ff]" />,
    position: "left",
  },
  {
    title: "Ask Anything",
    description: "Type natural language questions in the chat input. Snowflake Intelligence translates your questions into SQL, executes them against live data, and returns answers with inline charts and verified source badges.",
    icon: <MessageSquare className="w-6 h-6 text-[#29B5E8]" />,
    position: "bottom",
  },
  {
    title: "Interactive Charts & Data",
    description: "Charts render inline with your responses. Switch between chart types (bar, line, area, pie), expand data tables, view the generated SQL, and explore insights — all within the conversation flow.",
    icon: <BarChart3 className="w-6 h-6 text-[#22c55e]" />,
    position: "center",
  },
  {
    title: "Executive Narratives",
    description: "Each scenario opens with an Executive Narrative — a high-level briefing with KPI highlights and risk flags. Use these to get oriented before diving into detailed analysis.",
    icon: <FileText className="w-6 h-6 text-[#d29922]" />,
    position: "center",
  },
  {
    title: "Cortex Intelligence Agent",
    description: "Your queries are routed through the PRISM_EOTSS_FINOPS agent built on Snowflake Cortex Analyst. Every response shows its source, SQL, and verification status so you can trust the results.",
    icon: <Brain className="w-6 h-6 text-[#a371f7]" />,
    position: "center",
  },
];

const STORAGE_KEY = "prism-tour-completed";

interface Props {
  forceShow?: boolean;
  onComplete?: () => void;
}

export default function GuidedTour({ forceShow, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
      return;
    }
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, [forceShow]);

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete?.();
  }, [onComplete]);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  }, [step, close]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Tour card */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden">
          {/* Gradient accent */}
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, #29B5E8 0%, #4DD4F7 ${((step + 1) / TOUR_STEPS.length) * 100}%, #21262d ${((step + 1) / TOUR_STEPS.length) * 100}%)`,
            }}
          />

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#484f58] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="px-6 pt-6 pb-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-[#0d1117] border border-[#21262d] flex items-center justify-center mb-4">
              {current.icon}
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[11px] font-medium text-[#29B5E8]">
                Step {step + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            {/* Title & description */}
            <h3 className="text-[18px] font-semibold text-[#e6edf3] mb-2">{current.title}</h3>
            <p className="text-[14px] text-[#8b949e] leading-[1.6]">{current.description}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#21262d]">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step ? "bg-[#29B5E8] w-4" : i < step ? "bg-[#29B5E8]/40" : "bg-[#21262d]"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              {isFirst && (
                <button
                  onClick={close}
                  className="px-3 py-1.5 rounded-lg text-[13px] text-[#484f58] hover:text-[#8b949e] transition-colors"
                >
                  Skip tour
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 100%)",
                }}
              >
                {isLast ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useTourTrigger() {
  const [showTour, setShowTour] = useState(false);
  const triggerTour = useCallback(() => setShowTour(true), []);
  const onTourComplete = useCallback(() => setShowTour(false), []);
  return { showTour, triggerTour, onTourComplete };
}
