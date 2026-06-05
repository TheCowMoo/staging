import fs from "fs";
import path from "path";
import { storageGet, storageGetText, storageListDirectories, storageCheckFile, storagePut } from "./storage";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, paidProcedure, orgAdminProcedure, ultraAdminProcedure } from "./_core/trpc";
import { getOrgMembershipForUser, getOrgMemberRecord } from "./db";
import {
  getTrainingModulesByOrgOrGlobal,
  getTrainingModuleById,
  getTrainingModuleByStoragePrefix,
  createTrainingModule,
  deleteTrainingModule,
} from "./db";

/**
 * Try to find a thumbnail file for a course in S3.
 * Checks for course_thumbnail.webp first (uploaded folder thumbnail), 
 * then falls back to course.webp (new-format upload thumbnail).
 * Returns null if no thumbnail file is found.
 */
async function detectThumbnailUrl(storagePrefix: string): Promise<string | null> {
  // Check course_thumbnail.webp first (common for manually uploaded Storyline folders)
  const thumbExists = await storageCheckFile(`${storagePrefix}/course_thumbnail.webp`);
  if (thumbExists) {
    console.log(`[TrainingModule] Detected thumbnail: ${storagePrefix}/course_thumbnail.webp`);
    return `${storagePrefix}/course_thumbnail.webp`;
  }
  // Fall back to course.webp (API upload format)
  const webpExists = await storageCheckFile(`${storagePrefix}/course.webp`);
  if (webpExists) {
    console.log(`[TrainingModule] Detected thumbnail: ${storagePrefix}/course.webp`);
    return `${storagePrefix}/course.webp`;
  }
  return null;
}

/**
 * Parse course_link.txt content to extract URL and course name.
 * Format:
 *   Couse_link="https://..."
 *   Course_name="Active Threat"
 * Returns { launchPath, courseTitle, playerType } or null.
 */
function parseCourseLink(linkText: string | null, dirName: string): {
  launchPath: string;
  courseTitle: string;
  playerType: "external_link" | "Articulate_Storyline_Web";
} {
  if (!linkText) {
    return {
      launchPath: "story.html",
      courseTitle: dirName,
      playerType: "Articulate_Storyline_Web",
    };
  }
  // Extract URL from Couse_link or Course_link (both typo variants)
  const linkMatch = linkText.match(/(?:Couse|Course)_link\s*=\s*"([^"]+)"/i);
  if (linkMatch) {
    const launchPath = linkMatch[1];
    // Extract course name from Course_name
    const nameMatch = linkText.match(/Course_name\s*=\s*"([^"]+)"/i);
    const courseTitle = nameMatch ? nameMatch[1] : dirName;
    return { launchPath, courseTitle, playerType: "external_link" };
  }
  // Has course_link.txt but no recognized link format — treat as Storyline
  return {
    launchPath: "story.html",
    courseTitle: dirName,
    playerType: "Articulate_Storyline_Web",
  };
}

