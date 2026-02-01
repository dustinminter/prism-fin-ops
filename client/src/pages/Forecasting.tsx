import PrismLayout from "@/components/PrismLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  Download,
  RefreshCw,
  Settings,
  TrendingUp,
  Building2,
  Calendar,
  Target,
  Percent,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";

export default function Forecasting() {
  const [selectedAgency, setSelectedAgency] = useState<string | undefined>(undefined);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [scenarioAdjustment, setScenarioAdjustment] = useState(0);

  const { data: agencies, isLoading: loadingAgencies } = trpc.prism.getAgencies.useQuery();
  const { data: forecast, isLoading: loadingForecast, refetch } = trpc.prism.getConsumptionForecast.useQuery({
    agencyCode: selectedAgency,
  });

  // Apply scenario adjustment to forecast data
  const adjustedForecast = useMemo(() => {
    if (!forecast) return null;
    const multiplier = 1 + scenarioAdjustment / 100;
    return {
      historical: forecast.historical,
      forecast: forecast.forecast.map((f) => ({
        ...f,
        predicted: f.predicted * multiplier,
        lower: f.lower * multiplier,
        upper: f.upper * multiplier,
      })),
    };
  }, [forecast, scenarioAdjustment]);

  // Combine historical and forecast data for chart
  const chartData = useMemo(() => {
    if (!adjustedForecast) return [];
    return [
      ...adjustedForecast.historical.map((h) => ({
        date: h.date.substring(0, 7),
        actual: h.actual / 1e9,
        forecast: null as number | null,
        lower: null as number | null,
        upper: null as number | null,
      })),
      ...adjustedForecast.forecast.map((f) => ({
        date: f.date.substring(0, 7),
        actual: null as number | null,
        forecast: f.predicted / 1e9,
        lower: f.lower / 1e9,
        upper: f.upper / 1e9,
      })),
    ];
  }, [adjustedForecast]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!adjustedForecast) return null;
    const lastActual = adjustedForecast.historical[adjustedForecast.historical.length - 1]?.actual || 0;
    const avgForecast =
      adjustedForecast.forecast.reduce((sum, f) => sum + f.predicted, 0) /
      adjustedForecast.forecast.length;
    const growthRate = lastActual > 0 ? ((avgForecast - lastActual) / lastActual) * 100 : 0;
    const totalForecast = adjustedForecast.forecast.reduce((sum, f) => sum + f.predicted, 0);

    return {
      lastActual,
      avgForecast,
      growthRate,
      totalForecast,
      forecastPeriods: adjustedForecast.forecast.length,
    };
  }, [adjustedForecast]);

  const handleExportExcel = () => {
    if (!adjustedForecast) return;

    // Create CSV content (Excel compatible)
    const headers = ["Date", "Type", "Amount", "Lower Bound", "Upper Bound"];
    const rows = [
      ...adjustedForecast.historical.map((h) => [h.date, "Historical", h.actual.toFixed(2), "", ""]),
      ...adjustedForecast.forecast.map((f) => [
        f.date,
        "Forecast",
        f.predicted.toFixed(2),
        f.lower.toFixed(2),
        f.upper.toFixed(2),
      ]),
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `spending_forecast_${selectedAgency || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Forecast data exported successfully");
  };

  return (
    <PrismLayout title="Consumption Forecasting">
      <div className="container py-8">
        {/* Configuration Panel */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#c9d1d9] flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Forecast Configuration
                </CardTitle>
                <CardDescription className="text-[#8b949e]">
                  Configure forecast parameters and what-if scenarios
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={!forecast}
                  className="bg-[#3fb950] text-[#0d1117] hover:bg-[#3fb950]/80"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Agency Selection */}
              <div className="space-y-2">
                <Label className="text-[#8b949e]">Agency Filter</Label>
                <Select value={selectedAgency || "all"} onValueChange={(v) => setSelectedAgency(v === "all" ? undefined : v)}>
                  <SelectTrigger className="bg-[#0d1117] border-[#30363d]">
                    <SelectValue placeholder="All agencies" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161b22] border-[#30363d] max-h-[300px]">
                    <SelectItem value="all">All Agencies (Government-wide)</SelectItem>
                    {agencies?.slice(0, 50).map((agency) => (
                      <SelectItem key={agency.code} value={agency.code}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scenario Adjustment */}
              <div className="space-y-2">
                <Label className="text-[#8b949e]">
                  What-If Scenario: {scenarioAdjustment > 0 ? "+" : ""}
                  {scenarioAdjustment}% adjustment
                </Label>
                <Slider
                  value={[scenarioAdjustment]}
                  onValueChange={([v]) => setScenarioAdjustment(v)}
                  min={-50}
                  max={50}
                  step={5}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-[#6e7681]">
                  <span>-50% (Budget Cut)</span>
                  <span>0% (Baseline)</span>
                  <span>+50% (Increase)</span>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <Label className="text-[#8b949e]">Display Options</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#c9d1d9]">Show Confidence Interval</span>
                  <Switch
                    checked={showConfidenceInterval}
                    onCheckedChange={setShowConfidenceInterval}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Last Actual"
            value={stats?.lastActual}
            format="currency"
            icon={Calendar}
            loading={loadingForecast}
          />
          <StatCard
            title="Avg Forecast"
            value={stats?.avgForecast}
            format="currency"
            icon={Target}
            loading={loadingForecast}
          />
          <StatCard
            title="Growth Rate"
            value={stats?.growthRate}
            format="percent"
            icon={TrendingUp}
            loading={loadingForecast}
          />
          <StatCard
            title="Total Forecast"
            value={stats?.totalForecast}
            format="currency"
            icon={Building2}
            loading={loadingForecast}
            subtitle={`${stats?.forecastPeriods || 6} months`}
          />
        </div>

        {/* Forecast Chart */}
        <Card className="bg-[#161b22] border-[#30363d] mb-6">
          <CardHeader>
            <CardTitle className="text-[#c9d1d9]">
              6-Month Spending Forecast
              {selectedAgency && ` - ${agencies?.find((a) => a.code === selectedAgency)?.name}`}
            </CardTitle>
            <CardDescription className="text-[#8b949e]">
              Historical spending with AI-powered forecast and 95% confidence interval
              {scenarioAdjustment !== 0 && (
                <span className="ml-2 text-[#d29922]">
                  (Scenario: {scenarioAdjustment > 0 ? "+" : ""}
                  {scenarioAdjustment}% adjustment applied)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingForecast ? (
              <Skeleton className="h-[400px] bg-[#21262d]" />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3fb950" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3fb950" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="date" stroke="#8b949e" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8b949e" tickFormatter={(v) => `$${v.toFixed(1)}B`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      value ? `$${value.toFixed(2)}B` : "—",
                      name,
                    ]}
                  />
                  <Legend />

                  {/* Confidence Interval */}
                  {showConfidenceInterval && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="transparent"
                        fill="url(#colorConfidence)"
                        name="Upper Bound"
                        connectNulls={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="#3fb950"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                        fill="transparent"
                        name="Lower Bound"
                        connectNulls={false}
                      />
                    </>
                  )}

                  {/* Historical Data */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#58a6ff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="Historical"
                    connectNulls={false}
                  />

                  {/* Forecast Data */}
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="#3fb950"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorForecast)"
                    name="Forecast"
                    connectNulls={false}
                  />

                  {/* Forecast Start Line */}
                  {forecast && forecast.historical.length > 0 && (
                    <ReferenceLine
                      x={forecast.historical[forecast.historical.length - 1].date.substring(0, 7)}
                      stroke="#8b949e"
                      strokeDasharray="5 5"
                      label={{
                        value: "Forecast Start",
                        position: "top",
                        fill: "#8b949e",
                        fontSize: 11,
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Forecast Details Table */}
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader>
            <CardTitle className="text-[#c9d1d9]">Forecast Details</CardTitle>
            <CardDescription className="text-[#8b949e]">
              Monthly forecast values with confidence bounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingForecast ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-[#21262d]" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#30363d]">
                      <th className="text-left py-3 px-4 text-[#8b949e] font-medium">Month</th>
                      <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Predicted</th>
                      <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Lower (95%)</th>
                      <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Upper (95%)</th>
                      <th className="text-right py-3 px-4 text-[#8b949e] font-medium">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustedForecast?.forecast.map((f) => (
                      <tr key={f.date} className="border-b border-[#30363d]/50 hover:bg-[#21262d]">
                        <td className="py-3 px-4 text-[#c9d1d9]">{f.date}</td>
                        <td className="py-3 px-4 text-right font-mono text-[#3fb950]">
                          ${(f.predicted / 1e9).toFixed(2)}B
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#8b949e]">
                          ${(f.lower / 1e9).toFixed(2)}B
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#8b949e]">
                          ${(f.upper / 1e9).toFixed(2)}B
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-[#6e7681]">
                            ±${((f.upper - f.lower) / 2 / 1e9).toFixed(2)}B
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PrismLayout>
  );
}

function StatCard({
  title,
  value,
  format,
  icon: Icon,
  loading,
  subtitle,
}: {
  title: string;
  value: number | undefined;
  format: "currency" | "number" | "percent";
  icon: React.ElementType;
  loading: boolean;
  subtitle?: string;
}) {
  const formatValue = (v: number | undefined) => {
    if (v === undefined) return "—";
    if (format === "currency") {
      if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      return `$${v.toLocaleString()}`;
    }
    if (format === "percent") {
      return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
    }
    return v.toLocaleString();
  };

  const valueColor =
    format === "percent" && value !== undefined
      ? value >= 0
        ? "text-[#3fb950]"
        : "text-[#f85149]"
      : "text-[#c9d1d9]";

  return (
    <Card className="bg-[#161b22] border-[#30363d]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8b949e] mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 bg-[#21262d]" />
            ) : (
              <>
                <p className={`text-2xl font-bold ${valueColor}`}>{formatValue(value)}</p>
                {subtitle && <p className="text-xs text-[#6e7681] mt-1">{subtitle}</p>}
              </>
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
