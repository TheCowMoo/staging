import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, paidProcedure } from "./_core/trpc";
import {
  createMicroDrillAssignment,
  getMicroDrillAssignmentsByAssigner,
  getMicroDrillAssignmentsToUser,
  getMicroDrillAssignmentById,
  completeMicroDrillAssignment,
  updateMicroDrillAssignment,
  getMicroDrillAssignmentsByOrg,
  getMicroDrillAssignmentsByDrillId,
  getOrgMembershipForUser,
} from "./db";
import { MICRO_DRILLS } from "../shared/microDrillsData";

export const microDrillRouter = router({
  // ─── List all drills (from the static data) ──────────────────────────────────
  listDrills: protectedProcedure.query(async () => {
    return MICRO_DRILLS;
  }),

  // ─── Get a single drill by ID ────────────────────────────────────────────────
  getDrill: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const drill = MICRO_DRILLS.find(d => d.id === input.id);
      if (!drill) throw new TRPCError({ code: "NOT_FOUND", message: "Drill not found" });
      return drill;
    }),

  // ─── Get a random drill ──────────────────────────────────────────────────────
  getRandomDrill: protectedProcedure
    .input(z.object({ categoryNumber: z.number().optional() }))
    .query(async ({ input }) => {
      let drills = MICRO_DRILLS;
      if (input.categoryNumber) {
        drills = drills.filter(d => d.categoryNumber === input.categoryNumber);
      }
      if (drills.length === 0) {
        drills = MICRO_DRILLS;
      }
      const randomIndex = Math.floor(Math.random() * drills.length);
      return drills[randomIndex];
    }),

  // ─── Get drills by category number ──────────────────────────────────────────
  listDrillsByCategory: protectedProcedure
    .input(z.object({ categoryNumber: z.number() }))
    .query(async ({ input }) => {
      return MICRO_DRILLS.filter(d => d.categoryNumber === input.categoryNumber);
    }),

  // ─── Assign a drill to personnel ───────────────────────────────────────────
  assign: paidProcedure
    .input(z.object({
      assignedToUserId: z.number().optional(),
      assignedToName: z.string().optional(),
      assignedToEmail: z.string().optional(),
      drillId: z.number(),
      drillCategory: z.string(),
      drillTitle: z.string(),
      orgId: z.number().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's org
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = input.orgId ?? memberships[0]?.orgId ?? null;

      const assignmentId = await createMicroDrillAssignment({
        orgId: orgId as number | null,
        assignedByUserId: ctx.user.id,
        assignedToUserId: input.assignedToUserId ?? null,
        assignedToName: input.assignedToName ?? null,
        assignedToEmail: input.assignedToEmail ?? null,
        drillId: input.drillId,
        drillCategory: input.drillCategory,
        drillTitle: input.drillTitle,
        status: "pending",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      } as any);
      return { id: assignmentId };
    }),

  // ─── Assign drill to multiple personnel ─────────────────────────────────────
  assignBulk: paidProcedure
    .input(z.object({
      drillId: z.number(),
      drillCategory: z.string(),
      drillTitle: z.string(),
      assignments: z.array(z.object({
        assignedToUserId: z.number().optional(),
        assignedToName: z.string().optional(),
        assignedToEmail: z.string().optional(),
      })),
      orgId: z.number().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = input.orgId ?? memberships[0]?.orgId ?? null;

      const results: number[] = [];
      for (const a of input.assignments) {
        const id = await createMicroDrillAssignment({
          orgId: orgId as number | null,
          assignedByUserId: ctx.user.id,
          assignedToUserId: a.assignedToUserId ?? null,
          assignedToName: a.assignedToName ?? null,
          assignedToEmail: a.assignedToEmail ?? null,
          drillId: input.drillId,
          drillCategory: input.drillCategory,
          drillTitle: input.drillTitle,
          status: "pending",
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        } as any);
        results.push(id);
      }
      return { ids: results, count: results.length };
    }),

  // ─── List assignments created by the current user (admin view) ──────────────
  listMyAssignments: paidProcedure
    .input(z.object({ orgId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getMicroDrillAssignmentsByAssigner(ctx.user.id, input.orgId);
    }),

  // ─── List assignments assigned TO the current user (trainee view) ────────────
  listMyIncomingAssignments: protectedProcedure.query(async ({ ctx }) => {
    return getMicroDrillAssignmentsToUser(ctx.user.id);
  }),

  // ─── Get a single assignment by ID ──────────────────────────────────────────
  getAssignment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const assignment = await getMicroDrillAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      return assignment;
    }),

  // ─── Start a drill assignment (sets status to in_progress) ──────────────────
  startAssignment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const assignment = await getMicroDrillAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
      await updateMicroDrillAssignment(input.id, { status: "in_progress" } as any);
      return { success: true };
    }),

  // ─── Complete a drill assignment ────────────────────────────────────────────
  completeAssignment: protectedProcedure
    .input(z.object({
      id: z.number(),
      step1Choice: z.string(),
      step2Choices: z.array(z.string()),
      considerationsChecked: z.array(z.boolean()),
      completedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      await completeMicroDrillAssignment(
        input.id,
        input.step1Choice,
        input.step2Choices,
        input.considerationsChecked,
        input.completedByName
      );
      return { success: true };
    }),

  // ─── Delete an assignment ───────────────────────────────────────────────────
  deleteAssignment: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Soft delete by setting status to expired
      await updateMicroDrillAssignment(input.id, { status: "expired" } as any);
      return { success: true };
    }),

  // ─── Get org-wide assignments (admin view) ──────────────────────────────────
  listOrgAssignments: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ input }) => {
      return getMicroDrillAssignmentsByOrg(input.orgId);
    }),

  // ─── Get drill stats (completion rates, etc.) ────────────────────────────────
  getStats: paidProcedure
    .input(z.object({ orgId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = input.orgId ?? memberships[0]?.orgId;

      let assignments;
      if (orgId) {
        assignments = await getMicroDrillAssignmentsByOrg(orgId);
      } else {
        assignments = await getMicroDrillAssignmentsByAssigner(ctx.user.id);
      }

      const total = assignments.length;
      const completed = assignments.filter(a => a.status === "completed").length;
      const pending = assignments.filter(a => a.status === "pending").length;
      const inProgress = assignments.filter(a => a.status === "in_progress").length;
      const expired = assignments.filter(a => a.status === "expired").length;

      // Completion rate by drill
      const byDrill: Record<string, { total: number; completed: number }> = {};
      for (const a of assignments) {
        const key = a.drillTitle;
        if (!byDrill[key]) byDrill[key] = { total: 0, completed: 0 };
        byDrill[key].total++;
        if (a.status === "completed") byDrill[key].completed++;
      }

      return {
        total,
        completed,
        pending,
        inProgress,
        expired,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        byDrill,
      };
    }),
});