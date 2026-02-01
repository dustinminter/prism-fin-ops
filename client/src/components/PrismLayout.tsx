import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Home,
  LogOut,
  Menu,
  TrendingUp,
  User,
  X,
  Landmark,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import IntelligencePanel, { IntelligenceContext } from "./IntelligencePanel";

interface PrismLayoutProps {
  children: React.ReactNode;
  title?: string;
  agencyCode?: string;
  agencyName?: string;
  trustState?: "draft" | "internal" | "client" | "executive";
  hideIntelligencePanel?: boolean;
}

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/cip", icon: Landmark, label: "CIP" },
  { href: "/anomalies", icon: AlertTriangle, label: "Anomalies" },
  { href: "/forecasting", icon: TrendingUp, label: "Forecasting" },
  { href: "/reports", icon: FileText, label: "Reports" },
];

// Map routes to page names for context
const pageNameMap: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/cip": "Capital Investment Plan",
  "/anomalies": "Anomaly Detection",
  "/forecasting": "Consumption Forecasting",
  "/reports": "Executive Reports",
  "/agency": "Agency Drill-Down",
};

export default function PrismLayout({ 
  children, 
  title, 
  agencyCode, 
  agencyName,
  trustState = "draft",
  hideIntelligencePanel = false,
}: PrismLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Build intelligence context from current page state
  const intelligenceContext: IntelligenceContext = useMemo(() => ({
    page: pageNameMap[location] || title || "PRISM",
    agencyCode,
    agencyName,
    trustState,
    fiscalPeriod: new Date().toISOString().slice(0, 7), // Current month
  }), [location, title, agencyCode, agencyName, trustState]);

  return (
    <div className="h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0d1117]/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#58a6ff]" />
              <span className="text-base font-semibold">PRISM</span>
              <span className="hidden sm:inline text-[#8b949e] text-sm">FinOps Intelligence</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 h-8 ${
                      location === item.href
                        ? "bg-[#21262d] text-[#58a6ff]"
                        : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-[#21262d] animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-[#8b949e]" />
                  <span className="text-[#c9d1d9]">{user?.name || user?.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-[#8b949e] hover:text-[#c9d1d9] h-8"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd] h-8"
              >
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#30363d] bg-[#161b22] p-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 ${
                      location === item.href
                        ? "bg-[#21262d] text-[#58a6ff]"
                        : "text-[#8b949e] hover:text-[#c9d1d9]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content Area with Intelligence Panel - Split Dark/Light Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Dark Analytical Canvas (Left) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0d1117] overflow-auto">
          {/* Page Title Bar */}
          {title && (
            <div className="border-b border-[#30363d] bg-[#161b22]">
              <div className="container py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold">{title}</h1>
                    {/* Split indicator */}
                    <span className="text-[10px] text-[#6e7681] uppercase tracking-wider hidden lg:inline px-2 py-0.5 bg-[#21262d] rounded">
                      Analytical View
                    </span>
                  </div>
                  {agencyName && (
                    <div className="text-sm text-[#8b949e]">
                      Agency: <span className="text-[#c9d1d9]">{agencyName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t border-[#30363d] bg-[#0d1117] py-4 mt-auto">
            <div className="container">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8b949e]">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-[#58a6ff]" />
                  <span>PRISM FinOps Intelligence</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Powered by Snowflake Cortex AI</span>
                  <span>•</span>
                  <span>Data from USAspending.gov</span>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Light Advisory Surface (Right) - Intelligence Panel */}
        {!hideIntelligencePanel && (
          <div className="hidden lg:flex lg:flex-col flex-shrink-0 min-h-0 border-l-4 border-[#0969da]/30 shadow-xl">
            {/* Advisory Header Indicator */}
            <div className="bg-white px-4 py-2 border-b border-[#d0d7de] flex-shrink-0">
              <span className="text-[10px] text-[#656d76] uppercase tracking-wider font-medium">
                Advisory Surface
              </span>
            </div>
            <IntelligencePanel context={intelligenceContext} />
          </div>
        )}
      </div>
    </div>
  );
}
