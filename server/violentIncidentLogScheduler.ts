/**
 * violentIncidentLogScheduler.ts — lightweight in-process scheduler that fires
 * the Day 1 / 10 / 14 reminders for California Violent Incident Log "Log
 * Requested" workflows (SB 553 / LC 6401.9). Runs hourly by default.
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { violentIncidentLogRequests } from "../drizzle/schema";
import { notifyViolentLogAdmins } from "./violentIncidentLogNotify";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkDueRequests(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  const rows = await db.select().from(violentIncidentLogRequests)
    .where(eq(violentIncidentLogRequests.status, "pending"));
  for (const req of rows) {
    if (req.status !== "pending") continue;
    const ageMs = now - new Date(req.requestedAt).getTime();
    const days = Math.floor(ageMs / DAY_MS);
    const dueLabel = req.dueAt ? new Date(req.dueAt).toLocaleDateString() : "N/A";
    try {
      if (days >= 1 && !req.notifiedDay1At && req.orgId != null) {
        await notifyViolentLogAdmins(req.orgId, {
          title: "Violent Incident Log Request — Day 1",
          body: `A log copy was requested ${days} day(s) ago. 15-day deadline: ${dueLabel}.`,
        });
        await db.update(violentIncidentLogRequests).set({ notifiedDay1At: new Date() }).where(eq(violentIncidentLogRequests.id, req.id));
      }
      if (days >= 10 && !req.notifiedDay10At && req.orgId != null) {
        await notifyViolentLogAdmins(req.orgId, {
          title: "Violent Incident Log Request — Day 10",
          body: `5 days remain to provide the requested log copy. Deadline: ${dueLabel}.`,
        });
        await db.update(violentIncidentLogRequests).set({ notifiedDay10At: new Date() }).where(eq(violentIncidentLogRequests.id, req.id));
      }
      if (days >= 14 && !req.notifiedDay14At && req.orgId != null) {
        await notifyViolentLogAdmins(req.orgId, {
          title: "Violent Incident Log Request — Day 14 (FINAL)",
          body: `The requested log copy is due TOMORROW (${dueLabel}). Ensure it is provided within the 15-day statutory deadline.`,
        });
        await db.update(violentIncidentLogRequests).set({ notifiedDay14At: new Date() }).where(eq(violentIncidentLogRequests.id, req.id));
      }
    } catch (err) {
      console.error("[ViolentLogScheduler] error for request", req.id, err);
    }
  }
}

/** Start the in-process scheduler. Call once at server boot. */
export function startViolentLogScheduler(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  checkDueRequests().catch(err => console.error("[ViolentLogScheduler] startup check failed:", err));
  const timer = setInterval(() => {
    checkDueRequests().catch(err => console.error("[ViolentLogScheduler] check failed:", err));
  }, intervalMs);
  timer.unref?.();
  return timer;
}