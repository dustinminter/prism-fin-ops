import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PieChart, AlertTriangle, Hexagon, ChevronLeft, ChevronRight, FileSearch } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navItems = [
    { name: 'Statewide Overview', path: '/', icon: LayoutDashboard },
    { name: 'Plan vs Actuals', path: '/cip', icon: PieChart },
    { name: 'Findings Viewer', path: '/risks', icon: AlertTriangle },
    { name: 'Bid Solicitations', path: '/bids', icon: FileSearch },
  ];

  return (
    <aside className={cn(
      "bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-20 transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn(
        "h-16 flex items-center border-b border-slate-100 transition-all duration-300",
        isCollapsed ? "px-4 justify-center" : "px-6"
      )}>
        <Hexagon className="w-8 h-8 text-orange-500 flex-shrink-0 fill-orange-500/10" />
        {!isCollapsed && <span className="text-xl font-bold text-slate-800 tracking-tight ml-3 animate-in fade-in duration-300">PRISM</span>}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isCollapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <item.icon className={cn("w-5 h-5 opacity-80", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span className="animate-in fade-in duration-300">{item.name}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.name}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 relative">
        <button
          onClick={onToggle}
          className="absolute -right-3 top-[-12px] w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm z-30 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={cn(
          "bg-slate-50 rounded-xl p-3 transition-all duration-300",
          isCollapsed ? "h-10 flex items-center justify-center px-0" : ""
        )}>
          {!isCollapsed ? (
            <div className="animate-in fade-in duration-300">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">System Status</p>
              <div className="flex items-center text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Operational
              </div>
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Operational"></div>
          )}
        </div>
      </div>
    </aside>
  );
};