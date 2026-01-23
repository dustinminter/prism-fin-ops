import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, Sparkles, Database, ArrowRight, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { ChatMessage } from '../types';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleSidebar?: () => void;
  isMainSidebarCollapsed?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, onToggleSidebar, isMainSidebarCollapsed }) => {
  const location = useLocation();
  const { filters } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Update suggestions based on route
    if (location.pathname === '/') {
      setSuggestions([
        'Which agencies are trending toward low consumption?',
        'What changed in the last 30 days?',
      ]);
    } else if (location.pathname === '/cip') {
      setSuggestions([
        'Show top variance drivers for DOT',
        'Which line items are under-consuming?',
      ]);
    } else if (location.pathname === '/risks') {
      setSuggestions([
        'Summarize critical findings',
        'Draft an investigation brief',
      ]);
    }
    // Reset conversation on page change? Optional, but keeping history is usually better.
  }, [location.pathname]);

  const handleSend = (text: string) => {
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');

    // Mock Response
    setTimeout(() => {
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Here is the analysis for "${text}" based on current fiscal year data.`,
        citedData: {
          'Fiscal Year': filters.fiscalYear,
          'Agencies Analyzed': '5',
          'Data Freshness': '2 hours ago'
        }
      };
      setMessages((prev) => [...prev, response]);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l border-slate-200 h-[100vh] fixed right-0 top-0 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <Sparkles className="w-4 h-4 text-orange-500 mr-2" />
          PRISM Assistant
        </h3>
        <div className="flex items-center gap-2">

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Welcome State / Suggestions at Top */}
        {messages.length === 0 && (
          <div className="space-y-4 mt-8">
            <div className="text-center px-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="text-slate-900 font-semibold mb-1">How can I help?</h4>
              <p className="text-sm text-slate-500">Ask about consumption risks, agency trends, or variance drivers.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Suggested</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50 transition-all group flex justify-between items-center"
                >
                  <span className="text-sm text-slate-600 group-hover:text-orange-800">{s}</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col space-y-2", msg.role === 'user' ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                msg.role === 'user'
                  ? "bg-slate-800 text-white rounded-br-sm"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
              )}
            >
              {msg.content}
            </div>
            {msg.citedData && (
              <div className="ml-1 mt-1 border-l-2 border-orange-200 pl-3 py-1">
                <div className="flex items-center text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                  <Database className="w-3 h-3 mr-1" /> Cited Data
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(msg.citedData).map(([key, val]) => (
                    <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                      <span className="font-semibold mr-1">{key}:</span> {val}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all shadow-sm"
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inputValue && handleSend(inputValue)}
          />
          <button
            onClick={() => inputValue && handleSend(inputValue)}
            className="absolute right-2 top-2 p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputValue}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
