import { storageGet, storageGetText, storageListDirectories } from "./storage";
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
            
            // Parse course_link.txt for URL and course name
            // Format:
            //   Couse_link="https://..."
            //   Course_name="Active Threat Shooter"
            const linkText = await storageGetText(`${storagePrefix}/course_link.txt`);
            let launchPath = "story.html";
            let courseTitle = dirName;
            let playerType: "external_link" | "Articulate_Storyline_Web" = "Articulate_Storyline_Web";

            if (linkText) {
              // Extract URL from Couse_link or Course_link
              const linkMatch = linkText.match(/(?:Couse|Course)_link\s*=\s*"([^"]+)"/i);
              if (linkMatch) {
                launchPath = linkMatch[1];
                playerType = "external_link";
              }
              // Extract course name from Course_name
              const nameMatch = linkText.match(/Course_name\s*=\s*"([^"]+)"/i);
              if (nameMatch) {
                courseTitle = nameMatch[1];
              }
            }

            const thumbnailUrl = playerType === "external_link" ? `${storagePrefix}/course.webp` : null;

            if (!existing) {
              await createTrainingModule({
                orgId: null as any,
                createdByUserId: ctx.user.id,
                courseTitle,
                launchPath,
                thumbnailUrl,
                playerType: playerType as any,
                trackingType: "None",
                storagePrefix,
                sourceFileName: null,
                metaJson: JSON.stringify({
                  autoDiscovered: true,
                  discoveredAt: new Date().toISOString(),
                  format: playerType === "external_link" ? "external_link" : "storyline",
                }),
              });
            } else {
              // Fix existing entries that may have been created with the old buggy code
              // (where course_link.txt raw content was stored as launchPath and courseTitle is wrong)
              const needsFix = linkText && (
                existing.courseTitle !== courseTitle ||
                (playerType === "external_link" && existing.launchPath !== launchPath) ||
                existing.playerType !== playerType
              );
              if (needsFix) {
                // Delete the stale entry so it gets re-created with correct data below
                await deleteTrainingModule(existing.id);
                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle,
                  launchPath,
                  thumbnailUrl,
                  playerType: playerType as any,
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({
                    autoDiscovered: true,
                    discoveredAt: new Date().toISOString(),
                    format: playerType === "external_link" ? "external_link" : "storyline",
                  }),
                });
              }
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
                // Parse course_link.txt for URL and course name
                // Format:
                //   Couse_link="https://..."
                //   Course_name="Active Threat Shooter"
                const linkText = await storageGetText(`${storagePrefix}/course_link.txt`);
                let launchPath = "story.html";
                let courseTitle = dirName;
                let playerType: "external_link" | "Articulate_Storyline_Web" = "Articulate_Storyline_Web";
                let thumbnailUrl: string | null = null;

                if (linkText) {
                  // Extract URL from Couse_link or Course_link
                  const linkMatch = linkText.match(/(?:Couse|Course)_link\s*=\s*"([^"]+)"/i);
                  if (linkMatch) {
                    launchPath = linkMatch[1];
                    playerType = "external_link";
                    thumbnailUrl = `${storagePrefix}/course.webp`;
                  }
                  // Extract course name from Course_name
                  const nameMatch = linkText.match(/Course_name\s*=\s*"([^"]+)"/i);
                  if (nameMatch) {
                    courseTitle = nameMatch[1];
                  }
                }

                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle,
                  launchPath,
                  thumbnailUrl,
                  playerType: playerType as any,
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({
                    autoDiscovered: true,
                    discoveredAt: new Date().toISOString(),
                    format: playerType === "external_link" ? "external_link" : "storyline",
                  }),
                });
                results.push({ dirName, status: "registered" });
              }
            } catch (err: any) {
              results.push({ dirName, status: "error", error: err?.message ?? String(err) });
            }
          }
        } catch (err: any) {
          results.push({ dirName: prefix, status: "error", error: err?.message ?? String(err) });
        }
      }
      return results;
    }),

  // Get launch URL — for external links return the URL directly, for legacy Storyline return presigned S3 URL
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

      // If launchPath is an external URL (http/https), return it directly
      if (mod.launchPath.startsWith("http://") || mod.launchPath.startsWith("https://")) {
        return { url: mod.launchPath };
      }

      // Also handle bare domain URLs without protocol prefix (e.g. "app.pursuitpathways.com/...")
      if (mod.launchPath.startsWith("//") || /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(mod.launchPath)) {
        return { url: mod.launchPath.startsWith("//") ? `https:${mod.launchPath}` : `https://${mod.launchPath}` };
      }

      // Legacy Storyline modules: generate presigned URL for the story.html file
      const s3Key = mod.storagePrefix
        ? `${mod.storagePrefix}/${mod.launchPath}`
        : mod.launchPath;
      const { url } = await storageGet(s3Key);
      return { url };
    }),
});