export const trainingModuleRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId ?? 0;

      // Auto-discover S3 courses on every visit
      const s3Prefixes = process.env.S3_COURSES_PREFIX 
        ? process.env.S3_COURSES_PREFIX.split(",").map(s => s.trim())
        : ["courses"];
      console.log(`[TrainingModule] S3 auto-discovery start — prefixes: [${s3Prefixes.join(", ")}]`);
      for (const prefix of s3Prefixes) {
        try {
          const dirs = await storageListDirectories(prefix);
          console.log(`[TrainingModule] Found ${dirs.length} directories under "${prefix}/": ${dirs.join(", ") || "(none)"}`);
          for (const dirName of dirs) {
            const storagePrefix = `${prefix}/${dirName}`;
            console.log(`[TrainingModule] Processing: ${storagePrefix}`);
            const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
            
            const linkText = await storageGetText(`${storagePrefix}/course_link.txt`);
            const parsed = parseCourseLink(linkText, dirName);
            
            // Detect thumbnail for ALL course types (not just external_link)
            const thumbnailUrl = await detectThumbnailUrl(storagePrefix);

            if (!existing) {
              console.log(`[TrainingModule] Registering new course: "${parsed.courseTitle}" (type=${parsed.playerType}) at ${storagePrefix}`);
              await createTrainingModule({
                orgId: null as any,
                createdByUserId: ctx.user.id,
                courseTitle: parsed.courseTitle,
                launchPath: parsed.launchPath,
                thumbnailUrl,
                playerType: parsed.playerType as any,
                trackingType: "None",
                storagePrefix,
                sourceFileName: null,
                metaJson: JSON.stringify({
                  autoDiscovered: true,
                  discoveredAt: new Date().toISOString(),
                  format: parsed.playerType === "external_link" ? "external_link" : "storyline",
                }),
              });
            } else {
              // Fix existing entries that may have wrong metadata
              const needsFix = (
                existing.courseTitle !== parsed.courseTitle ||
                existing.launchPath !== parsed.launchPath ||
                existing.playerType !== parsed.playerType ||
                existing.thumbnailUrl !== thumbnailUrl
              );
              if (needsFix) {
                console.log(`[TrainingModule] Fixing existing entry for "${parsed.courseTitle}" (title/thumb/path changed)`);
                await deleteTrainingModule(existing.id);
                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle: parsed.courseTitle,
                  launchPath: parsed.launchPath,
                  thumbnailUrl,
                  playerType: parsed.playerType as any,
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({
                    autoDiscovered: true,
                    discoveredAt: new Date().toISOString(),
                    format: parsed.playerType === "external_link" ? "external_link" : "storyline",
                  }),
                });
              } else {
                console.log(`[TrainingModule] Already registered: "${parsed.courseTitle}" at ${storagePrefix}`);
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
      console.log(`[TrainingModule] Manual syncS3 started — prefixes: [${s3Prefixes.join(", ")}]`);
      for (const prefix of s3Prefixes) {
        try {
          const dirs = await storageListDirectories(prefix);
          console.log(`[TrainingModule] syncS3: Found ${dirs.length} directories under "${prefix}/": ${dirs.join(", ") || "(none)"}`);
          for (const dirName of dirs) {
            const storagePrefix = `${prefix}/${dirName}`;
            try {
              const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
              if (existing) {
                // Check if existing entry needs thumbnail update
                const thumbnailUrl = await detectThumbnailUrl(storagePrefix);
                if (thumbnailUrl && existing.thumbnailUrl !== thumbnailUrl) {
                  console.log(`[TrainingModule] syncS3: Updating thumbnail for "${dirName}": ${thumbnailUrl}`);
                  await deleteTrainingModule(existing.id);
                  const parsed = parseCourseLink(
                    await storageGetText(`${storagePrefix}/course_link.txt`),
                    dirName
                  );
                  await createTrainingModule({
                    orgId: null as any,
                    createdByUserId: ctx.user.id,
                    courseTitle: parsed.courseTitle,
                    launchPath: parsed.launchPath,
                    thumbnailUrl,
                    playerType: parsed.playerType as any,
                    trackingType: "None",
                    storagePrefix,
                    sourceFileName: null,
                    metaJson: JSON.stringify({
                      autoDiscovered: true,
                      discoveredAt: new Date().toISOString(),
                      format: parsed.playerType === "external_link" ? "external_link" : "storyline",
                    }),
                  });
                  results.push({ dirName, status: "registered" });
                } else {
                  results.push({ dirName, status: "already_exists" });
                }
              } else {
                const linkText = await storageGetText(`${storagePrefix}/course_link.txt`);
                const parsed = parseCourseLink(linkText, dirName);
                const thumbnailUrl = await detectThumbnailUrl(storagePrefix);

                console.log(`[TrainingModule] syncS3: Registering "${parsed.courseTitle}" (type=${parsed.playerType}) at ${storagePrefix}`);
                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle: parsed.courseTitle,
                  launchPath: parsed.launchPath,
                  thumbnailUrl,
                  playerType: parsed.playerType as any,
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({
                    autoDiscovered: true,
                    discoveredAt: new Date().toISOString(),
                    format: parsed.playerType === "external_link" ? "external_link" : "storyline",
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

  // Diagnose S3 course auto-discovery (ultra_admin only)
  diagnose: ultraAdminProcedure
    .query(async () => {
      const results: {
        directories: string[];
        directoryDetails: { name: string; files: string[] }[];
        dbModules: { id: number; courseTitle: string; storagePrefix: string }[];
        errors: string[];
      } = {
        directories: [],
        directoryDetails: [],
        dbModules: [],
        errors: [],
      };

      // 1. Check S3 directories
      const s3Prefixes = process.env.S3_COURSES_PREFIX
        ? process.env.S3_COURSES_PREFIX.split(",").map(s => s.trim())
        : ["courses"];
      for (const prefix of s3Prefixes) {
        try {
          console.log(`[TrainingModule-Diagnose] Listing S3: ${prefix}/`);
          const dirs = await storageListDirectories(prefix);
          results.directories = dirs;
          for (const dirName of dirs) {
            const sp = `${prefix}/${dirName}`;
            const files: string[] = [];
            // Check for key files
            for (const file of ["story.html", "index.html", "course_link.txt", "course_thumbnail.webp", "course.webp"]) {
              try {
                const exists = await storageCheckFile(`${sp}/${file}`);
                if (exists) files.push(file);
              } catch (e: any) {
                files.push(`${file}(err:${e.message})`);
              }
            }
            results.directoryDetails.push({ name: dirName, files });
          }
        } catch (err: any) {
          results.errors.push(`S3 list error for "${prefix}/": ${err?.message || String(err)}`);
        }
      }

      // 2. Check training_modules in DB
      const { getDb } = await import("./db");
      try {
        const db = await getDb();
        if (db) {
          const { trainingModules } = await import("../drizzle/schema");
          const { desc } = await import("drizzle-orm");
          const rows = await db.select({
            id: trainingModules.id,
            courseTitle: trainingModules.courseTitle,
            storagePrefix: trainingModules.storagePrefix,
            playerType: trainingModules.playerType,
            thumbnailUrl: trainingModules.thumbnailUrl,
          }).from(trainingModules).orderBy(desc(trainingModules.id)).limit(50);
          results.dbModules = rows as any;
        } else {
          results.errors.push("DB not available");
        }
      } catch (err: any) {
        results.errors.push(`DB query error: ${err?.message || String(err)}`);
      }

      // 3. Check S3 config
      if (!process.env.S3_BUCKET_NAME) results.errors.push("S3_BUCKET_NAME not set");
      if (!process.env.S3_ACCESS_KEY_ID) results.errors.push("S3_ACCESS_KEY_ID not set");

      return results;
    }),

  // Upload a course folder from the server's local filesystem to S3 (ultra_admin only)
  uploadFromLocal: ultraAdminProcedure
    .input(z.object({
      localPath: z.string().min(1),
      courseName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;
      const resolvedPath = path.resolve(input.localPath);
      
      // Security: ensure the path exists and is a directory
      let stat: fs.Stats;
      try {
        stat = fs.statSync(resolvedPath);
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Path not found: ${resolvedPath}`,
        });
      }
      if (!stat.isDirectory()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provided path is not a directory",
        });
      }

      // Derive course name from folder name or override
      const courseTitle = input.courseName || path.basename(resolvedPath);
      // Sanitize folder name for S3 prefix
      const sanitizedDirName = path.basename(resolvedPath).replace(/[^a-zA-Z0-9 _-]/g, "").trim();
      const storagePrefix = `courses/${sanitizedDirName}`;

      console.log(`[TrainingModule] uploadFromLocal: "${resolvedPath}" → s3://${process.env.S3_BUCKET_NAME}/${storagePrefix}/ (user=${user.id})`);

      // Recursively walk the directory and upload all files
      const uploadedFiles: string[] = [];
      const errors: { file: string; error: string }[] = [];

      function walkDir(dir: string) {
        let entries: string[];
        try {
          entries = fs.readdirSync(dir);
        } catch {
          return;
        }
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          let entryStat: fs.Stats;
          try {
            entryStat = fs.statSync(fullPath);
          } catch {
            continue;
          }
          if (entryStat.isDirectory()) {
            walkDir(fullPath);
          } else if (entryStat.isFile()) {
            // Compute S3 key relative to the root folder
            const relativePath = path.relative(resolvedPath, fullPath).replace(/\\/g, "/");
            if (!relativePath) continue;
            const s3Key = `${storagePrefix}/${relativePath}`;
            try {
              const content = fs.readFileSync(fullPath);
              // Determine content type from extension
              const ext = path.extname(entry).toLowerCase();
              const mimeMap: Record<string, string> = {
                ".html": "text/html",
                ".htm": "text/html",
                ".js": "application/javascript",
                ".json": "application/json",
                ".css": "text/css",
                ".xml": "text/xml",
                ".webp": "image/webp",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".svg": "image/svg+xml",
                ".mp4": "video/mp4",
                ".webm": "video/webm",
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".woff": "font/woff",
                ".woff2": "font/woff2",
                ".ttf": "font/ttf",
                ".otf": "font/otf",
                ".eot": "application/vnd.ms-fontobject",
                ".ico": "image/x-icon",
                ".txt": "text/plain",
                ".pdf": "application/pdf",
                ".zip": "application/zip",
                ".swf": "application/x-shockwave-flash",
              };
              const contentType = mimeMap[ext] || "application/octet-stream";
              storagePut(s3Key, content, contentType);
              uploadedFiles.push(relativePath);
            } catch (err: any) {
              errors.push({ file: relativePath, error: err?.message || String(err) });
            }
          }
        }
      }

      walkDir(resolvedPath);

      return {
        success: true,
        courseTitle,
        storagePrefix,
        uploadedFiles: uploadedFiles.length,
        totalBytes: "see details",
        fileCount: uploadedFiles.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      };
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