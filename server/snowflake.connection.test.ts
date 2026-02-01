import { describe, expect, it, afterAll } from "vitest";
import { getSnowflakeConnection, executeQuery, closeConnection } from "./snowflake";

describe("Snowflake Connection", () => {
  afterAll(async () => {
    await closeConnection();
  });

  it("should connect to Snowflake successfully", async () => {
    // Skip test if no password is configured
    if (!process.env.SNOWFLAKE_PASSWORD) {
      console.log("Skipping Snowflake connection test - no password configured");
      return;
    }

    const connection = await getSnowflakeConnection();
    expect(connection).toBeDefined();
  }, 30000);

  it("should execute a simple query", async () => {
    // Skip test if no password is configured
    if (!process.env.SNOWFLAKE_PASSWORD) {
      console.log("Skipping Snowflake query test - no password configured");
      return;
    }

    const result = await executeQuery<{ CURRENT_VERSION: string }>("SELECT CURRENT_VERSION() as CURRENT_VERSION");
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("CURRENT_VERSION");
  }, 30000);

  it("should query the AWARDS table", async () => {
    // Skip test if no password is configured
    if (!process.env.SNOWFLAKE_PASSWORD) {
      console.log("Skipping AWARDS table test - no password configured");
      return;
    }

    const result = await executeQuery<{ count: number }>(
      "SELECT COUNT(*) as count FROM FEDERAL_FINANCIAL_DATA.USASPENDING.AWARDS LIMIT 1"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("COUNT");
    console.log("AWARDS table has", result[0].COUNT, "records");
  }, 30000);
});
