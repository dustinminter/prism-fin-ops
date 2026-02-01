import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sparkles,
  Send,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  Shield,
  FileText,
  Loader2,
  Bot,
  User,
  Info,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  HelpCircle,
  Compass,
  Database,
  Table,
  Code,
  Download,
  Copy,
  Check,
  Clock,
  Zap,
  MessageSquare,
  Search,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import DataSourceDiagram from "./DataSourceDiagram";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Context types for the intelligence panel
export interface IntelligenceContext {
  page: string;
  agencyCode?: string;
  agencyName?: string;
  fiscalPeriod?: string;
  trustState?: "draft" | "internal" | "client" | "executive";
  filters?: Record<string, string>;
  selectedData?: any;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  citations?: string[];
  trustState?: string;
  agreementBasis?: string;
  queryResult?: QueryResultData;
}

interface QueryResultData {
  generatedSQL: string;
  results: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  rowCount: number;
  executionTimeMs: number;
  explanation: string;
  suggestedFollowUps: string[];
  visualization?: {
    type: "bar" | "line" | "pie" | "table" | "metric";
    config: Record<string, unknown>;
  };
}

interface IntelligencePanelProps {
  context: IntelligenceContext;
  onContextChange?: (context: IntelligenceContext) => void;
}

// Page-specific guided prompts
const GUIDED_PROMPTS: Record<string, { icon: React.ElementType; text: string; query: string }[]> = {
  "Home": [
    { icon: TrendingUp, text: "What changed this month?", query: "What are the key changes in federal spending this month?" },
    { icon: AlertTriangle, text: "Are there emerging risks?", query: "Are there any emerging risks or anomalies I should be aware of?" },
    { icon: BarChart3, text: "Summarize current state", query: "Provide a high-level summary of the current federal spending landscape" },
    { icon: Compass, text: "Where should I focus?", query: "Based on current data, where should I focus my attention?" },
  ],
  "Dashboard": [
    { icon: Database, text: "Top 10 agencies by spending", query: "Show me the top 10 agencies by total spending" },
    { icon: TrendingUp, text: "Spending by award type", query: "What is the breakdown of spending by award type?" },
    { icon: AlertTriangle, text: "Largest recent awards", query: "Show me the 10 largest awards from the past month" },
    { icon: FileText, text: "Summarize for an executive", query: "Summarize this dashboard view for an executive briefing" },
  ],
  "Anomaly Detection": [
    { icon: AlertTriangle, text: "Critical anomalies", query: "Show all critical severity anomalies" },
    { icon: HelpCircle, text: "Why did this happen?", query: "Explain the root causes of the current anomalies" },
    { icon: Database, text: "Anomalies by agency", query: "List anomalies grouped by agency" },
    { icon: FileText, text: "Prepare investigation brief", query: "Prepare a brief for investigating the top anomalies" },
  ],
  "Consumption Forecasting": [
    { icon: TrendingUp, text: "6-month forecast", query: "Show the spending forecast for the next 6 months" },
    { icon: AlertTriangle, text: "Agencies exceeding forecast", query: "Which agencies are trending above their forecasted spending?" },
    { icon: Database, text: "Forecast confidence levels", query: "Show forecast confidence intervals by agency" },
    { icon: FileText, text: "Summarize for planning", query: "Summarize the forecast insights for budget planning purposes" },
  ],
  "Executive Reports": [
    { icon: FileText, text: "Generate executive summary", query: "Generate a comprehensive executive summary of current federal spending" },
    { icon: Database, text: "Key metrics overview", query: "Show total spending, award count, and average award size" },
    { icon: AlertTriangle, text: "Risk summary for executives", query: "Summarize the top risks for executive awareness" },
    { icon: Compass, text: "Strategic recommendations", query: "What strategic recommendations should be highlighted?" },
  ],
  "Agency Drill-Down": [
    { icon: BarChart3, text: "Agency spending trend", query: "Show monthly spending trend for this agency" },
    { icon: Database, text: "Top recipients", query: "Who are the top 10 recipients for this agency?" },
    { icon: AlertTriangle, text: "Agency-specific risks", query: "What are the specific risks for this agency?" },
    { icon: FileText, text: "Prepare agency brief", query: "Prepare a comprehensive brief for this agency" },
  ],
  "Capital Investment Plan": [
    { icon: Database, text: "CIP line items", query: "Show all capital investment plan line items" },
    { icon: TrendingUp, text: "Planned vs actual", query: "Compare planned vs actual spending for CIP programs" },
    { icon: AlertTriangle, text: "Over budget programs", query: "Which programs are over budget?" },
    { icon: FileText, text: "CIP summary", query: "Summarize the capital investment plan status" },
  ],
};

