import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { eq, asc } from "drizzle-orm";
import { getDb } from "./db";
import { incidentCommunications } from "../drizzle/schema";
import { requireIncidentAccess } from "./_core/authz";

export const incidentCommunicationRouter = router({
  // Admin sends a message to a reporter
  sendAdminMessage: protectedProcedure
    .input(z.object({
      incidentId: z.number(),
      message: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireIncidentAccess(ctx.user, input.incidentId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(incidentCommunications).values({
        incidentId: input.incidentId,
        senderRole: "admin",
        // F-05: sender identity is always derived server-side — never trusted from the client
        senderName: ctx.user?.name || ctx.user?.email || "Admin",
        message: input.message,
        isFromAdmin: true,
      } as any);
      return { success: true };
    }),

  // Reporter sends a message (by tracking token)
  sendReporterMessage: publicProcedure
    .input(z.object({
      token: z.string(),
      message: z.string().min(1).max(2000),
      senderName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { incidentReports } = await import("../drizzle/schema");
      const report = await db.select({ id: incidentReports.id })
        .from(incidentReports)
        .where(eq(incidentReports.trackingToken, input.token))
        .limit(1);
      if (!report[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      await db.insert(incidentCommunications).values({
        incidentId: report[0].id,
        senderRole: "reporter",
        senderName: input.senderName ?? "Reporter",
        message: input.message,
        isFromAdmin: false,
      });
      return { success: true };
    }),

  // Get messages for an incident (admin view)
  getMessages: protectedProcedure
    .input(z.object({ incidentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireIncidentAccess(ctx.user, input.incidentId);
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(incidentCommunications)
        .where(eq(incidentCommunications.incidentId, input.incidentId))
        .orderBy(asc(incidentCommunications.createdAt));
    }),

  // Get messages for reporter (by tracking token)
  getMessagesByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { incidentReports } = await import("../drizzle/schema");
      const report = await db.select({ id: incidentReports.id })
        .from(incidentReports)
        .where(eq(incidentReports.trackingToken, input.token))
        .limit(1);
      if (!report[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return db.select()
        .from(incidentCommunications)
        .where(eq(incidentCommunications.incidentId, report[0].id))
        .orderBy(asc(incidentCommunications.createdAt));
    }),
});