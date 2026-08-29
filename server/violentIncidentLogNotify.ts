/**
 * violentIncidentLogNotify.ts — shared notification helpers for the
 * California Violent Incident Log (SB 553) 15-day "Log Requested" workflow.
 * Sends in-app notifications (notifications table) + email (GHL) to org admins.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { orgMembers, users } from "../drizzle/schema";
import { createNotification } from "./notificationDb";
import { sendGhlEmail } from "./_core/ghl";

export interface ViolentLogAdminRecipient {
  userId: number;
  name: string | null;
  email: string | null;
}

export async function getOrgAdmins(orgId: number): Promise<ViolentLogAdminRecipient[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    userId: orgMembers.userId,
    name: users.name,
    email: users.email,
  })
    .from(orgMembers)
    .leftJoin(users, eq(users.id, orgMembers.userId))
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "admin")));
  return rows as ViolentLogAdminRecipient[];
}

/** Notify all org admins about a violent incident log request (in-app + email). */
export async function notifyViolentLogAdmins(
  orgId: number,
  opts: { title: string; body: string; link?: string }
): Promise<void> {
  const admins = await getOrgAdmins(orgId);
  for (const admin of admins) {
    await createNotification({
      userId: admin.userId,
      orgId,
      type: "violent_log_request",
      title: opts.title,
      body: opts.body,
      link: opts.link ?? "/violent-incident-log",
    });
    if (admin.email) {
      try {
        await sendGhlEmail({
          toEmail: admin.email,
          toName: admin.name ?? "Safety Administrator",
          subject: opts.title,
          html: `<p>${opts.body}</p>`,
        });
      } catch (err) {
        console.error("[ViolentLog] email error:", err);
      }
    }
  }
}