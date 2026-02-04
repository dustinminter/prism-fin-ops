import crypto from "crypto";
import fs from "fs";

// =============================================================================
// Cortex Analyst REST API Client
// Replaces Cortex COMPLETE with semantic model-aware text-to-SQL
// =============================================================================

// --- Types -------------------------------------------------------------------

export interface AnalystMessage {
  role: "user" | "analyst";
  content: AnalystContentBlock[];
}

export interface AnalystContentBlock {
  type: "text" | "sql" | "suggestions";
  text?: string;
  statement?: string;
  suggestions?: string[];
}

export interface AnalystResponse {
  request_id: string;
  message: {
    role: "analyst";
    content: AnalystContentBlock[];
  };
  warnings?: Array<{ message: string }>;
  response_metadata?: {
    model_names: string[];
    question_category: string;
  };
}

export interface ParsedAnalystResult {
  explanation: string;
  sql: string;
  suggestions: string[];
  isVerifiedQuery: boolean;
  requestId: string;
  questionCategory?: string;
}

// --- Config ------------------------------------------------------------------

const ANALYST_CONFIG = {
  get accountIdentifier() {
    return (process.env.SNOWFLAKE_ACCOUNT || "").toUpperCase();
  },
  get username() {
    return (process.env.SNOWFLAKE_USER || "").toUpperCase();
  },
  get privateKeyPath() {
    return process.env.SNOWFLAKE_PRIVATE_KEY_PATH || "";
  },
  get semanticView() {
    const db = process.env.SNOWFLAKE_DATABASE || "FEDERAL_FINANCIAL_DATA";
    const schema = process.env.SNOWFLAKE_SCHEMA || "EOTSS_STAGING";
    return `${db}.${schema}.PRISM_EOTSS_FINOPS`;
  },
  get endpoint() {
    const account = process.env.SNOWFLAKE_ACCOUNT || "";
    return `https://${account}.snowflakecomputing.com/api/v2/cortex/analyst/message`;
  },
};

// --- JWT Generation ----------------------------------------------------------

let cachedJwt: { token: string; expiresAt: number } | null = null;

function generateSnowflakeJwt(): string {
  // Return cached token if still valid (5-min buffer)
  if (cachedJwt && Date.now() / 1000 < cachedJwt.expiresAt - 300) {
    return cachedJwt.token;
  }

  const privateKeyPem = fs.readFileSync(ANALYST_CONFIG.privateKeyPath, "utf-8");

  // Compute SHA256 fingerprint of the public key (DER-encoded SPKI)
  const publicKeyDer = crypto
    .createPublicKey(privateKeyPem)
    .export({ type: "spki", format: "der" });
  const fingerprint = crypto
    .createHash("sha256")
    .update(publicKeyDer)
    .digest("base64");

  const qualifiedName = `${ANALYST_CONFIG.accountIdentifier}.${ANALYST_CONFIG.username}`;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3540; // 59 minutes

  // Build JWT manually (avoids jsonwebtoken dependency)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: `${qualifiedName}.SHA256:${fingerprint}`,
      sub: qualifiedName,
      iat: now,
      exp,
    })
  ).toString("base64url");

  const signature = crypto
    .sign("sha256", Buffer.from(`${header}.${payload}`), privateKeyPem)
    .toString("base64url");

  const token = `${header}.${payload}.${signature}`;
  cachedJwt = { token, expiresAt: exp };

  console.log("[Analyst] JWT generated for", qualifiedName);
  return token;
}

// --- REST Client -------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendAnalystMessage(
  messages: AnalystMessage[],
  retries = 2
): Promise<AnalystResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const jwt = generateSnowflakeJwt();

      console.log("[Analyst] Sending message to", ANALYST_CONFIG.endpoint);
      console.log("[Analyst] Semantic view:", ANALYST_CONFIG.semanticView);

      const response = await fetch(ANALYST_CONFIG.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
        },
        body: JSON.stringify({
          messages,
          semantic_view: ANALYST_CONFIG.semanticView,
          stream: false,
        }),
      });

      if (response.status === 401) {
        console.warn("[Analyst] JWT rejected (401), regenerating...");
        cachedJwt = null;
        continue;
      }

      if (response.status === 429) {
        console.warn("[Analyst] Rate limited (429), backing off...");
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Analyst] HTTP ${response.status}:`, errorBody.substring(0, 500));
        throw new Error(`Cortex Analyst error ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = (await response.json()) as AnalystResponse;
      console.log("[Analyst] Response received, request_id:", data.request_id);
      if (data.response_metadata?.question_category) {
        console.log("[Analyst] Question category:", data.response_metadata.question_category);
      }

      return data;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`[Analyst] Attempt ${attempt + 1} failed, retrying...`, (error as Error).message);
      await sleep(500 * Math.pow(2, attempt));
    }
  }

  throw new Error("[Analyst] Exhausted retries");
}

// --- Response Parser ---------------------------------------------------------

export function parseAnalystResponse(response: AnalystResponse): ParsedAnalystResult {
  let explanation = "";
  let sql = "";
  let suggestions: string[] = [];
  let isVerifiedQuery = false;

  for (const block of response.message.content) {
    switch (block.type) {
      case "text":
        explanation += block.text || "";
        break;
      case "sql":
        sql = block.statement || "";
        isVerifiedQuery = !!(block as unknown as Record<string, unknown>).confidence;
        break;
      case "suggestions":
        suggestions = block.suggestions || [];
        break;
    }
  }

  return {
    explanation,
    sql,
    suggestions,
    isVerifiedQuery,
    requestId: response.request_id,
    questionCategory: response.response_metadata?.question_category,
  };
}

// --- Convenience: build messages from conversation history --------------------

export function buildAnalystMessages(
  currentMessage: string,
  history?: { role: "user" | "assistant"; content: string }[]
): AnalystMessage[] {
  const messages: AnalystMessage[] = [];

  // Include recent history (last 6 turns)
  if (history) {
    for (const h of history.slice(-6)) {
      messages.push({
        role: h.role === "user" ? "user" : "analyst",
        content: [{ type: "text", text: h.content }],
      });
    }
  }

  // Current user message
  messages.push({
    role: "user",
    content: [{ type: "text", text: currentMessage }],
  });

  return messages;
}
