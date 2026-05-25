import { storageGet, storageListDirectories } from "./storage";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, paidProcedure, orgAdminProcedure } from "./_core/trpc";
import { getOrgMembershipForUser, getOrgMemberRecord } from "./db";
import {
  getTrainingModulesByOrgOrGlobal,
  getTrainingModuleById,
  getTrainingModuleByStoragePrefix,
  createTrainingModule,
  deleteTrainingModule,
} from "./db";

export const trainingModuleRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId ?? 0;

      // Auto-discover S3 courses on every visit
      const s3Prefixes = process.env.S3_COURSES_PREFIX 
        ? process.env.S3_COURSES_PREFIX.split(",").map(s => s.trim())
        : ["courses"];
      for (const prefix of s3Prefixes) {
        try {
          const dirs = await storageListDirectories(prefix);
          for (const dirName of dirs) {
            const storagePrefix = `${prefix}/${dirName}`;
            const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
            if (!existing) {
              await createTrainingModule({
                orgId: null as any,
                createdByUserId: ctx.user.id,
                courseTitle: dirName,
                launchPath: "story.html",
                playerType: "Articulate_Storyline_Web",
                trackingType: "None",
                storagePrefix,
                sourceFileName: null,
                metaJson: JSON.stringify({ autoDiscovered: true, discoveredAt: new Date().toISOString() }),
              });
            }
          }
        } catch (err: any) {
          console.warn(`[TrainingModule] S3 auto-discovery failed for prefix "${prefix}":`, err?.message ?? err);
        }
      }

      return getTrainingModulesByOrgOrGlobal(orgId);
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

  delete: orgAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTrainingModule(input.id);
      return { success: true };
    }),

  // Manual trigger to re-scan S3 for new courses
  syncS3: orgAdminProcedure
    .mutation(async ({ ctx }) => {
      const results: { dirName: string; status: "registered" | "already_exists" | "error"; error?: string }[] = [];
      const s3Prefixes = process.env.S3_COURSES_PREFIX
        ? process.env.S3_COURSES_PREFIX.split(",").map(s => s.trim())
        : ["courses"];
      for (const prefix of s3Prefixes) {
        try {
          const dirs = await storageListDirectories(prefix);
          for (const dirName of dirs) {
            const storagePrefix = `${prefix}/${dirName}`;
            try {
              const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
              if (existing) {
                results.push({ dirName, status: "already_exists" });
              } else {
                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle: dirName,
                  launchPath: "story.html",
                  playerType: "Articulate_Storyline_Web",
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({ autoDiscovered: true, discoveredAt: new Date().toISOString() }),
                });
                results.push({ dirName, status: "registered" });
              }
            } catch (err: any) {
              results.push({ dirName, status: "error", error: err?.message ?? String(err) });
            }
          }
        } catch (err: any) {
          // Prefix-level error
          results.push({ dirName: prefix, status: "error", error: err?.message ?? String(err) });
        }
      }
      return results;
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
