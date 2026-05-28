import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from "./notificationDb";

export const notificationRouter = router({
  /** List notifications for the current user */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      return getNotificationsForUser(ctx.user.id, input.limit);
    }),

  /** Get unread count */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadNotificationCount(ctx.user.id);
  }),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});