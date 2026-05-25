import { storageGet } from "./storage";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, paidProcedure, orgAdminProcedure } from "./_core/trpc";
import { getOrgMemberRecord } from "./db";
import {
  getTrainingModulesByOrg,
  getTrainingModuleById,
  createTrainingModule,
  deleteTrainingModule,
} from "./db";

export const trainingModuleRouter = router({
  list: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      if (!member && !["admin", "ultra_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getTrainingModulesByOrg(input.orgId);
    }),

  get: paidProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const module = await getTrainingModuleById(input.id);
      if (!module) throw new TRPCError({ code: "NOT_FOUND" });
      if (module.orgId) {
        const member = await getOrgMemberRecord(module.orgId, ctx.user.id);
        if (!member && !["admin", "ultra_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return module;
    }),

  // Register an existing S3 course that wasn't uploaded through the pipeline
  register: orgAdminProcedure
    .input(
      z.object({
        orgId: z.number(),
        courseTitle: z.string().min(1),
        launchPath: z.string().min(1),
        storagePrefix: z.string().optional(),
        sourceFileName: z.string().optional(),
        metaJson: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const moduleId = await createTrainingModule({
        orgId: input.orgId,
        createdByUserId: ctx.user.id,
        courseTitle: input.courseTitle,
        launchPath: input.launchPath,
        playerType: "Articulate_Storyline_Web",
        trackingType: "None",
        storagePrefix: input.storagePrefix ?? "",
        sourceFileName: input.sourceFileName ?? null,
        metaJson: input.metaJson ?? null,
      });
      return { success: true, moduleId };
    }),

  delete: orgAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTrainingModule(input.id);
      return { success: true };
    }),

  // Generate a presigned S3 URL for launching a training course
  getLaunchUrl: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const mod = await getTrainingModuleById(input.id);
      if (!mod) throw new TRPCError({ code: "NOT_FOUND" });
      if (mod.orgId) {
        const member = await getOrgMemberRecord(mod.orgId, ctx.user.id);
        if (!member && !["admin", "ultra_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      const s3Key = mod.storagePrefix
        ? `${mod.storagePrefix}/${mod.launchPath}`
        : mod.launchPath;
      const { url } = await storageGet(s3Key);
      return { url };
    }),
});
