import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../shared/types/user";
import { sdk } from "./sdk";
import { isSpcsEnvironment } from "../snowflake-spcs";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | null;
  res: CreateExpressContextOptions["res"] | null;
  user: User | null;
};

// In SPCS, users are authenticated by Snowflake at the edge before reaching the app
const SPCS_USER: User = {
  id: 1,
  openId: "spcs-authenticated-user",
  name: "SPCS User",
  email: null,
  role: "user",
};

// Express context creator (for local dev and SPCS)
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (isSpcsEnvironment()) {
    user = SPCS_USER;
  } else {
    try {
      user = sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
