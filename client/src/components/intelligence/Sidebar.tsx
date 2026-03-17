import { useIntelligence } from "@/contexts/IntelligenceContext";
import { scenarios, type ScenarioId } from "@/data/intelligenceData";
import { useAnomalyBadgeCount } from "@/hooks/useLiveScenarioData";
import { MessageSquarePlus, Circle, Layers, History, Trash2, MessageSquare } from "lucide-react";

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Sidebar() {
  const { 
    activeScenario, 
    isNewChat, 
    setScenario, 
    startNewChat,
    conversations,
    activeConversation,
    loadConversation,
    deleteConversation,
  } = useIntelligence();
  
  const liveAnomalyCount = useAnomalyBadgeCount();

  return (
    <div className="w-[240px] bg-[#0d1117] border-r border-[#21262d] py-4 shrink-0 overflow-y-auto flex flex-col">
      <div className="px-3 mb-4">
        <button
          onClick={startNewChat}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-200
            ${isNewChat && !activeConversation
              ? "bg-[#1f6feb]/15 border-[#1f6feb]/30 text-[#58a6ff]"
              : "bg-[#161b22] border-[#21262d] text-[#c9d1d9] hover:bg-[#1c2333] hover:border-[#30363d]"
            }`}
        >
          <MessageSquarePlus className="w-4 h-4 text-[#29B5E8]" />
          New Chat
        </button>
      </div>

      <div className="px-3 mb-3">
        <div className="text-[10px] font-semibold tracking-[1px] uppercase text-[#484f58] mb-2 px-1">
          Agent
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22]/60 border border-[#21262d] rounded-lg text-[11px] text-[#8b949e]">
          <Circle className="w-2.5 h-2.5 fill-[#3fb950] text-[#3fb950] shrink-0" />
          <span className="font-medium text-[#c9d1d9] truncate">PRISM_EOTSS_FINOPS</span>
        </div>
      </div>

      <div className="h-px bg-[#21262d] mx-4 mb-3" />

      {conversations.length > 0 && (
        <>
          <div className="px-3 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[1px] uppercase text-[#484f58] mb-2 px-1">
              <History className="w-3 h-3" />
              Recent
            </div>
          </div>
          <div className="mb-3">
            {conversations.slice(0, 5).map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-md text-[13px] text-left transition-all duration-200 cursor-pointer
                    ${isActive
                      ? "bg-[#1f6feb]/15 text-[#58a6ff] shadow-[inset_0_0_0_1px_rgba(31,111,235,0.25)]"
                      : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
                    }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[12px]">{conv.title}</div>
                    <div className="text-[10px] text-[#484f58]">{formatTimeAgo(conv.updatedAt)}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#21262d] rounded transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-[#f85149]" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="h-px bg-[#21262d] mx-4 mb-3" />
        </>
      )}

      <div className="px-3 mb-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[1px] uppercase text-[#484f58] mb-2 px-1">
          <Layers className="w-3 h-3" />
          Capabilities
        </div>
      </div>
      {scenarios.map((s) => {
        const Icon = s.icon;
        const isActive = !isNewChat && !activeConversation && activeScenario === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setScenario(s.id as ScenarioId)}
            title={`Pre-built analysis: ${s.label}`}
            className={`flex items-center gap-2.5 w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-md text-[13px] text-left transition-all duration-200
              ${isActive
                ? "bg-[#1f6feb]/15 text-[#58a6ff] shadow-[inset_0_0_0_1px_rgba(31,111,235,0.25)]"
                : "text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]"
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{s.label}</span>
            {s.id === "anomalies" && liveAnomalyCount !== undefined && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-[#f85149]/15 text-[#f85149]">
                {liveAnomalyCount}
              </span>
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      <div className="px-4 py-2 text-[10px] text-[#484f58]">
        Powered by <span className="text-[#29B5E8]">Snowflake</span> · Archetype
      </div>
    </div>
  );
}
