import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { ScenarioId, ChatMessage } from "@/data/intelligenceData";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  scenarioId?: ScenarioId;
  createdAt: number;
  updatedAt: number;
}

interface IntelligenceContextValue {
  activeScenario: ScenarioId;
  isNewChat: boolean;
  setScenario: (id: ScenarioId) => void;
  startNewChat: () => void;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  currentMessages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

const STORAGE_KEY = "prism-conversations";
const MAX_CONVERSATIONS = 20;

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === "user");
  if (!firstUserMsg) return "New conversation";
  const text = firstUserMsg.content;
  return text.length > 40 ? text.slice(0, 40) + "…" : text;
}

function loadFromStorage(): Conversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Conversation[];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveToStorage(conversations: Conversation[]) {
  try {
    const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    console.warn("Failed to save conversations to localStorage");
  }
}

const IntelligenceContext = createContext<IntelligenceContextValue | null>(null);

export function IntelligenceProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("spending");
  const [isNewChat, setIsNewChat] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  
  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    setConversations(loadFromStorage());
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      saveToStorage(conversations);
    }
  }, [conversations]);
  
  useEffect(() => {
    activeConvIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation]);

  const setScenario = useCallback((id: ScenarioId) => {
    setActiveScenario(id);
    setIsNewChat(false);
    setActiveConversation(null);
    activeConvIdRef.current = null;
    setCurrentMessages([]);
  }, []);

  const startNewChat = useCallback(() => {
    setIsNewChat(true);
    setActiveConversation(null);
    activeConvIdRef.current = null;
    setCurrentMessages([]);
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setCurrentMessages(prev => {
      const updated = [...prev, message];
      
      setConversations(convs => {
        const now = Date.now();
        const currentConvId = activeConvIdRef.current;
        
        if (currentConvId) {
          return convs.map(c => 
            c.id === currentConvId 
              ? { ...c, messages: updated, title: deriveTitle(updated), updatedAt: now }
              : c
          ).sort((a, b) => b.updatedAt - a.updatedAt);
        } else {
          const newConv: Conversation = {
            id: generateId(),
            title: deriveTitle(updated),
            messages: updated,
            scenarioId: undefined,
            createdAt: now,
            updatedAt: now,
          };
          setActiveConversation(newConv);
          activeConvIdRef.current = newConv.id;
          setIsNewChat(false);
          return [newConv, ...convs].slice(0, MAX_CONVERSATIONS);
        }
      });
      
      return updated;
    });
  }, []);

  const loadConversation = useCallback((id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveConversation(conv);
      activeConvIdRef.current = conv.id;
      setCurrentMessages(conv.messages);
      setIsNewChat(false);
      if (conv.scenarioId) {
        setActiveScenario(conv.scenarioId);
      }
    }
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvIdRef.current === id) {
      setActiveConversation(null);
      activeConvIdRef.current = null;
      setCurrentMessages([]);
      setIsNewChat(true);
    }
  }, []);

  return (
    <IntelligenceContext.Provider value={{
      activeScenario,
      isNewChat,
      setScenario,
      startNewChat,
      conversations,
      activeConversation,
      currentMessages,
      addMessage,
      loadConversation,
      deleteConversation,
    }}>
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used inside IntelligenceProvider");
  return ctx;
}
