import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the Snowflake queries module
vi.mock("./prismQueries", () => ({
  getAgencySpending: vi.fn().mockResolvedValue([
    {
      agencyCode: "DOD",
      agencyName: "Department of Defense",
      totalSpending: 500000000000,
      awardCount: 50000,
      avgAwardSize: 10000000,
    },
    {
      agencyCode: "HHS",
      agencyName: "Department of Health and Human Services",
      totalSpending: 300000000000,
      awardCount: 30000,
      avgAwardSize: 10000000,
    },
  ]),
  getAwardSummary: vi.fn().mockResolvedValue({
    totalObligations: 1500000000000,
    totalAwards: 150000,
    avgAwardAmount: 10000000,
    uniqueAgencies: 24,
    uniqueRecipients: 50000,
  }),
  getAwardsByType: vi.fn().mockResolvedValue([
    { awardType: "Contract", totalAmount: 800000000000, awardCount: 80000, percentage: 53.33 },
    { awardType: "Grant", totalAmount: 400000000000, awardCount: 40000, percentage: 26.67 },
    { awardType: "Loan", totalAmount: 300000000000, awardCount: 30000, percentage: 20.0 },
  ]),
  getTopAwards: vi.fn().mockResolvedValue([
    {
      awardId: "AWD-001",
      recipientName: "Lockheed Martin",
      agencyName: "Department of Defense",
      awardAmount: 50000000000,
      awardDate: "2025-01-15",
      awardType: "Contract",
    },
  ]),
  getAgencyRiskMetrics: vi.fn().mockResolvedValue([
    {
      agencyCode: "DOD",
      agencyName: "Department of Defense",
      concentrationRisk: 25.5,
      volatilityScore: 15.2,
      complianceScore: 87.25,
      overallRiskLevel: "medium",
    },
  ]),
  getConsumptionMetrics: vi.fn().mockResolvedValue([
    { date: "2025-01", actual: 100000000000, forecast: null, baseline: 95000000000 },
    { date: "2024-12", actual: 95000000000, forecast: null, baseline: 90000000000 },
  ]),
  getDriftAlerts: vi.fn().mockResolvedValue([
    {
      id: "ALERT-001",
      agencyCode: "DOD",
      agencyName: "Department of Defense",
      metricName: "Monthly Spending",
      expectedValue: 40000000000,
      actualValue: 52000000000,
      variancePercent: 30.0,
      severity: "warning",
      detectedAt: "2025-01-15",
    },
  ]),
  getConsumptionForecast: vi.fn().mockResolvedValue({
    historical: [
      { date: "2024-07-01", actual: 90000000000 },
      { date: "2024-08-01", actual: 92000000000 },
      { date: "2024-09-01", actual: 95000000000 },
    ],
    forecast: [
      { date: "2025-02-01", predicted: 105000000000, lower: 89250000000, upper: 120750000000 },
      { date: "2025-03-01", predicted: 108000000000, lower: 91800000000, upper: 124200000000 },
    ],
  }),
  getSpendingAnomalies: vi.fn().mockResolvedValue([
    {
      id: "ANOM-001",
      agency: "Department of Defense",
      agencyCode: "DOD",
      type: "spending_spike",
      severity: "warning",
      deviation: 30.0,
      description: "Department of Defense spending deviated 30.0% from expected baseline",
      detectedAt: "2025-01-15",
      expectedValue: 40000000000,
      actualValue: 52000000000,
      isAcknowledged: false,
    },
  ]),
  generateExecutiveNarrative: vi.fn().mockResolvedValue({
    narrative:
      "Based on the analysis of federal spending data, the government has processed 150,000 awards totaling $1.50 trillion. The spending pattern indicates steady activity with opportunities for optimization.",
    evidenceBundle: [
      { metric: "Total Spending", value: 1500000000000, source: "USASPENDING.AWARDS" },
      { metric: "Award Count", value: 150000, source: "USASPENDING.AWARDS" },
    ],
    generatedAt: "2025-01-18T12:00:00.000Z",
    trustState: "draft",
  }),
  getAgencyDeepDive: vi.fn().mockResolvedValue({
    summary: { totalSpending: 500000000000, awardCount: 50000, avgAwardSize: 10000000 },
    monthlyTrend: [
      { month: "2024-12", spending: 42000000000 },
      { month: "2025-01", spending: 45000000000 },
    ],
    topRecipients: [
      { name: "Lockheed Martin", amount: 75000000000, awardCount: 500 },
      { name: "Boeing", amount: 60000000000, awardCount: 400 },
    ],
    riskIndicators: [
      { metric: "Vendor Concentration", status: "normal", value: 15.0 },
      { metric: "Spending Volatility", status: "normal", value: 1.2 },
    ],
  }),
  acknowledgeAnomaly: vi.fn().mockResolvedValue(true),
  updateNarrativeTrustState: vi.fn().mockResolvedValue(true),
  getAgencies: vi.fn().mockResolvedValue([
    { code: "DOD", name: "Department of Defense" },
    { code: "HHS", name: "Department of Health and Human Services" },
    { code: "DOE", name: "Department of Energy" },
  ]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    role: "user",
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("PRISM tRPC Endpoints", () => {
  describe("Public Endpoints", () => {
    it("getAgencySpending returns top agencies by spending", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAgencySpending({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("agencyCode", "DOD");
      expect(result[0]).toHaveProperty("totalSpending", 500000000000);
    });

    it("getAwardSummary returns aggregate statistics", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAwardSummary();

      expect(result).toHaveProperty("totalObligations", 1500000000000);
      expect(result).toHaveProperty("totalAwards", 150000);
      expect(result).toHaveProperty("uniqueAgencies", 24);
    });

    it("getAwardsByType returns breakdown by award type", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAwardsByType();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("awardType", "Contract");
      expect(result[0]).toHaveProperty("percentage", 53.33);
    });

    it("getTopAwards returns highest value awards", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getTopAwards({ limit: 5 });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("recipientName", "Lockheed Martin");
      expect(result[0]).toHaveProperty("awardAmount", 50000000000);
    });

    it("getAgencyRiskMetrics returns risk scores", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAgencyRiskMetrics();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("overallRiskLevel", "medium");
      expect(result[0]).toHaveProperty("concentrationRisk", 25.5);
    });

    it("getConsumptionMetrics returns spending trend data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getConsumptionMetrics();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("date", "2025-01");
      expect(result[0]).toHaveProperty("actual", 100000000000);
    });

    it("getDriftAlerts returns variance-based alerts", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getDriftAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("severity", "warning");
      expect(result[0]).toHaveProperty("variancePercent", 30.0);
    });

    it("getConsumptionForecast returns historical and forecast data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getConsumptionForecast({});

      expect(result).toHaveProperty("historical");
      expect(result).toHaveProperty("forecast");
      expect(result.historical).toHaveLength(3);
      expect(result.forecast).toHaveLength(2);
      expect(result.forecast[0]).toHaveProperty("predicted");
      expect(result.forecast[0]).toHaveProperty("lower");
      expect(result.forecast[0]).toHaveProperty("upper");
    });

    it("getSpendingAnomalies returns detected anomalies", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getSpendingAnomalies({});

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("severity", "warning");
      expect(result[0]).toHaveProperty("deviation", 30.0);
      expect(result[0]).toHaveProperty("isAcknowledged", false);
    });

    it("getAgencyDeepDive returns detailed agency data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAgencyDeepDive({ agencyCode: "DOD" });

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("monthlyTrend");
      expect(result).toHaveProperty("topRecipients");
      expect(result).toHaveProperty("riskIndicators");
      expect(result.summary).toHaveProperty("totalSpending", 500000000000);
      expect(result.topRecipients).toHaveLength(2);
    });

    it("getAgencies returns list of agencies", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAgencies();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("code", "DOD");
      expect(result[0]).toHaveProperty("name", "Department of Defense");
    });
  });

  describe("Protected Endpoints", () => {
    it("generateExecutiveNarrative requires authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.prism.generateExecutiveNarrative({ scope: "government-wide" })
      ).rejects.toThrow();
    });

    it("generateExecutiveNarrative returns narrative for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.generateExecutiveNarrative({ scope: "government-wide" });

      expect(result).toHaveProperty("narrative");
      expect(result).toHaveProperty("evidenceBundle");
      expect(result).toHaveProperty("trustState", "draft");
      expect(result.evidenceBundle).toHaveLength(2);
    });

    it("acknowledgeAnomaly requires authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.prism.acknowledgeAnomaly({ anomalyId: "ANOM-001" })
      ).rejects.toThrow();
    });

    it("acknowledgeAnomaly succeeds for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.acknowledgeAnomaly({ anomalyId: "ANOM-001" });

      expect(result).toBe(true);
    });

    it("updateNarrativeTrustState requires authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.prism.updateNarrativeTrustState({ narrativeId: "NAR-001", newState: "internal" })
      ).rejects.toThrow();
    });

    it("updateNarrativeTrustState succeeds for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.updateNarrativeTrustState({
        narrativeId: "NAR-001",
        newState: "internal",
      });

      expect(result).toBe(true);
    });
  });

  describe("Input Validation", () => {
    it("getAgencySpending accepts limit parameter", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getAgencySpending({ limit: 5 });

      expect(result).toBeDefined();
    });

    it("getConsumptionForecast accepts optional agencyCode", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getConsumptionForecast({ agencyCode: "DOD" });

      expect(result).toBeDefined();
    });

    it("getSpendingAnomalies accepts optional severityFilter", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.prism.getSpendingAnomalies({ severityFilter: "critical" });

      expect(result).toBeDefined();
    });

    it("generateExecutiveNarrative validates scope enum", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Valid scopes should work
      const result = await caller.prism.generateExecutiveNarrative({ scope: "agency", scopeId: "DOD" });
      expect(result).toBeDefined();
    });
  });
});
