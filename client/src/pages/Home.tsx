import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Database,
  FileText,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import PrismLayout from "@/components/PrismLayout";
import DataTunnelHero from "@/components/DataTunnelHero";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <PrismLayout hideIntelligencePanel>
      {/* Hero Section with Data Tunnel Visualization */}
      <section className="relative overflow-hidden min-h-[600px]">
        {/* Three.js Data Tunnel Background */}
        <div className="absolute inset-0">
          <DataTunnelHero className="opacity-80" />
        </div>
        
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/90 via-[#0d1117]/50 to-transparent" />
        
        {/* Hero Content */}
        <div className="container py-20 md:py-28 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#21262d]/80 backdrop-blur border border-[#30363d] text-sm">
                <Zap className="h-4 w-4 text-[#d29922]" />
                <span className="text-[#8b949e]">Powered by Snowflake Cortex AI</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Predictive Risk Intelligence</span>
              <br />
              for Federal Spending
            </h1>
            <p className="text-lg text-[#c9d1d9] mb-4 leading-relaxed">
              PRISM brings all signal inflow into one continuous stream.
            </p>
            <p className="text-base text-[#8b949e] mb-8 leading-relaxed max-w-xl">
              AI-powered insights into federal spending patterns, consumption
              forecasting, and anomaly detection. Built for CFOs and budget analysts.
            </p>
            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd] gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd] gap-2"
                >
                  <a href={getLoginUrl()}>
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#30363d] bg-[#0d1117]/50 backdrop-blur text-[#c9d1d9] hover:bg-[#21262d] gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom caption */}
        <div className="absolute bottom-4 left-0 right-0 text-center z-10">
          <p className="text-xs text-[#484f58] tracking-wide">
            Continuous signal flow across federated data sources
          </p>
        </div>
      </section>

      {/* How PRISM Works - Stage breakdown */}
      <section className="border-t border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="container py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">How PRISM Works</h2>
            <p className="text-[#8b949e] text-sm max-w-xl mx-auto">
              Data flows through four stages, from raw federal spending data to executive-ready insights
            </p>
          </div>

          {/* Signal Flow Visualization */}
          <div className="relative">
            {/* Flow Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#30363d] via-[#58a6ff]/50 to-[#3fb950]/50 -translate-y-1/2 hidden md:block" />
            
            {/* Animated Pulse */}
            <div className="absolute top-1/2 left-0 h-2 w-2 rounded-full bg-[#58a6ff] -translate-y-1/2 hidden md:block animate-pulse-flow" />

            <div className="grid md:grid-cols-4 gap-6 relative">
              <SignalStage
                icon={Database}
                stage="1"
                title="Ingest"
                description="USAspending.gov data flows into Snowflake"
                color="#8b949e"
                delay={0}
              />
              <SignalStage
                icon={Brain}
                stage="2"
                title="Analyze"
                description="Cortex AI detects patterns and anomalies"
                color="#58a6ff"
                delay={1}
              />
              <SignalStage
                icon={AlertTriangle}
                stage="3"
                title="Alert"
                description="Risk signals surface with severity levels"
                color="#d29922"
                delay={2}
              />
              <SignalStage
                icon={FileText}
                stage="4"
                title="Report"
                description="Executive narratives with trust state workflow"
                color="#3fb950"
                delay={3}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Simplified */}
      <section className="border-t border-[#30363d]">
        <div className="container py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={TrendingUp}
              title="Consumption Forecasting"
              description="6-month spending predictions per agency with confidence intervals"
              color="accent"
            />
            <FeatureCard
              icon={AlertTriangle}
              title="Anomaly Detection"
              description="Identify spending deviations >20% from expected values"
              color="warning"
            />
            <FeatureCard
              icon={FileText}
              title="Executive Narratives"
              description="AI-generated summaries with evidence bundles"
              color="success"
            />
            <FeatureCard
              icon={Building2}
              title="Agency Deep Dive"
              description="Drill down into agency spending trends and recipients"
              color="accent"
            />
            <FeatureCard
              icon={Shield}
              title="Risk Assessment"
              description="Concentration risk, volatility scoring, and compliance"
              color="critical"
            />
            <FeatureCard
              icon={Sparkles}
              title="PRISM Intelligence"
              description="Ask questions about any view with guided prompts"
              color="success"
            />
          </div>
        </div>
      </section>

      {/* Stats Section - Compact */}
      <section className="border-t border-[#30363d] bg-[#161b22]">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard label="Federal Agencies" value="24+" />
            <StatCard label="Awards Tracked" value="1M+" />
            <StatCard label="Forecast Accuracy" value="95%" />
            <StatCard label="Anomalies Detected" value="Real-time" />
          </div>
        </div>
      </section>

      {/* CTA Section - Simplified */}
      <section className="border-t border-[#30363d]">
        <div className="container py-16">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-[#8b949e] mb-6">
              Start analyzing federal spending patterns with AI-powered insights.
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd] gap-2">
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-[#58a6ff] text-[#0d1117] hover:bg-[#388bfd] gap-2"
              >
                <a href={getLoginUrl()}>
                  Sign In to Get Started
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse-flow {
          0% {
            left: 0%;
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        .animate-pulse-flow {
          animation: pulse-flow 3s ease-in-out infinite;
        }
      `}</style>
    </PrismLayout>
  );
}

function SignalStage({
  icon: Icon,
  stage,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ElementType;
  stage: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  return (
    <div 
      className="relative p-6 rounded-lg bg-[#0d1117] border border-[#30363d] text-center transition-all hover:border-[#58a6ff]/50 hover:shadow-lg hover:shadow-[#58a6ff]/5"
      style={{ animationDelay: `${delay * 0.2}s` }}
    >
      {/* Stage Number */}
      <div 
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: color, color: "#0d1117" }}
      >
        {stage}
      </div>
      
      <div 
        className="inline-flex p-3 rounded-lg mb-4 mt-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-[#8b949e] text-sm">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "accent" | "warning" | "success" | "critical";
}) {
  const colorClasses = {
    accent: "text-[#58a6ff] bg-[#58a6ff]/10",
    warning: "text-[#d29922] bg-[#d29922]/10",
    success: "text-[#3fb950] bg-[#3fb950]/10",
    critical: "text-[#f85149] bg-[#f85149]/10",
  };

  return (
    <div className="p-5 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/50 transition-colors">
      <div className={`inline-flex p-2.5 rounded-lg mb-3 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      <p className="text-[#8b949e] text-sm">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-[#58a6ff] mb-1">{value}</div>
      <div className="text-xs text-[#8b949e]">{label}</div>
    </div>
  );
}
