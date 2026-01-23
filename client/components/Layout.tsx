import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatSidebar } from './ChatSidebar';
import { Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Sparkles } from 'lucide-react';

export const Layout = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7fb] flex overflow-x-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <div className={cn(
        "flex-1 relative transition-all duration-300 min-w-0",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <main className="w-full">
          <Outlet />
        </main>

        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-orange-700 transition-all hover:scale-110 active:scale-95 z-30 group"
          >
            <Sparkles className="w-6 h-6 fill-white/20" />
            <div className="absolute right-full mr-3 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Ask PRISM AI
            </div>
          </button>
        )}

        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMainSidebarCollapsed={isSidebarCollapsed}
        />
      </div>
    </div>
  );
};