// Data query prompts - questions that trigger SQL execution
const DATA_QUERY_PATTERNS = [
  "show", "list", "get", "find", "what is", "what are", "how many", "how much",
  "top", "bottom", "largest", "smallest", "total", "average", "count",
  "compare", "breakdown", "by agency", "by type", "by recipient"
];

// First-run guidance message
const FIRST_RUN_MESSAGE = `PRISM Intelligence can answer questions about your data.
Try asking about spending trends, anomalies, or specific agencies.`;

// Map pages to their primary data objects for lineage
function getTargetObjectForPage(page: string): string {
  const pageObjectMap: Record<string, string> = {
    "Home": "V_AGENCY_SPEND_MONTHLY",
    "Dashboard": "V_AGENCY_SPEND_MONTHLY",
    "Capital Investment Plan": "V_CIP_LINE_ITEMS",
    "Anomaly Detection": "V_ANOMALIES",
    "Consumption Forecasting": "V_FORECASTS",
    "Executive Reports": "V_EXEC_NARRATIVES",
    "Agency Drill-Down": "V_AGENCY_SPEND_MONTHLY",
  };
  return pageObjectMap[page] || "V_AGENCY_SPEND_MONTHLY";
}

// Check if query is a data query
function isDataQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return DATA_QUERY_PATTERNS.some(pattern => lowerQuery.includes(pattern));
}

// Local storage keys for persistence
const FIRST_RUN_KEY = "prism-intelligence-first-run";
const PANEL_STATE_KEY = "prism-intelligence-panel-state";
const MESSAGES_KEY = "prism-intelligence-messages";
const QUERY_HISTORY_KEY = "prism-intelligence-query-history";

// Voice recording states
type VoiceState = "idle" | "recording" | "processing";

// Chart colors
const CHART_COLORS = ["#0969da", "#1a7f37", "#bf8700", "#cf222e", "#8250df", "#656d76"];

