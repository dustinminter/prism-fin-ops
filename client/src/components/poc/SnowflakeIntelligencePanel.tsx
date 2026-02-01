import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Settings, Clock, Circle, Loader2, Database, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePOCScenario } from "@/contexts/POCScenarioContext";
import { scenarioMap, type ChatMessage, type KPI } from "@/data/pocDemoData";
import { trpc } from "@/lib/trpc";
import IntelMessages from "./IntelMessages";
import { SnowflakeLogo } from "./SnowflakeIcon";

const kpiColorMap: Record<string, string> = {
  blue: "#29B5E8",
  green: "#22c55e",
  gold: "#b45309",
  red: "#dc2626",
  sfBlue: "#29B5E8",
  purple: "#7c3aed",
};

function getKpiColor(kpi: KPI): string {
  return kpiColorMap[kpi.color ?? ""] ?? "#1e293b";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function SnowflakeIntelligencePanel() {
  const { activeScenario } = usePOCScenario();
  const data = scenarioMap[activeScenario];
  const [query, setQuery] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveMessagesRef = useRef(liveMessages);
  liveMessagesRef.current = liveMessages;

  const greeting = useMemo(() => getGreeting(), []);

  const chatMutation = trpc.prism.chatWithIntelligence.useMutation();

  // Reset live messages when scenario changes
  useEffect(() => {
    setLiveMessages([]);
  }, [activeScenario]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeScenario, liveMessages]);

  const handleSend = useCallback(async (text?: string) => {
    const message = (text || query).trim();
    if (!message || isLoading) return;

    setQuery("");
    setLiveMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        message,
        chatContext: {
          page: `poc-${activeScenario}`,
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

      setLiveMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          source: result.sources?.join(", "),
        },
      ]);
    } catch {
      setLiveMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm unable to connect to Snowflake Intelligence right now. The pre-loaded analysis for this scenario is shown above.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [query, isLoading, activeScenario, data.conversations, chatMutation]);

  return (
    <div className="flex-1 min-w-[420px] bg-[#f7f8fa] border-l border-[#e1e4e8] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-6 py-3 bg-white border-b border-[#e1e4e8] shrink-0">
        <SnowflakeLogo className="h-[20px]" />
        <span className="text-[15px] font-semibold text-[#1e293b]">Intelligence</span>
        <span className="ml-auto text-[12px] text-[#94a3b8] font-medium">PRISM Semantic Model</span>
      </div>

      {/* Welcome greeting */}
      <div
        className="px-6 pt-4 pb-2 bg-white shrink-0 cursor-pointer"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="max-w-[900px] mx-auto w-full">
          <div
            className="text-[24px] font-bold leading-tight tracking-tight"
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {greeting}, Jeff
          </div>
          <div
            className="text-[24px] font-bold leading-tight tracking-tight mt-0.5"
            style={{
              background: "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 50%, #79E0F7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            What insights can I help you with?
          </div>
        </div>
      </div>

      {/* Search input */}
      <div id="si-search-input" className="px-6 pt-2 pb-2 bg-white shrink-0">
        <div className="max-w-[900px] mx-auto w-full">
          <div className="flex items-center bg-white border-2 border-[#e1e4e8] rounded-xl px-4 h-12 transition-all duration-300 focus-within:border-[#29B5E8] focus-within:shadow-[0_0_0_3px_rgba(41,181,232,0.1)] hover:border-[#cbd5e1]">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Snowflake Intelligence..."
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !query.trim()}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-[0_4px_16px_rgba(41,181,232,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 100%)",
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agent selector row */}
      <div className="px-6 py-2 bg-white border-b border-[#e1e4e8] shrink-0">
        <div className="max-w-[900px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div id="si-agent-pill" className="flex items-center gap-2 px-3 py-1.5 bg-[#f7f8fa] border border-[#e1e4e8] rounded-full text-[12px] text-[#475569] font-medium">
              <Circle className="w-3 h-3 fill-[#22c55e] text-[#22c55e]" />
              PRISM Semantic Model
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f9ff] border border-[#bae6fd] rounded-full text-[11px] text-[#0369a1] font-medium">
              <Database className="w-3 h-3" />
              Sources: EOTSS Staging
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#f1f5f9] transition-colors">
              <Settings className="w-4 h-4 text-[#94a3b8]" />
            </button>
            <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#f1f5f9] transition-colors">
              <Clock className="w-4 h-4 text-[#94a3b8]" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="px-6 py-2 bg-white border-b border-[#e1e4e8] shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`kpis-${activeScenario}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="max-w-[900px] mx-auto w-full flex gap-3"
          >
            {data.kpis.map((kpi, i) => (
              <div
                key={i}
                className="flex-1 min-w-0 bg-[#f7f8fa] border border-[#e1e4e8] rounded-lg px-3 py-2"
              >
                <div
                  className="text-[16px] font-bold leading-none truncate"
                  style={{ color: getKpiColor(kpi) }}
                >
                  {kpi.value}
                </div>
                <div className="text-[10px] text-[#64748b] font-medium mt-1 truncate">
                  {kpi.label}
                </div>
                {kpi.change && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {kpi.changeDirection === "up" && (
                      <TrendingUp className="w-2.5 h-2.5 text-[#22c55e]" />
                    )}
                    {kpi.changeDirection === "down" && (
                      <TrendingDown className="w-2.5 h-2.5 text-[#dc2626]" />
                    )}
                    {kpi.changeDirection === "neutral" && (
                      <Minus className="w-2.5 h-2.5 text-[#94a3b8]" />
                    )}
                    <span className="text-[9px] text-[#94a3b8] truncate">{kpi.change}</span>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chat messages */}
      <div id="si-chat-area" className="flex-1 overflow-y-auto px-6 py-3.5">
        <div className="max-w-[900px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`msgs-${activeScenario}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <IntelMessages messages={[...data.conversations, ...liveMessages]} />
            </motion.div>
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="self-start max-w-[94%] bg-white border border-[#e1e4e8] rounded-[14px_14px_14px_4px] px-4 py-3 mt-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#29B5E8] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#29B5E8] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#29B5E8] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom chips */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`chips-${activeScenario}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          id="si-chips"
          className="px-6 py-2.5 border-t border-[#e1e4e8] bg-white shrink-0"
        >
          <div className="max-w-[900px] mx-auto w-full flex flex-wrap gap-2">
            {data.chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                disabled={isLoading}
                className="text-[12px] text-[#29B5E8] font-medium bg-gradient-to-r from-[#f0f9ff] to-[#e8f4fd] border border-[#bae6fd] rounded-full px-3 py-1.5 hover:from-[#e0f2fe] hover:to-[#d0ecfb] hover:border-[#29B5E8] hover:shadow-[0_0_12px_rgba(41,181,232,0.2)] transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
