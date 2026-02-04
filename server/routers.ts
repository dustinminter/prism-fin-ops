import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, tenantProcedure, router } from "./_core/trpc";
import * as prismQueries from "./prismQueries";
import * as governanceQueries from "./governanceQueries";
import { GovernanceContext } from "./snowflake";

// Helper to build governance context from tRPC context
function buildGovernanceContext(ctx: { user?: { id: number; openId: string; role: string } | null }): GovernanceContext {
  return {
    userId: ctx.user?.openId || "anonymous",
    userRole: ctx.user?.role || "public",
    trustState: "draft",
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      if (!ctx.req || !ctx.res) {
        return { success: false } as const;
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // PRISM FinOps Endpoints (tenant-scoped: require authenticated user with tenant)
  prism: router({
    // Dashboard endpoints
    getAgencySpending: tenantProcedure
      .input(z.object({ limit: z.number().optional().default(10) }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getAgencySpending(input.limit, buildGovernanceContext(ctx));
      }),

    getAwardSummary: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getAwardSummary(buildGovernanceContext(ctx));
    }),

    getAwardsByType: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getAwardsByType(buildGovernanceContext(ctx));
    }),

    getTopAwards: tenantProcedure
      .input(z.object({ limit: z.number().optional().default(10) }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getTopAwards(input.limit, buildGovernanceContext(ctx));
      }),

    getAgencyRiskMetrics: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getAgencyRiskMetrics(buildGovernanceContext(ctx));
    }),

    getConsumptionMetrics: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getConsumptionMetrics(buildGovernanceContext(ctx));
    }),

    getDriftAlerts: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getDriftAlerts(buildGovernanceContext(ctx));
    }),

    // Cortex AI endpoints
    getConsumptionForecast: tenantProcedure
      .input(z.object({ agencyCode: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getConsumptionForecast(input.agencyCode, buildGovernanceContext(ctx));
      }),

    getSpendingAnomalies: tenantProcedure
      .input(z.object({ severityFilter: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getSpendingAnomalies(input.severityFilter, buildGovernanceContext(ctx));
      }),

    generateExecutiveNarrative: protectedProcedure
      .input(
        z.object({
          scope: z.enum(["agency", "portfolio", "government-wide"]),
          scopeId: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const govContext = {
          ...buildGovernanceContext(ctx),
          trustState: "draft" as const,
        };
        return prismQueries.generateExecutiveNarrative(input.scope, input.scopeId, govContext);
      }),

    // AI Chat with Cortex Intelligence
    chatWithIntelligence: tenantProcedure
      .input(
        z.object({
          message: z.string(),
          chatContext: z.object({
            page: z.string(),
            agencyCode: z.string().optional(),
            conversationHistory: z
              .array(
                z.object({
                  role: z.enum(["user", "assistant"]),
                  content: z.string(),
                })
              )
              .optional(),
          }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const govContext = {
          ...buildGovernanceContext(ctx),
          trustState: "draft" as const,
        };
        return prismQueries.chatWithIntelligence(input.message, input.chatContext, govContext);
      }),

    getAgencyDeepDive: tenantProcedure
      .input(z.object({ agencyCode: z.string() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getAgencyDeepDive(input.agencyCode, buildGovernanceContext(ctx));
      }),

    // Anomaly management
    acknowledgeAnomaly: protectedProcedure
      .input(z.object({ anomalyId: z.string(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.openId || "unknown";
        return prismQueries.acknowledgeAnomaly(input.anomalyId, userId, input.reason, buildGovernanceContext(ctx));
      }),

    // Trust state workflow
    updateNarrativeTrustState: protectedProcedure
      .input(
        z.object({
          narrativeId: z.string(),
          newState: z.enum(["draft", "internal", "client", "executive"]),
          approvalNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.openId || "unknown";
        return prismQueries.updateNarrativeTrustState(
          input.narrativeId,
          input.newState,
          userId,
          input.approvalNotes,
          buildGovernanceContext(ctx)
        );
      }),

    // Agency list
    getAgencies: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getAgencies(buildGovernanceContext(ctx));
    }),

    // Agreement search (Cortex SEARCH)
    searchAgreements: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.searchAgreements(input.query, buildGovernanceContext(ctx));
      }),

    // CIP (Capital Investment Plan) endpoints
    getCIPPrograms: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getCIPPrograms(buildGovernanceContext(ctx));
    }),

    getCIPLineItems: tenantProcedure
      .input(
        z.object({
          programId: z.string().optional(),
          fiscalYear: z.number().optional(),
          policyArea: z.string().optional(),
          status: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        return prismQueries.getCIPLineItems(input, buildGovernanceContext(ctx));
      }),

    getCIPSummary: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getCIPSummary(buildGovernanceContext(ctx));
    }),

    searchCIPDocuments: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.searchCIPDocuments(input.query, buildGovernanceContext(ctx));
      }),

    // Data Lineage endpoints
    getDataLineage: tenantProcedure
      .input(z.object({ targetObject: z.string() }))
      .query(async ({ input, ctx }) => {
        return prismQueries.getDataLineage(input.targetObject, buildGovernanceContext(ctx));
      }),

    getAllDataLineage: tenantProcedure.query(async ({ ctx }) => {
      return prismQueries.getAllDataLineage(buildGovernanceContext(ctx));
    }),

    // Natural Language Query endpoint
    executeNaturalLanguageQuery: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1).max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return prismQueries.executeNaturalLanguageQuery(
          input.query,
          buildGovernanceContext(ctx)
        );
      }),

  }),

  // Governance & Agreements Router (tenant-scoped)
  governance: router({
    getAgreements: tenantProcedure
      .input(
        z.object({
          status: z.string().optional(),
          agencyId: z.string().optional(),
          agreementType: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return governanceQueries.getAgreements(input);
      }),

    getAgreementById: tenantProcedure
      .input(z.object({ agreementId: z.string() }))
      .query(async ({ input }) => {
        return governanceQueries.getAgreementById(input.agreementId);
      }),

    getAgreementClauses: tenantProcedure
      .input(z.object({ agreementId: z.string() }))
      .query(async ({ input }) => {
        return governanceQueries.getAgreementClauses(input.agreementId);
      }),

    getPermissionsMatrix: tenantProcedure
      .input(z.object({ agreementId: z.string() }))
      .query(async ({ input }) => {
        return governanceQueries.getPermissionsMatrix(input.agreementId);
      }),

    getAgreementEvents: tenantProcedure
      .input(z.object({ agreementId: z.string() }))
      .query(async ({ input }) => {
        return governanceQueries.getAgreementEvents(input.agreementId);
      }),

    getAgreementStats: tenantProcedure.query(async () => {
      return governanceQueries.getAgreementStats();
    }),

    getEnforcementLog: tenantProcedure
      .input(
        z.object({
          agreementId: z.string().optional(),
          userId: z.string().optional(),
          decision: z.string().optional(),
          limit: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return governanceQueries.getEnforcementLog(input);
      }),

    askAboutAgreement: protectedProcedure
      .input(
        z.object({
          agreementId: z.string(),
          question: z.string(),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
              citations: z.array(z.string()).optional(),
            })
          ).optional().default([]),
        })
      )
      .mutation(async ({ input }) => {
        return governanceQueries.askAboutAgreement(
          input.agreementId,
          input.question,
          input.conversationHistory
        );
      }),

    createAmendmentRequest: protectedProcedure
      .input(
        z.object({
          agreementId: z.string(),
          requestedBy: z.string(),
          requestedAt: z.string(),
          amendmentType: z.enum(["EXPAND_DOMAINS", "ENABLE_AI", "EXTEND_EXPIRATION", "MODIFY_SHARING", "OTHER"]),
          description: z.string(),
          justification: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return governanceQueries.createAmendmentRequest(input);
      }),

    generateDraftAgreement: protectedProcedure
      .input(
        z.object({
          agreementType: z.enum(["MOU", "DULA"]),
          agencyId: z.string(),
          agencyName: z.string(),
          dataDomains: z.array(z.string()),
          aiEnabled: z.boolean(),
          crossAgencySharing: z.boolean(),
          expirationMonths: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return governanceQueries.generateDraftAgreement(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
