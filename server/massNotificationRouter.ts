/**
 * massNotificationRouter.ts — Send push notifications to all users via email + in-app
 *
 * Requires admin/super_admin/ultra_admin role.
 * Uses sendGhlEmail for email delivery and stores in-app notifications in the database.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "./_core/trpc";
import { sendGhlEmail } from "./_core/ghl";
import { getDb, getAllUsers } from "./db";
import { sql } from "drizzle-orm";

// ─── In-app notifications table (created on first use) ────────────────────────
const CREATE_NOTIFICATIONS_TABLE = sql`
  CREATE TABLE IF NOT EXISTS \`in_app_notifications\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`senderId\` int NOT NULL,
    \`title\` varchar(500) NOT NULL,
    \`content\` text NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`in_app_notifications_id\` PRIMARY KEY(\`id\`)
  )
`;

const CREATE_NOTIFICATION_RECIPIENTS_TABLE = sql`
  CREATE TABLE IF NOT EXISTS \`notification_recipients\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`notificationId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`readAt\` timestamp,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`notification_recipients_id\` PRIMARY KEY(\`id\`),
    INDEX \`idx_notif_user\` (\`userId\`, \`notificationId\`)
  )
`;

async function ensureTables() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB connection" });
  await db.execute(CREATE_NOTIFICATIONS_TABLE);
  await db.execute(CREATE_NOTIFICATION_RECIPIENTS_TABLE);
}

export const massNotificationRouter = router({
  /** Send a mass notification to all users */
  send: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      await ensureTables();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB connection" });

      // Get all users with emails
      const allUsers = await getAllUsers();
      const usersWithEmail = allUsers.filter(u => u.email && u.name);

      // 1. Insert the notification record
      const [insertResult] = await db.execute(
        sql`INSERT INTO \`in_app_notifications\` (\`senderId\`, \`title\`, \`content\`) VALUES (${ctx.user.id}, ${input.title}, ${input.content})`
      );
      const notificationId = (insertResult as any).insertId ?? 0;

      // 2. Insert recipient records for all users
      if (notificationId && allUsers.length > 0) {
        const values = allUsers.map(u =>
          sql`(${notificationId}, ${u.id}, NOW())`
        );
        // Batch insert in chunks of 50
        for (let i = 0; i < values.length; i += 50) {
          const chunk = values.slice(i, i + 50);
          await db.execute(
            sql`INSERT INTO \`notification_recipients\` (\`notificationId\`, \`userId\`, \`createdAt\`) VALUES ${sql.join(chunk, sql`, `)}`
          );
        }
      }

      // 3. Send emails via GHL (fire-and-forget, log errors)
      let emailSuccess = 0;
      let emailFailed = 0;
      const emailPromises = usersWithEmail.map(async (u) => {
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1e293b; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">${input.title}</h2>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="margin: 0 0 16px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${input.content}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  This is an automated message from Five Stones Technology. You can view this notification in your dashboard.
                </p>
              </div>
            </div>
          `;
          const ok = await sendGhlEmail({
            toEmail: u.email!,
            toName: u.name!,
            subject: input.title,
            html,
            ghlContactId: u.ghlContactId,
          });
          if (ok) emailSuccess++; else emailFailed++;
        } catch {
          emailFailed++;
        }
      });
      await Promise.allSettled(emailPromises);

      return {
        success: true,
        notificationId,
        totalUsers: allUsers.length,
        emailsSent: emailSuccess,
        emailsFailed: emailFailed,
      };
    }),

  /** List all sent notifications (for the notification center) */
  listSent: adminProcedure.query(async () => {
    await ensureTables();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB connection" });
    const rows = await db.execute(
      sql`SELECT n.*, u.name as senderName
          FROM \`in_app_notifications\` n
          LEFT JOIN \`users\` u ON u.id = n.senderId
          ORDER BY n.createdAt DESC
          LIMIT 50`
    );
    return (rows as any[]).rows ?? rows ?? [];
  }),

  /** Get unread notification count for the current user */
  getMyUnreadCount: adminProcedure.query(async ({ ctx }) => {
    await ensureTables();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB connection" });
    const rows = await db.execute(
      sql`SELECT COUNT(*) as count FROM \`notification_recipients\` nr
          WHERE nr.userId = ${ctx.user.id} AND nr.readAt IS NULL`
    );
    const data = (rows as any[]).rows ?? rows ?? [];
    return (data[0] as any)?.count ?? 0;
  }),

  /** Mark a notification as read */
  markRead: adminProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ensureTables();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB connection" });
      await db.execute(
        sql`UPDATE \`notification_recipients\` SET \`readAt\` = NOW()
            WHERE \`notificationId\` = ${input.notificationId} AND \`userId\` = ${ctx.user.id}`
      );
      return { success: true };
    }),
});
