import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { notifications, type InsertNotification, type Notification } from "../drizzle/schema";

export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsForUser(userId: number, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationRead(notificationId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

/** Helper: create notifications for all org admins when an event occurs */
export async function notifyOrgAdmins(orgId: number, data: Omit<InsertNotification, "userId">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { orgMembers } = await import("../drizzle/schema");
  const admins = await db.select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, "admin")));
  for (const admin of admins) {
    await createNotification({ ...data, userId: admin.userId });
  }
}

/** Helper: create a notification for a specific user */
export async function notifyUser(userId: number, data: Omit<InsertNotification, "userId">): Promise<void> {
  await createNotification({ ...data, userId });
}