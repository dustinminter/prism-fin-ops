import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, DollarSign, FileText, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useState, useEffect } from "react";

export default function AgencyDrillDown() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const agencyCode = params.code;

  const { data: agencies, isLoading: loadingAgencies } = trpc.prism.getAgencies.useQuery();
  const { data: deepDive, isLoading: loadingDeepDive } = trpc.prism.getAgencyDeepDive.useQuery(
    { agencyCode: agencyCode || "" },
    { enabled: !!agencyCode }
  );
  const { data: forecast, isLoading: loadingForecast } = trpc.prism.getConsumptionForecast.useQuery(
    { agencyCode: agencyCode },
    { enabled: !!agencyCode }
  );

  const selectedAgency = agencies?.find((a) => a.code === agencyCode);

  const handleAgencyChange = (code: string) => {
    setLocation(`/agency/${code}`);
  };

  return (
    <PrismLayout title="Agency Analysis">
      <div className="container py-8">
        {/* Navigation & Agency Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-[#8b949e] hover:text-[#c9d1d9]">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[#58a6ff]" />
            <Select value={agencyCode} onValueChange={handleAgencyChange}>
              <SelectTrigger className="w-[300px] bg-[#161b22] border-[#30363d]">
                <SelectValue placeholder="Select an agency" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                {loadingAgencies ? (
                  <div className="p-4">
                    <Skeleton className="h-6 w-full bg-[#21262d]" />
                  </div>
                ) : (
                  agencies?.slice(0, 50).map((agency) => (
                    <SelectItem key={agency.code} value={agency.code}>
                      {agency.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!agencyCode ? (
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-[#8b949e]" />
              <h3 className="text-lg font-semibold text-[#c9d1d9] mb-2">Select an Agency</h3>
              <p className="text-[#8b949e]">Choose an agency from the dropdown above to view detailed analytics</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Agency Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#c9d1d9] mb-2">
                {selectedAgency?.name || agencyCode}
              </h2>
              <p className="text-[#8b949e]">Agency Code: {agencyCode}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <SummaryCard
                title="Total Spending"
                value={deepDive?.summary.totalSpending}
                format="currency"
                icon={DollarSign}
                loading={loadingDeepDive}
              />
              <SummaryCard
                title="Award Count"
                value={deepDive?.summary.awardCount}
                format="number"
                icon={FileText}
                loading={loadingDeepDive}
              />
              <SummaryCard
                title="Avg Award Size"
                value={deepDive?.summary.avgAwardSize}
                format="currency"
                icon={TrendingUp}
                loading={loadingDeepDive}
              />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Spending Trend */}
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-[#c9d1d9]">Monthly Spending Trend</CardTitle>
                  <CardDescription className="text-[#8b949e]">
                    12-month spending history with forecast overlay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDeepDive || loadingForecast ? (
                    <Skeleton className="h-[300px] bg-[#21262d]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={[
                          ...(deepDive?.monthlyTrend.map((m) => ({
                            month: m.month,
                            actual: m.spending / 1e6,
                            forecast: null,
                          })) || []),
                          ...(forecast?.forecast.map((f) => ({
                            month: f.date.substring(0, 7),
                            actual: null,
                            forecast: f.predicted / 1e6,
                            lower: f.lower / 1e6,
                            upper: f.upper / 1e6,
                          })) || []),
                        ]}
                      >
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="month" stroke="#8b949e" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#8b949e" tickFormatter={(v) => `$${v}M`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
                          formatter={(value: number) => [`$${value?.toFixed(2)}M`]}
                        />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="#58a6ff"
                          fillOpacity={1}
                          fill="url(#colorActual)"
                          name="Actual"
                          connectNulls={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="forecast"
                          stroke="#3fb950"
                          strokeDasharray="5 5"
                          fillOpacity={1}
                          fill="url(#colorForecast)"
                          name="Forecast"
                          connectNulls={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Risk Indicators */}
              <Card className="bg-[#161b22] border-[#30363d]">
                <CardHeader>
                  <CardTitle className="text-[#c9d1d9]">Risk Indicators</CardTitle>
                  <CardDescription className="text-[#8b949e]">
                    Key risk metrics for this agency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDeepDive ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 bg-[#21262d]" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deepDive?.riskIndicators.map((indicator) => (
                        <RiskIndicatorCard key={indicator.metric} indicator={indicator} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Recipients Table */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-[#c9d1d9]">Top 10 Recipients</CardTitle>
                <CardDescription className="text-[#8b949e]">
                  Highest funded recipients for this agency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDeepDive ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 bg-[#21262d]" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#30363d]">
                          <th className="text-left py-3 px-4 text-[#8b949e] font-medium">Rank</th>
                          <th className="text-left py-3 px-4 text-[#8b949e] font-medium">Recipient</th>
                          <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Amount</th>
                          <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Awards</th>
                          <th className="text-left py-3 px-4 text-[#8b949e] font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deepDive?.topRecipients.map((recipient, index) => {
                          const totalSpending = deepDive.summary.totalSpending;
                          const share = totalSpending > 0 ? (recipient.amount / totalSpending) * 100 : 0;
                          return (
                            <tr key={recipient.name} className="border-b border-[#30363d]/50 hover:bg-[#21262d]">
                              <td className="py-3 px-4 text-[#8b949e]">#{index + 1}</td>
                              <td className="py-3 px-4 text-[#c9d1d9]">{recipient.name}</td>
                              <td className="py-3 px-4 text-right font-mono text-[#3fb950]">
                                ${(recipient.amount / 1e6).toFixed(2)}M
                              </td>
                              <td className="py-3 px-4 text-right text-[#8b949e]">
                                {recipient.awardCount.toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-[#21262d] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#58a6ff] rounded-full"
                                      style={{ width: `${Math.min(share, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-[#8b949e] w-12 text-right">
                                    {share.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PrismLayout>
  );
}

function SummaryCard({
  title,
  value,
  format,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | undefined;
  format: "currency" | "number";
  icon: React.ElementType;
  loading: boolean;
}) {
  const formatValue = (v: number | undefined) => {
    if (v === undefined) return "—";
    if (format === "currency") {
      if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toLocaleString()}`;
    }
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
  };

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8b949e] mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 bg-[#21262d]" />
            ) : (
              <p className="text-2xl font-bold text-[#c9d1d9]">{formatValue(value)}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#21262d]">
            <Icon className="h-5 w-5 text-[#58a6ff]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskIndicatorCard({ indicator }: { indicator: { metric: string; status: string; value: number } }) {
  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    high: { bg: "bg-severity-critical", text: "text-[#f85149]", icon: "#f85149" },
    low: { bg: "bg-severity-warning", text: "text-[#d29922]", icon: "#d29922" },
    normal: { bg: "bg-severity-success", text: "text-[#3fb950]", icon: "#3fb950" },
    healthy: { bg: "bg-severity-success", text: "text-[#3fb950]", icon: "#3fb950" },
  };

  const colors = statusColors[indicator.status] || statusColors.normal;

  return (
    <div className={`p-4 rounded-lg border ${colors.bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8b949e] mb-1">{indicator.metric}</p>
          <p className="text-lg font-semibold text-[#c9d1d9]">
            {indicator.value?.toFixed(indicator.metric.includes("Diversity") ? 0 : 2)}
            {indicator.metric.includes("Concentration") || indicator.metric.includes("Volatility") ? "%" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium capitalize ${colors.text}`}>{indicator.status}</span>
          {indicator.status === "high" || indicator.status === "low" ? (
            <AlertTriangle className="h-5 w-5" style={{ color: colors.icon }} />
          ) : (
            <TrendingUp className="h-5 w-5" style={{ color: colors.icon }} />
          )}
        </div>
      </div>
    </div>
  );
}
