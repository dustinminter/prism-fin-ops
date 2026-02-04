import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Circle } from "lucide-react";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarioMap, type ChatMessage } from "@/data/intelligenceData";
import { trpc } from "@/lib/trpc";
import { buildChartDataFromResults } from "./chartUtils";
import IntelMessages from "./IntelMessages";
import { SnowflakeLogo } from "./SnowflakeIcon";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const LOADING_STEPS = [
  "Interpreting your question...",
  "Generating SQL...",
  "Executing query...",
  "Preparing answer...",
];

export default function IntelligenceChat() {
  const { activeScenario } = useIntelligence();
  const data = scenarioMap[activeScenario];
  const [query, setQuery] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveMessagesRef = useRef(liveMessages);
  liveMessagesRef.current = liveMessages;

  const greeting = useMemo(() => getGreeting(), []);
  const allMessages = useMemo(
    () => [...data.conversations, ...liveMessages],
    [data.conversations, liveMessages]
  );
  const hasMessages = allMessages.length > 0;

  const chatMutation = trpc.prism.chatWithIntelligence.useMutation();

  // Reset live messages when scenario changes
  useEffect(() => {
    setLiveMessages([]);
  }, [activeScenario]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeScenario, liveMessages]);

  // Cycle loading steps while waiting
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || query).trim();
    if (!message || isLoading) return;

    setQuery("");
    setLiveMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);
    setLoadingStep(0);

    try {
      const result = await chatMutation.mutateAsync({
        message,
        chatContext: {
          page: `intelligence-${activeScenario}`,
          conversationHistory: [
            ...data.conversations.slice(-4).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            ...liveMessagesRef.current.slice(-4).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
        },
      });

      // Build chart from Cortex Analyst SQL results when available
      const chartData = result.results && result.columns
        ? buildChartDataFromResults(result.results, result.columns)
        : undefined;

      setLiveMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          chart: chartData ?? undefined,
          sql: result.sql,
          source: result.sources?.join(", ") ?? "Cortex Analyst",
          verified: result.isVerifiedQuery,
        },
      ]);
    } catch {
      setLiveMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm unable to connect to Snowflake Intelligence right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [query, isLoading, activeScenario, data.conversations, chatMutation]);

  return (
    <div className="flex-1 min-w-[420px] bg-[#f8f9fa] flex flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto w-full px-6">
          {/* Welcome screen — shown when no messages or always at top */}
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] pt-16">
              {/* Agent name */}
              <div className="flex items-center gap-2.5 mb-3">
                <SnowflakeLogo className="h-[28px]" />
                <span className="text-[20px] font-bold text-[#1e293b]">PRISM Intelligence</span>
              </div>
              <div className="flex items-center gap-1.5 mb-8">
                <Circle className="w-2 h-2 fill-[#22c55e] text-[#22c55e]" />
                <span className="text-[12px] text-[#64748b]">PRISM_EOTSS_FINOPS Semantic Model</span>
              </div>

              {/* Greeting */}
              <div className="text-center mb-8">
                <div className="text-[28px] font-bold text-[#1e293b] tracking-tight">
                  {greeting}, Jeff
                </div>
                <div
                  className="text-[28px] font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 50%, #79E0F7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  What can I help you analyze?
                </div>
              </div>

              {/* Sample questions as cards */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-[640px]">
                {data.chips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    disabled={isLoading}
                    className="text-left px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl text-[13px] text-[#475569] hover:border-[#29B5E8] hover:shadow-[0_0_0_1px_rgba(41,181,232,0.2)] hover:text-[#0f172a] transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4">
              {/* Compact agent header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <SnowflakeLogo className="h-[18px]" />
                <span className="text-[14px] font-semibold text-[#1e293b]">PRISM Intelligence</span>
                <Circle className="w-2 h-2 fill-[#22c55e] text-[#22c55e] ml-1" />
                <span className="text-[11px] text-[#94a3b8]">PRISM_EOTSS_FINOPS</span>
              </div>

              {/* Messages */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`msgs-${activeScenario}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <IntelMessages messages={allMessages} onSuggestionClick={handleSend} />
                </motion.div>
              </AnimatePresence>

              {/* Loading status */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 mt-4 px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl shadow-sm"
                >
                  <Loader2 className="w-4 h-4 text-[#29B5E8] animate-spin" />
                  <span className="text-[13px] text-[#64748b]">{LOADING_STEPS[loadingStep]}</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Chat input — fixed at bottom */}
      <div className="border-t border-[#e2e8f0] bg-white px-6 py-3 shrink-0">
        <div className="max-w-[900px] mx-auto w-full">
          <div className="flex items-center bg-white border-2 border-[#e2e8f0] rounded-xl px-4 h-12 transition-all duration-300 focus-within:border-[#29B5E8] focus-within:shadow-[0_0_0_3px_rgba(41,181,232,0.1)] hover:border-[#cbd5e1]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question..."
              className="flex-1 bg-transparent border-none text-[13px] text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
              style={{ fontFamily: "inherit" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !query.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: query.trim() ? "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 100%)" : "#e2e8f0",
              }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <div className="text-center mt-1.5 text-[10px] text-[#94a3b8]">
            Powered by Snowflake Cortex Analyst · PRISM Semantic Model
          </div>
        </div>
      </div>
    </div>
  );
}
