import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Paperclip, Mic, MessageSquare, Brain } from "lucide-react";
import { useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarioMap, type ChatMessage } from "@/data/intelligenceData";
import { trpc } from "@/lib/trpc";
import { buildChartDataFromResults } from "./chartUtils";
import IntelMessages from "./IntelMessages";
import { SnowflakeIcon } from "./SnowflakeIcon";

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

/* ─── Chat Input Bar ─── */
function ChatInput({
  query,
  setQuery,
  isLoading,
  onSend,
  inputRef,
  centered,
}: {
  query: string;
  setQuery: (v: string) => void;
  isLoading: boolean;
  onSend: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "w-full max-w-[740px]" : "max-w-[900px] mx-auto w-full"}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl px-4 pt-3 pb-2 transition-all duration-300 focus-within:border-[#29B5E8]/50 focus-within:shadow-[0_0_0_1px_rgba(41,181,232,0.15)]">
        {/* Input row */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask Snowflake Intelligence..."
            className="flex-1 bg-transparent border-none text-[15px] text-[#e6edf3] outline-none placeholder:text-[#484f58]"
            style={{ fontFamily: "inherit" }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !query.trim()}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              background: query.trim()
                ? "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 100%)"
                : "transparent",
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-[#29B5E8] animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Pills row */}
        <div className="flex items-center gap-2 mt-2 pb-0.5">
          <button className="text-[#484f58] hover:text-[#8b949e] transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            PRISM_FINOPS_AGENT
          </span>
          <span className="inline-flex items-center text-[12px] px-2.5 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            Sources: Auto
          </span>
          <div className="flex-1" />
          <button className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:border-[#29B5E8]/40 transition-colors">
            <Brain className="w-3.5 h-3.5" />
            Extended thinking
          </button>
          <button className="text-[#484f58] hover:text-[#8b949e] transition-colors">
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex-1 flex flex-col bg-[#0d1117]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* ─── Welcome Screen ─── */
          <div className="flex flex-col items-center justify-center min-h-full px-6">
            <div className="flex flex-col items-center w-full max-w-[740px] -mt-12">
              {/* Greeting */}
              <div className="text-center mb-8">
                <div className="text-[32px] font-semibold text-[#e6edf3] tracking-tight">
                  {greeting}, Dustin
                </div>
                <div
                  className="text-[32px] font-semibold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #29B5E8 0%, #4DD4F7 50%, #79E0F7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  What insights can I help with?
                </div>
              </div>

              {/* Centered input */}
              <ChatInput
                query={query}
                setQuery={setQuery}
                isLoading={isLoading}
                onSend={() => handleSend()}
                inputRef={inputRef}
                centered
              />

              {/* Sample questions */}
              <div className="flex flex-col gap-0 mt-6 w-full max-w-[740px]">
                {data.chips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    disabled={isLoading}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] rounded-lg transition-colors disabled:opacity-50 cursor-pointer border-b border-[#21262d] last:border-b-0"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-[#484f58]" />
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ─── Conversation View ─── */
          <div className="max-w-[900px] mx-auto w-full px-6 py-4">
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
                className="flex items-center gap-2.5 mt-4 px-4 py-3 bg-[#161b22] border border-[#21262d] rounded-xl"
              >
                <Loader2 className="w-4 h-4 text-[#29B5E8] animate-spin" />
                <span className="text-[13px] text-[#8b949e]">{LOADING_STEPS[loadingStep]}</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat input — fixed at bottom (only in conversation view) */}
      {hasMessages && (
        <div className="border-t border-[#21262d] bg-[#0d1117] px-6 py-3 shrink-0">
          <ChatInput
            query={query}
            setQuery={setQuery}
            isLoading={isLoading}
            onSend={() => handleSend()}
            inputRef={inputRef}
          />
        </div>
      )}
    </div>
  );
}
