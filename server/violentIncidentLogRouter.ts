/**
 * violentIncidentLogRouter.ts — California Violent Incident Log (SB 553 / LC 6401.9)
 *
 * Compliance rules:
 *  - PII-free: no victim/witness/perpetrator identifiers in the schema or UI.
 *  - 5-year retention: NO delete procedure — records cannot be purged.
 *  - 15-day "Log Requested" workflow: requestLog stamps the request timestamp and
 *    the scheduler fires Day 1 / 10 / 14 notifications to org admins.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, orgAdminProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { violentIncidentLogs, violentIncidentLogRequests } from "../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { requireOrgAccess, isPlatformAdmin, getUserOrgIds } from "./_core/authz";
import { notifyViolentLogAdmins } from "./violentIncidentLogNotify";

const VIOLENCE_TYPES = ["type_i_criminal", "type_ii_client", "type_iii_worker_on_worker", "type_iv_personal_relationship"] as const;
const PERP_CATEGORIES = ["customer_client", "current_employee", "former_employee", "personal_relationship", "stranger", "other_unknown"] as const;
const WEAPON_TYPES = ["none", "firearm", "edged", "blunt", "chemical", "other"] as const;

const createLogInput = z.object({
  orgId: z.number().int().optional(),
  facilityId: z.number().int().positive().optional(),
  incidentDate: z.string().optional(),
  incidentTime: z.string().optional(),
  location: z.string().optional(),
  violenceType: z.enum(VIOLENCE_TYPES).optional(),
  perpetratorCategory: z.enum(PERP_CATEGORIES).optional(),
  characteristics: z.array(z.string()).optional(),
  weaponType: z.enum(WEAPON_TYPES).optional(),
  weaponOther: z.string().optional(),
  environmentalFactors: z.array(z.string()).optional(),
  industryCircumstances: z.array(z.string()).optional(),
  narrative: z.string().optional(),
  lawEnforcementContacted: z.boolean().default(false),
  leAgencyName: z.string().optional(),
  policeReportNumber: z.string().optional(),
  protectiveActions: z.string().optional(),
  hazardEvaluation: z.string().optional(),
  correctiveActions: z.string().optional(),
});

function roleTitle(role: string): string {
  switch (role) {
    case "ultra_admin": return "Platform Administrator";
    case "super_admin": return "Organization Administrator";
    case "admin": return "Administrator";
    case "auditor": return "Auditor";
    default: return "Safety Administrator";
  }
}

export const violentIncidentLogRouter = router({
  create: orgAdminProcedure
    .input(createLogInput)
    .mutation(async ({ ctx, input }) => {
      const userOrgIds = await getUserOrgIds(ctx.user.id);
      const orgId = input.orgId ?? userOrgIds[0] ?? null;
      if (orgId != null && !isPlatformAdmin(ctx.user) && !userOrgIds.includes(orgId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this organization." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(violentIncidentLogs).values({
        orgId: orgId ?? undefined,
        facilityId: input.facilityId,
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : undefined,
        incidentTime: input.incidentTime || undefined,
        location: input.location || undefined,
        violenceType: input.violenceType,
        perpetratorCategory: input.perpetratorCategory,
        characteristics: input.characteristics && input.characteristics.length ? input.characteristics : undefined,
        weaponType: input.weaponType,
        weaponOther: input.weaponOther || undefined,
        environmentalFactors: input.environmentalFactors && input.environmentalFactors.length ? input.environmentalFactors : undefined,
        industryCircumstances: input.industryCircumstances && input.industryCircumstances.length ? input.industryCircumstances : undefined,
        narrative: input.narrative || undefined,
        lawEnforcementContacted: input.lawEnforcementContacted,
        leAgencyName: input.leAgencyName || undefined,
        policeReportNumber: input.policeReportNumber || undefined,
        protectiveActions: input.protectiveActions || undefined,
        hazardEvaluation: input.hazardEvaluation || undefined,
        correctiveActions: input.correctiveActions || undefined,
        loggedByUserId: ctx.user.id,
        loggedByName: ctx.user.name ?? ctx.user.email ?? "Admin",
        loggedByTitle: roleTitle(ctx.user.role),
      });
      return { id: Number((result as any)?.insertId) };
    }),

  list: orgAdminProcedure
    .input(z.object({ orgId: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const userOrgIds = await getUserOrgIds(ctx.user.id);
      const orgIds = input.orgId ? [input.orgId] : userOrgIds;
      if (input.orgId != null) await requireOrgAccess(ctx.user, [input.orgId]);
      if (orgIds.length === 0) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(violentIncidentLogs)
        .where(inArray(violentIncidentLogs.orgId, orgIds))
        .orderBy(desc(violentIncidentLogs.incidentDate));
    }),

  get: orgAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(violentIncidentLogs).where(eq(violentIncidentLogs.id, input.id)).limit(1);
      const log = rows[0];
      if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Log entry not found." });
      if (log.orgId != null) await requireOrgAccess(ctx.user, [log.orgId]);
      return log;
    }),

  requestLog: protectedProcedure
    .input(z.object({ orgId: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userOrgIds = await getUserOrgIds(ctx.user.id);
      const orgId = input.orgId ?? userOrgIds[0] ?? null;
      if (orgId != null && !userOrgIds.includes(orgId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of that organization." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const requestedAt = new Date();
      const dueAt = new Date(requestedAt.getTime() + 15 * 24 * 60 * 60 * 1000);
      const [result] = await db.insert(violentIncidentLogRequests).values({
        orgId: orgId ?? undefined,
        requestedByUserId: ctx.user.id,
        requestedAt,
        dueAt,
      });
      const requestId = Number((result as any)?.insertId);
      if (orgId != null) {
        await notifyViolentLogAdmins(orgId, {
          title: "Violent Incident Log Requested (15-day deadline)",
          body: `An employee requested a copy of the California Violent Incident Log. Must be provided by ${dueAt.toLocaleDateString()}.`,
        });
      }
      return { id: requestId, dueAt };
    }),

  listMyRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(violentIncidentLogRequests)
        .where(eq(violentIncidentLogRequests.requestedByUserId, ctx.user.id))
        .orderBy(desc(violentIncidentLogRequests.requestedAt));
    }),

  listRequests: orgAdminProcedure
    .input(z.object({ orgId: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const userOrgIds = await getUserOrgIds(ctx.user.id);
      const orgIds = input.orgId ? [input.orgId] : userOrgIds;
      if (input.orgId != null) await requireOrgAccess(ctx.user, [input.orgId]);
      if (orgIds.length === 0) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(violentIncidentLogRequests)
        .where(inArray(violentIncidentLogRequests.orgId, orgIds))
        .orderBy(desc(violentIncidentLogRequests.requestedAt));
    }),

  fulfillRequest: orgAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({ orgId: violentIncidentLogRequests.orgId })
        .from(violentIncidentLogRequests).where(eq(violentIncidentLogRequests.id, input.id)).limit(1);
      const req = rows[0];
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      if (req.orgId != null) await requireOrgAccess(ctx.user, [req.orgId]);
      await db.update(violentIncidentLogRequests)
        .set({ status: "fulfilled", fulfilledAt: new Date() })
        .where(eq(violentIncidentLogRequests.id, input.id));
      return { success: true };
    }),
});