export default function IntelligencePanel({ context, onContextChange }: IntelligencePanelProps) {
  const { user, isAuthenticated } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(PANEL_STATE_KEY);
    return saved === "collapsed";
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "data">("chat");
  const [queryHistory, setQueryHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(QUERY_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Voice input state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateNarrative = trpc.prism.generateExecutiveNarrative.useMutation();
  const executeNLQuery = trpc.prism.executeNaturalLanguageQuery.useMutation();
  const chatWithAI = trpc.prism.chatWithIntelligence.useMutation();

  // Persist panel state
  useEffect(() => {
    localStorage.setItem(PANEL_STATE_KEY, isCollapsed ? "collapsed" : "expanded");
  }, [isCollapsed]);

  // Persist messages (keep last 20)
  useEffect(() => {
    const toSave = messages.slice(-20);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(toSave));
  }, [messages]);

  // Persist query history
  useEffect(() => {
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(queryHistory.slice(-10)));
  }, [queryHistory]);

  // Check for first-run on mount
  useEffect(() => {
    const hasSeenFirstRun = localStorage.getItem(FIRST_RUN_KEY);
    if (!hasSeenFirstRun) {
      setShowFirstRun(true);
    }
  }, []);

  const dismissFirstRun = () => {
    localStorage.setItem(FIRST_RUN_KEY, "true");
    setShowFirstRun(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get prompts for current page
  const currentPrompts = GUIDED_PROMPTS[context.page] || GUIDED_PROMPTS["Home"];

  // Clear conversation handler
  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem(MESSAGES_KEY);
  };

  const handleSend = async (queryText?: string) => {
    const query = queryText || input;
    if (!query.trim() || isLoading) return;

    if (!isAuthenticated) {
      toast.error("Please sign in to use PRISM Intelligence");
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add to query history
    setQueryHistory((prev) => {
      const filtered = prev.filter(q => q !== query);
      return [query, ...filtered].slice(0, 10);
    });

    // Dismiss first-run after first interaction
    if (showFirstRun) {
      dismissFirstRun();
    }

    try {
      const lowerQuery = query.toLowerCase();

      // Check if this is a data query that should execute SQL
      if (isDataQuery(query)) {
        // Execute natural language query
        const result = await executeNLQuery.mutateAsync({ query });

        const assistantMessage: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: result.explanation,
          timestamp: new Date(),
          trustState: result.governanceMetadata?.trustState,
          agreementBasis: "Cortex SQL Generation",
          queryResult: {
            generatedSQL: result.generatedSQL,
            results: result.results,
            columns: result.columns,
            rowCount: result.rowCount,
            executionTimeMs: result.executionTimeMs,
            explanation: result.explanation,
            suggestedFollowUps: result.suggestedFollowUps,
            visualization: result.visualization,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (
        lowerQuery.includes("summary") ||
        lowerQuery.includes("narrative") ||
        lowerQuery.includes("report") ||
        lowerQuery.includes("executive") ||
        lowerQuery.includes("brief") ||
        lowerQuery.includes("summarize")
      ) {
        // Generate executive narrative
        const scope = context.agencyCode ? "agency" : "government-wide";
        const result = await generateNarrative.mutateAsync({
          scope,
          scopeId: context.agencyCode,
        });

        const assistantMessage: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: result.narrative,
          timestamp: new Date(),
          citations: result.citations,
          trustState: result.trustState,
          agreementBasis: "Cortex COMPLETE",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Use Cortex AI for general questions
        const conversationHistory = messages.slice(-6).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const result = await chatWithAI.mutateAsync({
          message: query,
          chatContext: {
            page: context.page,
            agencyCode: context.agencyCode,
            conversationHistory,
          },
        });

        const assistantMessage: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
          trustState: result.trustState,
          agreementBasis: "Cortex AI",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `I encountered an error processing your request. Please try again or rephrase your question.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Failed to process query");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (query: string) => {
    handleSend(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openDeepAnalysis = () => {
    window.open("https://app.snowflake.com", "_blank");
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      setVoiceError(null);
      
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError("Voice input is not supported in this browser");
        toast.error("Voice input is not supported in this browser");
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        // Process the recording
        await processRecording();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setVoiceState("recording");
      setRecordingDuration(0);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast.info("Recording... Click again to stop");
    } catch (error) {
      console.error("Failed to start recording:", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setVoiceError("Microphone access denied. Please allow microphone access.");
        toast.error("Microphone access denied");
      } else {
        setVoiceError("Failed to start recording");
        toast.error("Failed to start recording");
      }
      setVoiceState("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && voiceState === "recording") {
      mediaRecorderRef.current.stop();
      setVoiceState("processing");
    }
  };

  const processRecording = async () => {
    // Voice transcription removed (Manus Forge dependency)
    setVoiceError("Voice transcription is not available in this deployment");
    toast.error("Voice transcription is not available");
    setVoiceState("idle");
  };

  const handleVoiceClick = () => {
    if (voiceState === "idle") {
      startRecording();
    } else if (voiceState === "recording") {
      stopRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Collapsed state - show expand tab
  if (isCollapsed) {
    return (
      <div className="w-10 border-l border-[#d0d7de] bg-[#f6f8fa] flex flex-col items-center py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 text-[#656d76] hover:text-[#0969da] hover:bg-[#f3f4f6]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Show Intelligence</TooltipContent>
        </Tooltip>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#0969da]/10 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-[#0969da]" />
          </div>
          <span className="text-[10px] text-[#656d76] writing-mode-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>
            Intelligence
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[680px] flex-1 min-h-0 border-l border-[#d0d7de] bg-[#f6f8fa] flex flex-col shadow-lg overflow-hidden">
      {/* Header - Light advisory surface */}
      <div className="p-4 border-b border-[#d0d7de] bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0969da]/10">
              <Sparkles className="h-4 w-4 text-[#0969da]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1f2328]">PRISM Intelligence</h2>
              <p className="text-[10px] text-[#656d76]">Interpreting this page using governed data and approved agreements</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearConversation}
                    className="h-7 w-7 text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New conversation</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(true)}
                  className="h-7 w-7 text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hide panel</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Mode tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "data")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-8 bg-[#d0d7de]">
            <TabsTrigger value="chat" className="text-xs text-[#656d76] data-[state=active]:bg-[#0969da] data-[state=active]:text-white data-[state=active]:shadow-sm">
              <MessageSquare className="h-3 w-3 mr-1" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs text-[#656d76] data-[state=active]:bg-[#0969da] data-[state=active]:text-white data-[state=active]:shadow-sm">
              <Database className="h-3 w-3 mr-1" />
              Data Query
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* First-run guidance */}
          {showFirstRun && messages.length === 0 && (
            <div className="bg-white rounded-lg p-4 border border-[#d0d7de] shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#0969da]/10">
                  <Lightbulb className="h-4 w-4 text-[#0969da]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#1f2328] font-medium mb-2">Welcome to PRISM Intelligence</p>
                  <p className="text-xs text-[#656d76] leading-relaxed">PRISM continuously monitors financial and operational signals. Start with a guided question or ask about what you see.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissFirstRun}
                    className="mt-2 text-xs text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                  >
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onFollowUp={handlePromptClick}
            />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-[#656d76]">
              <Loader2 className="h-4 w-4 animate-spin text-[#0969da]" />
              <span className="text-xs">Analyzing with governed data...</span>
            </div>
          )}

          {/* Guided prompts when no messages - ALWAYS visible */}
          {messages.length === 0 && !showFirstRun && (
            <div className="space-y-3">
              <p className="text-xs text-[#656d76] flex items-center gap-1">
                <Compass className="h-3 w-3 text-[#0969da]" />
                Start with a question about {context.page}
              </p>
              <div className="grid gap-2">
                {currentPrompts.map((prompt, i) => (
                  <GuidedPromptButton
                    key={i}
                    icon={prompt.icon}
                    text={prompt.text}
                    onClick={() => handlePromptClick(prompt.query)}
                    disabled={!isAuthenticated || isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick prompts after messages */}
          {messages.length > 0 && !isLoading && (
            <div className="pt-3 border-t border-[#d0d7de]">
              <p className="text-[10px] text-[#656d76] mb-2 font-medium">Continue exploring:</p>
              <div className="flex flex-wrap gap-1.5">
                {currentPrompts.slice(0, 3).map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromptClick(prompt.query)}
                    disabled={!isAuthenticated || isLoading}
                    className="text-xs border-[#d0d7de] text-[#656d76] hover:text-[#1f2328] hover:bg-white hover:border-[#0969da] h-7"
                  >
                    <prompt.icon className="h-3 w-3 mr-1" />
                    {prompt.text}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#d0d7de] bg-white flex-shrink-0">
        {!isAuthenticated ? (
          <div className="text-center py-2">
            <p className="text-xs text-[#656d76] mb-2">Sign in to ask questions</p>
            <Button asChild size="sm" className="bg-[#0969da] text-white hover:bg-[#0860ca]">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Voice recording indicator */}
            {voiceState === "recording" && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f85149] animate-pulse" />
                  <span className="text-xs text-[#f85149] font-medium">Recording</span>
                  <span className="text-xs text-[#656d76]">{formatDuration(recordingDuration)}</span>
                </div>
                <Button
                  onClick={stopRecording}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[#f85149] hover:bg-[#f85149]/20"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
            )}
            
            {/* Voice processing indicator */}
            {voiceState === "processing" && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0969da]/10 border border-[#0969da]/30">
                <Loader2 className="h-4 w-4 animate-spin text-[#0969da]" />
                <span className="text-xs text-[#0969da]">Transcribing your voice...</span>
              </div>
            )}
            
            {/* Voice error message */}
            {voiceError && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30">
                <MicOff className="h-4 w-4 text-[#f85149]" />
                <span className="text-xs text-[#f85149]">{voiceError}</span>
                <Button
                  onClick={() => setVoiceError(null)}
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1 ml-auto text-[#f85149] hover:bg-[#f85149]/20"
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              {/* Voice input button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleVoiceClick}
                    disabled={isLoading || voiceState === "processing"}
                    size="sm"
                    variant="outline"
                    className={`h-9 px-3 border-[#d0d7de] ${
                      voiceState === "recording"
                        ? "bg-[#f85149]/10 border-[#f85149] text-[#f85149] hover:bg-[#f85149]/20"
                        : "text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                    }`}
                  >
                    {voiceState === "recording" ? (
                      <MicOff className="h-4 w-4" />
                    ) : voiceState === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {voiceState === "recording" ? "Stop recording" : "Voice input"}
                </TooltipContent>
              </Tooltip>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={voiceState === "recording" ? "Recording..." : activeTab === "data" ? "Ask about your data..." : "Ask a question..."}
                className="bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] placeholder:text-[#656d76] text-sm h-9 focus:border-[#0969da] focus:ring-[#0969da] focus:bg-white"
                disabled={isLoading || voiceState !== "idle"}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || voiceState !== "idle"}
                size="sm"
                className="bg-[#0969da] text-white hover:bg-[#0860ca] h-9 px-3"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              {activeTab === "data" ? (
                <p className="text-[10px] text-[#656d76]">
                  <Zap className="h-3 w-3 inline mr-1 text-[#0969da]" />
                  Try: "Show top 10 agencies" or use voice input
                </p>
              ) : (
                <p className="text-[10px] text-[#656d76]">
                  <Mic className="h-3 w-3 inline mr-1 text-[#0969da]" />
                  Click the mic to ask with your voice
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* About this data - Data lineage section */}
      <div className="border-t border-[#d0d7de] bg-white flex-shrink-0">
        <DataSourceDiagram targetObject={getTargetObjectForPage(context.page)} />
      </div>

      {/* Footer - Deep analysis link */}
      <div className="px-4 py-2.5 border-t border-[#d0d7de] bg-[#f6f8fa] flex-shrink-0">
        <button
          onClick={openDeepAnalysis}
          className="flex items-center gap-1.5 text-[10px] text-[#656d76] hover:text-[#0969da] transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Explore deeper analysis in Snowflake
        </button>
      </div>
    </div>
  );
}

function GuidedPromptButton({
  icon: Icon,
  text,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-[#d0d7de] text-left hover:bg-[#f6f8fa] hover:border-[#0969da] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <div className="p-2 rounded-lg bg-[#f6f8fa] group-hover:bg-[#0969da]/10 transition-colors">
        <Icon className="h-4 w-4 text-[#656d76] group-hover:text-[#0969da] transition-colors" />
      </div>
      <span className="text-sm text-[#1f2328]">{text}</span>
      <ChevronRight className="h-4 w-4 text-[#656d76] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function MessageBubble({
  message,
  onFollowUp
}: {
  message: Message;
  onFollowUp: (query: string) => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [showSQL, setShowSQL] = useState(false);
  const [showViz, setShowViz] = useState(true);
  const [copied, setCopied] = useState(false);

  const copySQL = () => {
    if (message.queryResult?.generatedSQL) {
      navigator.clipboard.writeText(message.queryResult.generatedSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("SQL copied to clipboard");
    }
  };

  const exportCSV = () => {
    if (message.queryResult?.results) {
      const results = message.queryResult.results;
      if (results.length === 0) return;
      
      const headers = Object.keys(results[0]);
      const csv = [
        headers.join(","),
        ...results.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
      ].join("\n");
      
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prism-query-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported to CSV");
    }
  };

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#656d76] py-2">
        <Info className="h-3 w-3 text-[#0969da]" />
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-[#0969da]/10" : "bg-[#1a7f37]/10"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-[#0969da]" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-[#1a7f37]" />
        )}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block p-3 rounded-lg max-w-full ${
            isUser
              ? "bg-[#0969da]/10 text-[#1f2328]"
              : "bg-white border border-[#d0d7de] text-[#1f2328] shadow-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Query Results Visualization */}
          {message.queryResult && message.queryResult.results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#d0d7de]">
              {/* Execution stats with viz toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 text-[10px] text-[#656d76]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {message.queryResult.executionTimeMs}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <Table className="h-3 w-3" />
                    {message.queryResult.rowCount} rows
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowViz(!showViz)}
                  className="h-5 px-2 text-[10px] text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {showViz ? "Hide Chart" : "Show Chart"}
                  <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showViz ? "" : "-rotate-90"}`} />
                </Button>
              </div>

              {/* Visualization (collapsible) */}
              {showViz && <QueryVisualization queryResult={message.queryResult} />}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSQL(!showSQL)}
                  className="h-6 px-2 text-[10px] text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                >
                  <Code className="h-3 w-3 mr-1" />
                  {showSQL ? "Hide SQL" : "View SQL"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copySQL}
                  className="h-6 px-2 text-[10px] text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy SQL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportCSV}
                  className="h-6 px-2 text-[10px] text-[#656d76] hover:text-[#1f2328] hover:bg-[#f3f4f6]"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export CSV
                </Button>
              </div>

              {/* SQL Preview */}
              {showSQL && (
                <div className="mt-2 p-2 bg-[#f6f8fa] rounded border border-[#d0d7de]">
                  <pre className="text-[10px] text-[#656d76] overflow-x-auto whitespace-pre-wrap">
                    {message.queryResult.generatedSQL}
                  </pre>
                </div>
              )}

              {/* Follow-up suggestions */}
              {message.queryResult.suggestedFollowUps.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#d0d7de]">
                  <p className="text-[10px] text-[#656d76] mb-2">Follow-up questions:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.queryResult.suggestedFollowUps.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => onFollowUp(q)}
                        className="h-6 px-2 text-[10px] border-[#d0d7de] text-[#656d76] hover:text-[#1f2328] hover:border-[#0969da]"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#d0d7de]">
              <p className="text-[10px] text-[#656d76] mb-1">Sources:</p>
              <div className="flex flex-wrap gap-1">
                {message.citations.map((citation, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] border-[#d0d7de] text-[#656d76] bg-[#f6f8fa]"
                  >
                    {citation}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Trust State & Agreement Basis */}
          {(message.trustState || message.agreementBasis) && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-[#656d76]">
              {message.trustState && (
                <span className="flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5 text-[#0969da]" />
                  {message.trustState}
                </span>
              )}
              {message.agreementBasis && (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-[#0969da]" />
                  {message.agreementBasis}
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-[#656d76] mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function QueryVisualization({ queryResult }: { queryResult: QueryResultData }) {
  const { visualization, results, columns } = queryResult;
  
  if (!visualization || results.length === 0) {
    return <DataTable results={results} columns={columns} />;
  }

  switch (visualization.type) {
    case "metric":
      return <MetricCards results={results} />;
    case "bar":
      return <BarChartViz results={results} config={visualization.config} />;
    case "line":
      return <LineChartViz results={results} config={visualization.config} />;
    case "pie":
      return <PieChartViz results={results} config={visualization.config} />;
    default:
      return <DataTable results={results} columns={columns} />;
  }
}

function MetricCards({ results }: { results: Record<string, unknown>[] }) {
  if (results.length === 0) return null;
  const data = results[0];

  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="bg-[#f6f8fa] rounded p-2 border border-[#d0d7de]">
          <p className="text-[10px] text-[#656d76] truncate">{formatColumnName(key)}</p>
          <p className="text-lg font-semibold text-[#1f2328]">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function BarChartViz({ results, config }: { results: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const xAxis = config.xAxis as string || Object.keys(results[0])[0];
  const yAxis = config.yAxis as string || Object.keys(results[0])[1];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={results} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0d7de" />
          <XAxis
            dataKey={xAxis}
            tick={{ fill: "#656d76", fontSize: 10 }}
            tickFormatter={(v) => String(v).slice(0, 12)}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fill: "#656d76", fontSize: 10 }} tickFormatter={formatAxisValue} />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d0d7de", borderRadius: 8 }}
            labelStyle={{ color: "#1f2328" }}
            formatter={(value: any) => [formatValue(value), formatColumnName(yAxis)]}
          />
          <Bar dataKey={yAxis} fill="#0969da" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartViz({ results, config }: { results: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const xAxis = config.xAxis as string || Object.keys(results[0])[0];
  const yAxis = config.yAxis as string || Object.keys(results[0])[1];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={results} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0d7de" />
          <XAxis
            dataKey={xAxis}
            tick={{ fill: "#656d76", fontSize: 10 }}
            tickFormatter={(v) => String(v).slice(0, 10)}
          />
          <YAxis tick={{ fill: "#656d76", fontSize: 10 }} tickFormatter={formatAxisValue} />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d0d7de", borderRadius: 8 }}
            labelStyle={{ color: "#1f2328" }}
            formatter={(value: any) => [formatValue(value), formatColumnName(yAxis)]}
          />
          <Line type="monotone" dataKey={yAxis} stroke="#0969da" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartViz({ results, config }: { results: Record<string, unknown>[]; config: Record<string, unknown> }) {
  const nameKey = config.nameKey as string || Object.keys(results[0])[0];
  const valueKey = config.valueKey as string || Object.keys(results[0])[1];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={results}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={60}
            label={({ name }) => String(name).slice(0, 10)}
            labelLine={false}
          >
            {results.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #d0d7de", borderRadius: 8 }}
            formatter={(value: any) => [formatValue(value), ""]}
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) => <span className="text-[#656d76]">{String(value).slice(0, 15)}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({ results, columns }: { results: Record<string, unknown>[]; columns: { name: string; type: string }[] }) {
  if (results.length === 0) return null;

  const displayResults = results.slice(0, 10);
  const hasMore = results.length > 10;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#d0d7de]">
            {columns.map((col) => (
              <th key={col.name} className="text-left py-1 px-2 text-[#656d76] font-medium">
                {formatColumnName(col.name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayResults.map((row, i) => (
            <tr key={i} className="border-b border-[#d0d7de]/50">
              {columns.map((col) => (
                <td key={col.name} className="py-1 px-2 text-[#1f2328]">
                  {formatValue(row[col.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <p className="text-[10px] text-[#656d76] mt-2 text-center">
          Showing 10 of {results.length} rows. Export CSV for full data.
        </p>
      )}
    </div>
  );
}

// Helper functions
function formatColumnName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }
  return String(value);
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(0)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

// Helper to build contextual responses
function buildContextualResponse(query: string, context: IntelligenceContext): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("change") || lowerQuery.includes("different") || lowerQuery.includes("month")) {
    return `Based on the current ${context.page} view${context.agencyCode ? ` for ${context.agencyCode}` : ""}, here are the key changes:

**What's happening:** Federal spending patterns show notable shifts compared to the previous period. Several agencies have adjusted their obligation rates.

**Why it matters:** These changes may indicate shifting priorities, end-of-fiscal-year spending patterns, or responses to new policy directives.

**Recommended action:** Review the anomaly indicators for any deviations exceeding 20% and consider generating an executive summary for stakeholder communication.`;
  }

  if (lowerQuery.includes("risk") || lowerQuery.includes("concern") || lowerQuery.includes("emerging")) {
    return `Analyzing risk signals for ${context.page}${context.agencyCode ? ` (${context.agencyCode})` : ""}:

**Current risk indicators:**
• Vendor concentration levels are within normal parameters
• Spending volatility shows moderate fluctuation
• No critical anomalies detected in the current period

**What to watch:** Monitor agencies with >30% single-vendor concentration and any spending deviations exceeding baseline forecasts.

**Next step:** Navigate to the Anomalies page for detailed risk breakdowns or ask me to "Prepare investigation brief" for any specific concerns.`;
  }

  if (lowerQuery.includes("focus") || lowerQuery.includes("attention") || lowerQuery.includes("priority")) {
    return `Based on current signals, here's where to focus your attention:

**Immediate priorities:**
1. Review any critical-severity anomalies (>50% deviation)
2. Check forecast confidence bands for upcoming quarters
3. Validate data freshness for key agencies

**Strategic considerations:**
• End-of-quarter spending patterns may require executive briefing
• Vendor diversity metrics should be monitored for concentration risk

**Quick action:** Ask me to "Summarize for an executive" to prepare stakeholder communications.`;
  }

  if (lowerQuery.includes("explain") || lowerQuery.includes("why") || lowerQuery.includes("cause")) {
    return `Let me explain the patterns visible in ${context.page}:

**Context:** The data reflects federal spending obligations as reported through USAspending.gov, governed by established data use agreements.

**Key factors:**
• Seasonal budget cycles influence spending patterns
• Agency-specific mandates drive obligation timing
• Contract modifications affect award amounts

**For deeper analysis:** I can generate a detailed narrative with evidence citations. Ask me to "Generate executive summary" for a comprehensive explanation.`;
  }

  return `I'm here to help you understand ${context.page}${context.agencyCode ? ` for ${context.agencyCode}` : ""}.

**What I can help with:**
• Query your data using natural language
• Explain what's happening in this view
• Identify patterns and anomalies
• Generate reports and summaries

**Try asking:**
• "Show me the top 10 agencies by spending"
• "What is the total award count?"
• "Summarize for an executive"

All responses are governed by approved data use agreements and include evidence citations where applicable.`;
}
