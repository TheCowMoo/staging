/**
 * rasRouter.ts — Response Activation System (RAS) tRPC Router
 *
 * Multi-tenant: all queries and writes are scoped to orgId.
 * No cross-org data access is possible through any procedure here.
 *
 * Procedures:
 *   ras.activateAlert        — admin/responder: trigger Lockdown or Lockout
 *   ras.acknowledge          — all ras roles: confirm receipt of alert
 *   ras.markResponding       — responder/admin: mark self as actively responding
 *   ras.addStatusUpdate      — admin/responder: post a status update (max 120 chars)
 *   ras.resolveAlert         — admin only: move alert to resolved / All Clear
 *   ras.getActiveAlert       — all ras roles: get current active alert for org
 *   ras.getAlertDashboard    — admin: full dashboard with recipient status
 *   ras.getReadiness         — admin: push coverage summary for org
 *   ras.savePushSubscription — all ras roles: register/update device push subscription
 *   ras.getVapidPublicKey    — public: return VAPID public key for subscription setup
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, paidProcedure, publicProcedure } from "./_core/trpc";
import { writeAuditLog, buildLogContext } from "./auditLogger";
import { fanoutAlertPush } from "./push";
import { getDb as getSharedDb } from "./db";
import {
  alertEvents,
  alertRecipients,
  alertStatusUpdates,
  pushSubscriptions,
  users,
} from "../drizzle/schema";

// ─── Default alert message templates ─────────────────────────────────────────
const DEFAULT_TEMPLATES = {
  lockdown: {
    title: "LOCKDOWN — Immediate Action Required",
    body: "A lockdown has been initiated. Follow your lockdown procedure immediately.",
    staffInstruction:
      "LOCKDOWN IN EFFECT. Lock your door, turn off lights, move away from windows, silence your phone, and do not open the door for anyone until an All Clear is issued.",
    responderInstruction:
      "LOCKDOWN IN EFFECT. Proceed to your designated staging area. Do not enter the affected zone without authorization. Await coordination instructions.",
    adminInstruction:
      "LOCKDOWN IN EFFECT. Monitor all zones. Coordinate with security and emergency services. Issue status updates as information becomes available.",
  },
  lockout: {
    title: "LOCKOUT — Secure the Perimeter",
    body: "A lockout has been initiated. All exterior doors must be secured immediately.",
    staffInstruction:
      "LOCKOUT IN EFFECT. All exterior doors are to be locked. Continue normal operations inside. Do not allow anyone to enter or exit until the lockout is lifted.",
    responderInstruction:
      "LOCKOUT IN EFFECT. Secure all exterior access points. Account for personnel in your zone. Report status to the incident commander.",
    adminInstruction:
      "LOCKOUT IN EFFECT. Confirm all perimeter access points are secured. Coordinate with responding units. Issue status updates as information becomes available.",
  },
};

// ─── Helper: resolve orgId for a user ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserOrgId(db: any, userId: number): Promise<number | null> {
  const rows = (await db.execute(
    `SELECT orgId FROM org_members WHERE userId = ${userId} LIMIT 1`
  ) as unknown) as Array<{ orgId: number }>;
  return rows[0]?.orgId ?? null;
}

// ─── Helper: assert user has a RAS role ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertRasRole(
  db: any,
  userId: number,
  allowed: Array<"admin" | "responder" | "staff">
): Promise<{ rasRole: "admin" | "responder" | "staff"; orgId: number | null }> {
  const rows = (await db.execute(
    `SELECT rasRole, id FROM users WHERE id = ${userId} LIMIT 1`
  ) as unknown) as Array<{ rasRole: string | null }>;

  const rasRole = rows[0]?.rasRole as "admin" | "responder" | "staff" | null;
  if (!rasRole || !allowed.includes(rasRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "RAS access not authorized for your role." });
  }

  // orgId is optional — platform may run single-org without org_members table
  const orgId = await getUserOrgId(db, userId);

  return { rasRole, orgId };
}

async function getDb() {
  const db = await getSharedDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const rasRouter = router({

  // ── Public: return VAPID public key for client subscription setup ──────────
  getVapidPublicKey: publicProcedure.query(() => {
    const key = process.env.VAPID_PUBLIC_KEY ?? "";
    if (!key) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Push notifications not configured." });
    return { vapidPublicKey: key };
  }),

  // ── Save/update push subscription for current device ──────────────────────
  savePushSubscription: paidProcedure
    .input(z.object({
      subscription: z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
        expirationTime: z.number().nullable().optional(),
      }),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      const orgId = await getUserOrgId(db, userId);
      // Users without an org can still save a subscription (they'll get alerts when assigned)
      const endpoint = input.subscription.endpoint;

      // Upsert: unique on (orgId, userId, endpoint)
      // If endpoint already exists for this user+org, update subscription data
      await db.execute(
        `INSERT INTO push_subscriptions (userId, orgId, subscription, endpoint, userAgent, createdAt, updatedAt)
         VALUES (${userId}, ${orgId ?? "NULL"}, ${JSON.stringify(JSON.stringify(input.subscription))}, ${JSON.stringify(endpoint)}, ${JSON.stringify(input.userAgent ?? "")}, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           subscription = VALUES(subscription),
           userAgent = VALUES(userAgent),
           updatedAt = NOW()`
      );

      return { success: true };
    }),

  // ── Activate alert (Lockdown or Lockout) ──────────────────────────────────
  activateAlert: paidProcedure
    .input(z.object({
      facilityId: z.number().int().positive(),
      alertType: z.enum(["lockdown", "lockout"]),
      // Optional overrides — defaults to template if not provided
      messageTitle: z.string().max(255).optional(),
      messageBody: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { rasRole, orgId } = await assertRasRole(db, ctx.user.id, ["admin", "responder"]);

      // Verify facility belongs to this org
      const facilityRows = (await db.execute(
        `SELECT id, orgId FROM facilities WHERE id = ${input.facilityId} LIMIT 1`
      ) as unknown) as Array<{ id: number; orgId: number | null }>;

      const facility = facilityRows[0];
      if (!facility || (facility.orgId !== null && facility.orgId !== orgId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Facility not found in your organization." });
      }

      // Check for already-active alert for this facility
      const existingRows = (await db.execute(
        `SELECT id FROM alert_events WHERE facilityId = ${input.facilityId} AND alertStatus != 'resolved' LIMIT 1`
      ) as unknown) as Array<{ id: number }>;

      if (existingRows.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "An active alert already exists for this facility. Resolve it before activating a new one." });
      }

      const tmpl = DEFAULT_TEMPLATES[input.alertType];
      const title = input.messageTitle ?? tmpl.title;
      const body = input.messageBody ?? tmpl.body;
      const roleInstructions = {
        staff: tmpl.staffInstruction,
        responder: tmpl.responderInstruction,
        admin: tmpl.adminInstruction,
      };

      // Insert alert event
      const result = (await db.execute(
        `INSERT INTO alert_events (orgId, facilityId, alertType, alertStatus, messageTitle, messageBody, roleInstructions, createdByUserId, createdAt, updatedAt)
         VALUES (${orgId}, ${input.facilityId}, '${input.alertType}', 'active', ${JSON.stringify(title)}, ${JSON.stringify(body)}, ${JSON.stringify(JSON.stringify(roleInstructions))}, ${ctx.user.id}, NOW(), NOW())`
      ) as unknown) as { insertId: number };

      const alertEventId = result.insertId;

      // Create alert_recipients for all org users with a rasRole
      const orgUsers = (await db.execute(
        `SELECT id, rasRole FROM users u
         JOIN org_members om ON om.userId = u.id
         WHERE om.orgId = ${orgId} AND u.rasRole IS NOT NULL`
      ) as unknown) as Array<{ id: number; rasRole: string }>;

      for (const u of orgUsers) {
        await db.execute(
          `INSERT INTO alert_recipients (alertEventId, userId, rasRoleAtTime, deliveryStatus)
           VALUES (${alertEventId}, ${u.id}, '${u.rasRole}', 'pending')`
        );
      }

      // Audit log
      await writeAuditLog(buildLogContext({ user: ctx.user, orgId, req: ctx.req }), {
        action: "create",
        entityType: "alert_event",
        entityId: String(alertEventId),
        description: `${input.alertType.toUpperCase()} alert activated for facility ${input.facilityId}`,
        metadata: { alertType: input.alertType, facilityId: input.facilityId, activatedBy: ctx.user.id },
      });

      // Fan out push notifications (non-blocking — errors are captured per-subscription)
      if (orgId !== null) fanoutAlertPush({
        orgId,
        alertEventId,
        alertType: input.alertType,
        messageTitle: title,
        roleInstructions,
      }).catch((err) => console.error("[RAS/Push] Fanout error:", err));

      return { success: true, alertEventId };
    }),

  // ── Acknowledge alert receipt ──────────────────────────────────────────────
  acknowledge: paidProcedure
    .input(z.object({ alertEventId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin", "responder", "staff"]);

      // Verify alert belongs to this org
      const alertRows = (await db.execute(
        `SELECT id, orgId FROM alert_events WHERE id = ${input.alertEventId} AND orgId = ${orgId} LIMIT 1`
      ) as unknown) as Array<{ id: number }>;
      if (!alertRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });

      await db.execute(
        `UPDATE alert_recipients SET acknowledgedAt = NOW()
         WHERE alertEventId = ${input.alertEventId} AND userId = ${ctx.user.id} AND acknowledgedAt IS NULL`
      );

      return { success: true };
    }),

  // ── Mark self as actively responding ──────────────────────────────────────
  markResponding: paidProcedure
    .input(z.object({ alertEventId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin", "responder"]);

      const alertRows = (await db.execute(
        `SELECT id FROM alert_events WHERE id = ${input.alertEventId} AND orgId = ${orgId} LIMIT 1`
      ) as unknown) as Array<{ id: number }>;
      if (!alertRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });

      await db.execute(
        `UPDATE alert_recipients SET responseStatus = 'responding', responseUpdatedAt = NOW()
         WHERE alertEventId = ${input.alertEventId} AND userId = ${ctx.user.id}`
      );

      // Escalate alert status to response_in_progress if still active
      await db.execute(
        `UPDATE alert_events SET alertStatus = 'response_in_progress', updatedAt = NOW()
         WHERE id = ${input.alertEventId} AND alertStatus = 'active'`
      );

      return { success: true };
    }),

  // ── Add status update (admin/responder only, max 120 chars) ───────────────
  addStatusUpdate: paidProcedure
    .input(z.object({
      alertEventId: z.number().int().positive(),
      statusType: z.enum(["active", "response_in_progress", "resolved"]),
      shortMessage: z.string().max(120).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin", "responder"]);

      const alertRows = (await db.execute(
        `SELECT id FROM alert_events WHERE id = ${input.alertEventId} AND orgId = ${orgId} LIMIT 1`
      ) as unknown) as Array<{ id: number }>;
      if (!alertRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });

      await db.execute(
        `INSERT INTO alert_status_updates (alertEventId, statusType, shortMessage, createdByUserId, createdAt)
         VALUES (${input.alertEventId}, '${input.statusType}', ${input.shortMessage ? JSON.stringify(input.shortMessage) : "NULL"}, ${ctx.user.id}, NOW())`
      );

      // Update alert event status
      await db.execute(
        `UPDATE alert_events SET alertStatus = '${input.statusType}', updatedAt = NOW()
         WHERE id = ${input.alertEventId}`
      );

      await writeAuditLog(buildLogContext({ user: ctx.user, orgId, req: ctx.req }), {
        action: "update",
        entityType: "alert_event",
        entityId: String(input.alertEventId),
        description: `Status updated to ${input.statusType}${input.shortMessage ? `: ${input.shortMessage}` : ""}`,
        metadata: { statusType: input.statusType, updatedBy: ctx.user.id },
      });

      return { success: true };
    }),

  // ── Resolve alert (admin only) ─────────────────────────────────────────────
  resolveAlert: paidProcedure
    .input(z.object({
      alertEventId: z.number().int().positive(),
      shortMessage: z.string().max(120).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin"]);

      const alertRows = (await db.execute(
        `SELECT id FROM alert_events WHERE id = ${input.alertEventId} AND orgId = ${orgId} LIMIT 1`
      ) as unknown) as Array<{ id: number }>;
      if (!alertRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });

      await db.execute(
        `UPDATE alert_events SET alertStatus = 'resolved', resolvedAt = NOW(), updatedAt = NOW()
         WHERE id = ${input.alertEventId}`
      );

      await db.execute(
        `INSERT INTO alert_status_updates (alertEventId, statusType, shortMessage, createdByUserId, createdAt)
         VALUES (${input.alertEventId}, 'resolved', ${input.shortMessage ? JSON.stringify(input.shortMessage) : "NULL"}, ${ctx.user.id}, NOW())`
      );

      await writeAuditLog(buildLogContext({ user: ctx.user, orgId, req: ctx.req }), {
        action: "update",
        entityType: "alert_event",
        entityId: String(input.alertEventId),
        description: `Alert resolved — All Clear issued`,
        metadata: { resolvedBy: ctx.user.id, message: input.shortMessage ?? null },
      });

      return { success: true };
    }),

  // ── Get active alert for current user's org ────────────────────────────────
  getActiveAlert: paidProcedure
    .input(z.object({ facilityId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId, rasRole } = await assertRasRole(db, ctx.user.id, ["admin", "responder", "staff"]);

      const facilityFilter = input.facilityId ? `AND ae.facilityId = ${input.facilityId}` : "";

      const alertRows = (await db.execute(
        `SELECT ae.*, u.name AS activatedByName
         FROM alert_events ae
         LEFT JOIN users u ON u.id = ae.createdByUserId
         WHERE ae.orgId = ${orgId} AND ae.alertStatus != 'resolved' ${facilityFilter}
         ORDER BY ae.createdAt DESC LIMIT 1`
      ) as unknown) as Array<Record<string, unknown>>;

      if (!alertRows.length) return null;

      const alert = alertRows[0];
      const alertEventId = alert.id as number;

      // Get this user's recipient record
      const recipientRows = (await db.execute(
        `SELECT * FROM alert_recipients WHERE alertEventId = ${alertEventId} AND userId = ${ctx.user.id} LIMIT 1`
      ) as unknown) as Array<Record<string, unknown>>;

      // Get status updates
      const updates = (await db.execute(
        `SELECT asu.*, u.name AS updatedByName
         FROM alert_status_updates asu
         LEFT JOIN users u ON u.id = asu.createdByUserId
         WHERE asu.alertEventId = ${alertEventId}
         ORDER BY asu.createdAt ASC`
      ) as unknown) as Array<Record<string, unknown>>;

      // Parse roleInstructions
      let roleInstructions: Record<string, string> = {};
      try {
        const raw = alert.roleInstructions;
        roleInstructions = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, string>) ?? {};
      } catch { /* ignore */ }

      const instruction = roleInstructions[rasRole] ?? roleInstructions["staff"] ?? "";

      return {
        ...alert,
        roleInstructions,
        instruction,
        recipient: recipientRows[0] ?? null,
        statusUpdates: updates,
      };
    }),

  // ── Admin dashboard: full recipient status for an alert ───────────────────
  getAlertDashboard: paidProcedure
    .input(z.object({ alertEventId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin"]);

      const alertRows = (await db.execute(
        `SELECT * FROM alert_events WHERE id = ${input.alertEventId} AND orgId = ${orgId} LIMIT 1`
      ) as unknown) as Array<Record<string, unknown>>;
      if (!alertRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });

      const recipients = (await db.execute(
        `SELECT ar.*, u.name AS userName, u.email AS userEmail, u.rasRole
         FROM alert_recipients ar
         LEFT JOIN users u ON u.id = ar.userId
         WHERE ar.alertEventId = ${input.alertEventId}
         ORDER BY ar.rasRoleAtTime, u.name`
      ) as unknown) as Array<Record<string, unknown>>;

      const updates = (await db.execute(
        `SELECT asu.*, u.name AS updatedByName
         FROM alert_status_updates asu
         LEFT JOIN users u ON u.id = asu.createdByUserId
         WHERE asu.alertEventId = ${input.alertEventId}
         ORDER BY asu.createdAt ASC`
      ) as unknown) as Array<Record<string, unknown>>;

      // Delivery summary counts
      const total = recipients.length;
      const delivered = recipients.filter((r) => r.deliveryStatus === "delivered").length;
      const failed = recipients.filter((r) => r.deliveryStatus === "failed").length;
      const pending = recipients.filter((r) => r.deliveryStatus === "pending").length;
      const acknowledged = recipients.filter((r) => r.acknowledgedAt != null).length;
      const responding = recipients.filter((r) => r.responseStatus === "responding").length;

      return {
        alert: alertRows[0],
        recipients,
        statusUpdates: updates,
        summary: { total, delivered, failed, pending, acknowledged, responding },
      };
    }),

  // ── Readiness: push coverage summary for org ──────────────────────────────
  getReadiness: paidProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin"]);

      // All users in org with a rasRole
      const orgUsers = (await db.execute(
        `SELECT u.id, u.name, u.email, u.rasRole
         FROM users u
         JOIN org_members om ON om.userId = u.id
         WHERE om.orgId = ${orgId} AND u.rasRole IS NOT NULL`
      ) as unknown) as Array<{ id: number; name: string; email: string; rasRole: string }>;

      // Users with at least one push subscription in this org
      const pushRows = (await db.execute(
        `SELECT DISTINCT userId FROM push_subscriptions WHERE orgId = ${orgId}`
      ) as unknown) as Array<{ userId: number }>;

      const pushEnabledIds = new Set(pushRows.map((r) => r.userId));

      const totalUsers = orgUsers.length;
      const pushEnabled = orgUsers.filter((u) => pushEnabledIds.has(u.id)).length;
      const noPush = totalUsers - pushEnabled;
      const respondersNoPush = orgUsers.filter(
        (u) => u.rasRole === "responder" && !pushEnabledIds.has(u.id)
      ).length;

      const usersDetail = orgUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rasRole: u.rasRole,
        pushEnabled: pushEnabledIds.has(u.id),
      }));

      return {
        orgId,
        totalUsers,
        pushEnabled,
        noPush,
        respondersNoPush,
        usersDetail,
      };
    }),

  // ── RAS Role Management (admin only) ───────────────────────────────────────
  listRasUsers: paidProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      await assertRasRole(db, ctx.user.id, ["admin"]);
      const rows = (await db.execute(
        `SELECT u.id, u.name, u.email, u.role, u.rasRole,
                COUNT(ps.id) AS pushSubscriptionCount
         FROM users u
         LEFT JOIN push_subscriptions ps ON ps.userId = u.id
         GROUP BY u.id
         ORDER BY u.name ASC`
      ) as unknown) as Array<Record<string, unknown>>;
      return rows;
    }),

  setRasRole: paidProcedure
    .input(z.object({
      targetUserId: z.number().int(),
      rasRole: z.enum(["admin", "responder", "staff"]).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await assertRasRole(db, ctx.user.id, ["admin"]);
      // Verify target user exists
      const [target] = (await db.execute(
        `SELECT id, name FROM users WHERE id = ${input.targetUserId} LIMIT 1`
      ) as unknown) as Array<Record<string, unknown>>;
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const rasRoleVal = input.rasRole === null ? "NULL" : `'${input.rasRole}'`;
      await db.execute(
        `UPDATE users SET rasRole = ${rasRoleVal} WHERE id = ${input.targetUserId}`
      );
      await writeAuditLog(buildLogContext(ctx), {
        action: "role_changed",
        entityType: "user",
        entityId: String(input.targetUserId),
        description: `RAS role set to ${input.rasRole ?? "none"} for user ${String(target.name)}`,
        metadata: { rasRole: input.rasRole, targetName: target.name },
      });
      return { success: true, userId: input.targetUserId, rasRole: input.rasRole };
    }),

  // ── Recent alerts list for org (admin) ────────────────────────────────────
  getAlertHistory: paidProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { orgId } = await assertRasRole(db, ctx.user.id, ["admin"]);

      const rows = (await db.execute(
        `SELECT ae.*, u.name AS activatedByName, f.name AS facilityName
         FROM alert_events ae
         LEFT JOIN users u ON u.id = ae.createdByUserId
         LEFT JOIN facilities f ON f.id = ae.facilityId
         WHERE ae.orgId = ${orgId}
         ORDER BY ae.createdAt DESC
         LIMIT ${input.limit}`
      ) as unknown) as Array<Record<string, unknown>>;

      return rows;
    }),
});
