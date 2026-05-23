/**
 * push.ts — Server-side Web Push helper for the Response Activation System (RAS)
 *
 * VAPID keys are loaded from environment variables only.
 * VAPID_PRIVATE_KEY is NEVER returned in API responses, never logged, never bundled to client.
 *
 * Environment separation:
 *   dev / staging / production each require their own generated VAPID key pair.
 *   Rotating keys invalidates all existing push subscriptions — users must re-subscribe.
 *   See VAPID_KEY_ROTATION.md for rotation procedure.
 *
 * Uniqueness rule for push_subscriptions:
 *   (orgId, userId, endpoint) — one row per device/browser per user per org.
 *   Duplicate endpoints are rejected at DB level (unique index idx_push_sub_unique).
 */

import webpush from "web-push";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { pushSubscriptions, alertRecipients } from "../drizzle/schema";

// ─── VAPID Initialisation ─────────────────────────────────────────────────────
// Called once at server startup. Fails loudly if keys are missing.
export function initVapid(): void {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("[RAS/Push] VAPID keys not configured — push notifications disabled.");
    return;
  }
  webpush.setVapidDetails(
    "mailto:alerts@pursuitpathways.com",
    pub,
    priv
  );
}

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ─── Push Payload Types ───────────────────────────────────────────────────────
export type RasRole = "admin" | "responder" | "staff";

export interface PushPayload {
  alertEventId: number;
  alertType: "lockdown" | "lockout";
  title: string;
  body: string;
  /** Role-specific instruction shown in the notification body */
  instruction: string;
  url: string;
}

// ─── Fan-out: send push to all subscribers for an alert event ─────────────────
/**
 * Sends push notifications to all push_subscriptions rows for the given org.
 * Role-filtered: each subscriber receives the instruction appropriate to their rasRole.
 * Returns per-subscription results for admin visibility.
 */
export async function fanoutAlertPush(params: {
  orgId: number;
  alertEventId: number;
  alertType: "lockdown" | "lockout";
  messageTitle: string;
  roleInstructions: { staff: string; responder: string; admin: string };
}): Promise<{ userId: number; endpoint: string; status: "sent" | "failed" | "expired" }[]> {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return [];

  const db = getDb();
  if (!db) return [];

  // Fetch all subscriptions for this org, joined with user rasRole
  const subs = await db.execute<{
    id: number;
    userId: number;
    subscription: unknown;
    endpoint: string | null;
    rasRole: string | null;
  }>(
    `SELECT ps.id, ps.userId, ps.subscription, ps.endpoint, u.rasRole
     FROM push_subscriptions ps
     JOIN users u ON u.id = ps.userId
     WHERE ps.orgId = ${params.orgId}
       AND u.rasRole IS NOT NULL`
  );

  const rows = (subs[0] as unknown) as Array<{
    id: number;
    userId: number;
    subscription: unknown;
    endpoint: string | null;
    rasRole: string | null;
  }>;

  const results: { userId: number; endpoint: string; status: "sent" | "failed" | "expired" }[] = [];

  for (const row of rows) {
    const rasRole = (row.rasRole ?? "staff") as RasRole;
    const instruction = params.roleInstructions[rasRole] ?? params.roleInstructions.staff;

    const payload: PushPayload = {
      alertEventId: params.alertEventId,
      alertType: params.alertType,
      title: params.messageTitle,
      body: instruction,
      instruction,
      url: "/ras",
    };

    let sub: webpush.PushSubscription;
    try {
      sub = (typeof row.subscription === "string"
        ? JSON.parse(row.subscription)
        : row.subscription) as webpush.PushSubscription;
    } catch {
      results.push({ userId: row.userId, endpoint: row.endpoint ?? "unknown", status: "failed" });
      continue;
    }

    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      results.push({ userId: row.userId, endpoint: row.endpoint ?? sub.endpoint, status: "sent" });

      // Mark as delivered in alert_recipients
      await db.execute(
        `UPDATE alert_recipients SET deliveryStatus = 'delivered', deliveredAt = NOW()
         WHERE alertEventId = ${params.alertEventId} AND userId = ${row.userId}`
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      const isExpired = statusCode === 410 || statusCode === 404;

      if (isExpired) {
        // Subscription is expired — remove it immediately
        await db.execute(`DELETE FROM push_subscriptions WHERE id = ${row.id}`);
        results.push({ userId: row.userId, endpoint: row.endpoint ?? sub.endpoint, status: "expired" });
      } else {
        // Transient failure — mark as failed, keep subscription
        results.push({ userId: row.userId, endpoint: row.endpoint ?? sub.endpoint, status: "failed" });
      }

      // Mark delivery failure in alert_recipients
      await db.execute(
        `UPDATE alert_recipients SET deliveryStatus = 'failed'
         WHERE alertEventId = ${params.alertEventId} AND userId = ${row.userId}`
      );
    }
  }

  return results;
}
