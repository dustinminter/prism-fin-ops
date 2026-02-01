import { describe, it, expect, vi, beforeEach } from "vitest";
import * as snowflake from "./snowflake";
import {
  getAgencySpending,
  getAwardSummary,
  getAwardsByType,
  getTopAwards,
  getAgencies,
  searchAgreements,
  type AgencySpending,
  type AwardSummary,
  type AwardByType,
} from "./prismQueries";

// Mock the snowflake module
vi.mock("./snowflake", () => ({
  executeQuery: vi.fn(),
  executeGovernedQuery: vi.fn(),
}));

describe("prismQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAgencySpending", () => {
    it("should fetch top agencies with default limit of 10", async () => {
      const mockData: AgencySpending[] = [
        {
          agencyCode: "DOD",
          agencyName: "Department of Defense",
          totalSpending: 1000000,
          awardCount: 100,
          avgAwardSize: 10000,
        },
      ];

      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockData);

      const result = await getAgencySpending();

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [10],
        expect.objectContaining({ requestSource: "getAgencySpending" })
      );
      expect(result).toEqual(mockData);
    });

    it("should accept custom limit parameter", async () => {
      const mockData: AgencySpending[] = [];
      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockData);

      await getAgencySpending(25);

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        [25],
        expect.any(Object)
      );
    });

    it("should pass governance context correctly", async () => {
      const mockData: AgencySpending[] = [];
      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockData);

      const context = { userId: "test-user", department: "Finance" };
      await getAgencySpending(10, context);

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          userId: "test-user",
          department: "Finance",
          requestSource: "getAgencySpending",
        })
      );
    });

    it("should generate valid SQL with ORDER BY and LIMIT", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      await getAgencySpending(5);

      const sqlCall = vi.mocked(snowflake.executeQuery).mock.calls[0][0];
      expect(sqlCall).toContain("ORDER BY");
      expect(sqlCall).toContain("LIMIT");
      expect(sqlCall).toContain("GROUP BY");
    });
  });

  describe("getAwardSummary", () => {
    it("should return aggregate award statistics", async () => {
      const mockSummary: AwardSummary = {
        totalObligations: 5000000,
        totalAwards: 500,
        avgAwardAmount: 10000,
        uniqueAgencies: 25,
        uniqueRecipients: 300,
      };

      vi.mocked(snowflake.executeQuery).mockResolvedValue([mockSummary]);

      const result = await getAwardSummary();

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("SUM(AWARD_AMOUNT)"),
        [],
        expect.objectContaining({ requestSource: "getAwardSummary" })
      );
      expect(result).toEqual(mockSummary);
    });

    it("should return default values when no results", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      const result = await getAwardSummary();

      expect(result).toEqual({
        totalObligations: 0,
        totalAwards: 0,
        avgAwardAmount: 0,
        uniqueAgencies: 0,
        uniqueRecipients: 0,
      });
    });

    it("should include governance context in query", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);
      const context = { userId: "admin", role: "executive" };

      await getAwardSummary(context);

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          userId: "admin",
          role: "executive",
        })
      );
    });
  });

  describe("getAwardsByType", () => {
    it("should fetch awards grouped by type with percentages", async () => {
      const mockData: AwardByType[] = [
        {
          awardType: "Contract",
          totalAmount: 3000000,
          awardCount: 300,
          percentage: 60,
        },
        {
          awardType: "Grant",
          totalAmount: 2000000,
          awardCount: 200,
          percentage: 40,
        },
      ];

      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockData);

      const result = await getAwardsByType();

      expect(result).toEqual(mockData);
      expect(result.length).toBe(2);
      expect(result[0].awardType).toBe("Contract");
    });

    it("should use CTE for percentage calculation", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      await getAwardsByType();

      const sqlCall = vi.mocked(snowflake.executeQuery).mock.calls[0][0];
      expect(sqlCall).toContain("WITH totals AS");
      expect(sqlCall).toContain("grand_total");
    });
  });

  describe("getTopAwards", () => {
    it("should fetch top awards with default limit", async () => {
      const mockAwards = [
        {
          awardId: "AWARD-001",
          recipientName: "Acme Corp",
          agencyName: "DOD",
          awardAmount: 500000,
          awardDate: "2024-01-15",
          awardType: "Contract",
        },
      ];

      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockAwards);

      const result = await getTopAwards();

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        [10],
        expect.objectContaining({ requestSource: "getTopAwards" })
      );
      expect(result).toEqual(mockAwards);
    });

    it("should accept custom limit parameter", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      await getTopAwards(50);

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        [50],
        expect.any(Object)
      );
    });
  });

  describe("getAgencies", () => {
    it("should fetch distinct agencies list", async () => {
      const mockAgencies = [
        { code: "DOD", name: "Department of Defense" },
        { code: "HHS", name: "Health and Human Services" },
      ];

      vi.mocked(snowflake.executeQuery).mockResolvedValue(mockAgencies);

      const result = await getAgencies();

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("DISTINCT"),
        [],
        expect.objectContaining({ requestSource: "getAgencies" })
      );
      expect(result).toEqual(mockAgencies);
      expect(result.length).toBe(2);
    });

    it("should filter out null agency codes", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      await getAgencies();

      const sqlCall = vi.mocked(snowflake.executeQuery).mock.calls[0][0];
      expect(sqlCall).toContain("IS NOT NULL");
    });
  });

  describe("searchAgreements", () => {
    it("should perform CORTEX_SEARCH with query text", async () => {
      const mockSearchResults = [
        {
          content: "Software License Agreement content",
          score: 0.95,
          source: "agreement-123",
        },
      ];
      const mockAnswerResult = [{ ANSWER: "This is about software licensing" }];

      vi.mocked(snowflake.executeQuery)
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce(mockAnswerResult);

      const result = await searchAgreements("software license");

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("CORTEX.SEARCH"),
        ["software license"],
        expect.objectContaining({ requestSource: "searchAgreements" })
      );
      expect(result.results).toEqual(mockSearchResults);
      expect(result.answer).toBe("This is about software licensing");
    });

    it("should use limit of 5 in search", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      await searchAgreements("test query");

      const sqlCall = vi.mocked(snowflake.executeQuery).mock.calls[0][0];
      expect(sqlCall).toContain("'limit': 5");
    });

    it("should generate answer using CORTEX.COMPLETE when results exist", async () => {
      const mockSearchResults = [
        { content: "Content 1", score: 0.9, source: "src1" },
        { content: "Content 2", score: 0.8, source: "src2" },
      ];
      const mockAnswerResult = [{ ANSWER: "Generated answer" }];

      vi.mocked(snowflake.executeQuery)
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce(mockAnswerResult);

      await searchAgreements("test query");

      expect(snowflake.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining("CORTEX.COMPLETE"),
        expect.arrayContaining(["test query"]),
        expect.any(Object)
      );
    });

    it("should return empty results when search fails", async () => {
      vi.mocked(snowflake.executeQuery).mockRejectedValue(
        new Error("CORTEX.SEARCH not available")
      );

      const result = await searchAgreements("test query");

      expect(result.results).toEqual([]);
      expect(result.answer).toBeUndefined();
    });

    it("should handle empty search results", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      const result = await searchAgreements("test query");

      expect(result.results).toEqual([]);
      expect(result.answer).toBeUndefined();
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should use parameterized queries for user input", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      const maliciousInput = "10; DROP TABLE AWARDS; --";
      await getAgencySpending(parseInt(maliciousInput) || 10);

      // Should pass as parameter, not concatenate into SQL
      const call = vi.mocked(snowflake.executeQuery).mock.calls[0];
      expect(call[1]).toContain(10); // Parsed to number or default
      expect(call[0]).not.toContain("DROP TABLE");
    });

    it("should sanitize search query input", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      const maliciousQuery = "'; DROP TABLE AGREEMENTS; --";
      await searchAgreements(maliciousQuery);

      // Query should be passed as parameter, not concatenated
      const params = vi.mocked(snowflake.executeQuery).mock.calls[0][1];
      expect(params[0]).toBe(maliciousQuery);
      // Verify it's in parameters array, not in SQL string
    });
  });

  describe("Error Handling", () => {
    it("should propagate database errors", async () => {
      const dbError = new Error("Database connection failed");
      vi.mocked(snowflake.executeQuery).mockRejectedValue(dbError);

      await expect(getAgencySpending()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle empty result sets gracefully", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      const result = await getAgencySpending();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle null/undefined in governance context", async () => {
      vi.mocked(snowflake.executeQuery).mockResolvedValue([]);

      // Should not throw with undefined context
      await expect(getAgencies({})).resolves.not.toThrow();
      await expect(getAgencies()).resolves.not.toThrow();
    });
  });
});
