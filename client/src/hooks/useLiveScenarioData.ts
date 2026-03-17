import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { ScenarioId, KPICard } from "@/data/intelligenceData";

const COLOR_MAP: Record<string, string> = {
  sfBlue: "#29B5E8",
  blue: "#29B5E8",
  green: "#22c55e",
  gold: "#d29922",
  red: "#f85149",
  purple: "#a855f7",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function mapColor(colorKey: string): string {
  return COLOR_MAP[colorKey] || "#29B5E8";
}

export interface LiveScenarioData {
  kpis: KPICard[];
  isLoading: boolean;
  error: Error | null;
}

export function useLiveScenarioData(scenarioId: ScenarioId): LiveScenarioData {
  const isCross = scenarioId === "cross";
  
  const agencyQuery = trpc.prism.getAgencySpending.useQuery(
    { limit: 50 },
    { enabled: scenarioId === "spending" || isCross, staleTime: 60_000 }
  );

  const anomalyQuery = trpc.prism.getSpendingAnomalies.useQuery(
    {},
    { enabled: scenarioId === "anomalies" || isCross, staleTime: 60_000 }
  );

  const forecastQuery = trpc.prism.getConsumptionForecast.useQuery(
    {},
    { enabled: scenarioId === "forecast" || isCross, staleTime: 60_000 }
  );

  const cloudQuery = trpc.prism.getCloudSpending.useQuery(
    { limit: 50 },
    { enabled: scenarioId === "cloud" || isCross, staleTime: 60_000 }
  );

  const kpis = useMemo((): KPICard[] => {
    switch (scenarioId) {
      case "spending": {
        if (!agencyQuery.data || agencyQuery.data.length === 0) return [];
        const agencies = agencyQuery.data;
        const totalSpend = agencies.reduce((sum, a) => sum + (a.totalSpending || 0), 0);
        const totalAwards = agencies.reduce((sum, a) => sum + (a.awardCount || 0), 0);
        const avgAwardSize = totalAwards > 0 ? totalSpend / totalAwards : 0;
        
        return [
          {
            label: "Total Spending (YTD)",
            value: formatCurrency(totalSpend),
            color: mapColor("sfBlue"),
            change: `FY2026 • ${agencies.length} agencies`,
            changeDirection: "neutral",
          },
          {
            label: "Agencies Tracked",
            value: String(agencies.length),
            change: "Active in dataset",
            changeDirection: "neutral",
          },
          {
            label: "Total Awards",
            value: totalAwards.toLocaleString(),
            color: mapColor("green"),
            change: "Procurement actions",
            changeDirection: "neutral",
          },
          {
            label: "Avg Award Size",
            value: formatCurrency(avgAwardSize),
            color: mapColor("gold"),
            change: "Per procurement",
            changeDirection: "neutral",
          },
        ];
      }

      case "anomalies": {
        if (!anomalyQuery.data) return [];
        const anomalies = anomalyQuery.data;
        const critical = anomalies.filter(a => a.severity === "critical").length;
        const warning = anomalies.filter(a => a.severity === "warning").length;
        const avgDeviation = anomalies.length > 0
          ? anomalies.reduce((sum, a) => sum + Math.abs(a.deviation || 0), 0) / anomalies.length
          : 0;

        return [
          {
            label: "Total Anomalies",
            value: String(anomalies.length),
            color: mapColor(anomalies.length > 10 ? "red" : anomalies.length > 5 ? "gold" : "green"),
            change: "Detected deviations",
            changeDirection: anomalies.length > 10 ? "down" : "up",
          },
          {
            label: "Critical",
            value: String(critical),
            color: mapColor("red"),
            change: critical > 0 ? "Requires attention" : "None detected",
            changeDirection: critical > 0 ? "down" : "up",
          },
          {
            label: "Warnings",
            value: String(warning),
            color: mapColor("gold"),
            change: "Above threshold",
            changeDirection: warning > 3 ? "down" : "neutral",
          },
          {
            label: "Avg Deviation",
            value: formatPercent(avgDeviation),
            color: mapColor(avgDeviation > 50 ? "red" : avgDeviation > 25 ? "gold" : "green"),
            change: "From baseline",
            changeDirection: avgDeviation > 50 ? "down" : "neutral",
          },
        ];
      }

      case "forecast": {
        if (!forecastQuery.data) return [];
        const { historical, forecast } = forecastQuery.data;
        const latestActual = historical.length > 0 ? historical[historical.length - 1].actual : 0;
        const projectedEnd = forecast.length > 0 ? forecast[forecast.length - 1].predicted : 0;
        const growthRate = latestActual > 0 ? ((projectedEnd - latestActual) / latestActual) * 100 : 0;
        const confidence = forecast.length > 0 
          ? ((forecast[0].upper - forecast[0].lower) / forecast[0].predicted) * 100
          : 0;

        return [
          {
            label: "Current Burn",
            value: formatCurrency(latestActual),
            color: mapColor("sfBlue"),
            change: "Latest month actual",
            changeDirection: "neutral",
          },
          {
            label: "Year-End Projection",
            value: formatCurrency(projectedEnd),
            color: mapColor(growthRate > 10 ? "gold" : "green"),
            change: `${growthRate > 0 ? "+" : ""}${growthRate.toFixed(1)}% projected`,
            changeDirection: growthRate > 10 ? "down" : "up",
          },
          {
            label: "Forecast Periods",
            value: String(forecast.length),
            change: "Months ahead",
            changeDirection: "neutral",
          },
          {
            label: "Confidence Band",
            value: `±${confidence.toFixed(0)}%`,
            color: mapColor(confidence > 20 ? "gold" : "green"),
            change: confidence > 20 ? "Wide uncertainty" : "Tight forecast",
            changeDirection: confidence > 20 ? "down" : "up",
          },
        ];
      }

      case "cloud": {
        if (!cloudQuery.data || cloudQuery.data.length === 0) return [];
        const data = cloudQuery.data;
        const totalCost = data.reduce((sum, d) => sum + (d.totalCost || 0), 0);
        const avgSavings = data.reduce((sum, d) => sum + (d.savingsCoveragePct || 0), 0) / data.length;
        const providers = new Set(data.map(d => d.cloudProvider)).size;
        const agencies = new Set(data.map(d => d.agencyCode)).size;

        return [
          {
            label: "Total Cloud Spend",
            value: formatCurrency(totalCost),
            color: mapColor("sfBlue"),
            change: `${providers} providers`,
            changeDirection: "neutral",
          },
          {
            label: "Agencies",
            value: String(agencies),
            change: "With cloud usage",
            changeDirection: "neutral",
          },
          {
            label: "Savings Coverage",
            value: formatPercent(avgSavings),
            color: mapColor(avgSavings > 50 ? "green" : avgSavings > 30 ? "gold" : "red"),
            change: avgSavings > 50 ? "Good reserved usage" : "Mostly on-demand",
            changeDirection: avgSavings > 50 ? "up" : "down",
          },
          {
            label: "Providers",
            value: String(providers),
            change: "Cloud platforms",
            changeDirection: "neutral",
          },
        ];
      }

      case "cross": {
        const hasSpending = agencyQuery.data && agencyQuery.data.length > 0;
        const hasAnomalies = anomalyQuery.data && anomalyQuery.data.length > 0;
        const hasCloud = cloudQuery.data && cloudQuery.data.length > 0;
        const hasForecast = forecastQuery.data?.forecast?.length;
        
        if (!hasSpending && !hasAnomalies && !hasCloud) return [];
        
        const totalSpending = hasSpending 
          ? agencyQuery.data!.reduce((sum, a) => sum + (a.totalSpending || 0), 0)
          : 0;
        const anomalyCount = hasAnomalies ? anomalyQuery.data!.length : 0;
        const criticalCount = hasAnomalies 
          ? anomalyQuery.data!.filter(a => a.severity === "critical").length 
          : 0;
        const cloudSpend = hasCloud
          ? cloudQuery.data!.reduce((sum, d) => sum + (d.totalCost || 0), 0)
          : 0;
        const projectedEnd = hasForecast
          ? forecastQuery.data!.forecast[forecastQuery.data!.forecast.length - 1].predicted
          : 0;

        return [
          {
            label: "Total Spending",
            value: formatCurrency(totalSpending + cloudSpend),
            color: mapColor("sfBlue"),
            change: "All sources combined",
            changeDirection: "neutral",
          },
          {
            label: "Active Anomalies",
            value: String(anomalyCount),
            color: mapColor(criticalCount > 0 ? "red" : anomalyCount > 0 ? "gold" : "green"),
            change: criticalCount > 0 ? `${criticalCount} critical` : "All normal",
            changeDirection: criticalCount > 0 ? "down" : "up",
          },
          {
            label: "Cloud Spend",
            value: formatCurrency(cloudSpend),
            color: mapColor("purple"),
            change: "AWS + Azure + GCP",
            changeDirection: "neutral",
          },
          {
            label: "Year-End Forecast",
            value: projectedEnd > 0 ? formatCurrency(projectedEnd) : "—",
            color: mapColor("gold"),
            change: projectedEnd > 0 ? "Cortex ML projection" : "Loading...",
            changeDirection: "neutral",
          },
        ];
      }

      default:
        return [];
    }
  }, [scenarioId, agencyQuery.data, anomalyQuery.data, forecastQuery.data, cloudQuery.data]);

  const isLoading =
    (scenarioId === "spending" && agencyQuery.isLoading) ||
    (scenarioId === "anomalies" && anomalyQuery.isLoading) ||
    (scenarioId === "forecast" && forecastQuery.isLoading) ||
    (scenarioId === "cloud" && cloudQuery.isLoading) ||
    (scenarioId === "cross" && (agencyQuery.isLoading || anomalyQuery.isLoading || cloudQuery.isLoading));

  const error =
    (scenarioId === "spending" && agencyQuery.error) ||
    (scenarioId === "anomalies" && anomalyQuery.error) ||
    (scenarioId === "forecast" && forecastQuery.error) ||
    (scenarioId === "cloud" && cloudQuery.error) ||
    null;

  return { kpis, isLoading, error: error as Error | null };
}

export function useAnomalyBadgeCount(): number | undefined {
  const anomalyQuery = trpc.prism.getSpendingAnomalies.useQuery(
    {},
    { staleTime: 60_000 }
  );
  
  if (!anomalyQuery.data) return undefined;
  return anomalyQuery.data.length > 0 ? anomalyQuery.data.length : undefined;
}
