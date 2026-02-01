import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { pageGuides } from "../../lib/pathfinder-config";

function getStorageKey(pageKey: string): string {
  return `prism-guide-${pageKey}-collapsed`;
}

function readCollapsed(pageKey: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(pageKey)) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(pageKey: string, collapsed: boolean): void {
  try {
    localStorage.setItem(getStorageKey(pageKey), String(collapsed));
  } catch {
    // localStorage unavailable
  }
}

interface PageGuideProps {
  pageKey: string;
}

export default function PageGuide({ pageKey }: PageGuideProps) {
  const guide = pageGuides[pageKey];
  const [collapsed, setCollapsed] = useState(() => readCollapsed(pageKey));

  if (!guide) return null;

  // Respect global "show page guides" setting
  try {
    const showGuides = localStorage.getItem("prism-pathfinder-guides");
    if (showGuides === "false") return null;
  } catch {
    // continue rendering
  }

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(pageKey, next);
  };

  return (
    <div className="page-guide">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between cursor-pointer bg-transparent border-none p-0"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[#29B5E8]" strokeWidth={1.5} />
          <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-widest">
            {guide.title}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown size={14} className="text-[#94a3b8]" />
        ) : (
          <ChevronUp size={14} className="text-[#94a3b8]" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-0.5">
          {guide.steps.map((step, index) => (
            <div key={index} className="page-guide-step">
              <div className="page-guide-step-number">{index + 1}</div>
              <div className="page-guide-step-text">{step}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
