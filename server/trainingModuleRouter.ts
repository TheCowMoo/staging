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
 * Find a thumbnail in a local course folder.
 * Returns a URL path (served via Express static) or null.
 */
function detectLocalThumbnail(courseDir: string): string | null {
  const thumbPath = path.join(courseDir, "course_thumbnail.webp");
  if (fs.existsSync(thumbPath)) {
    return `/courses/${path.basename(courseDir)}/course_thumbnail.webp`;
  }
  const webpPath = path.join(courseDir, "course.webp");
  if (fs.existsSync(webpPath)) {
    return `/courses/${path.basename(courseDir)}/course.webp`;
  }
  return null;
}

/**
 * Parse course_link.txt content to extract URL and course name.
 * Format:
 *   Couse_link="https://..."
 *   Course_name="Active Threat"
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
  const linkMatch = linkText.match(/(?:Couse|Course)_link\s*=\s*"([^"]+)"/i);
  if (linkMatch) {
    const launchPath = linkMatch[1];
    const nameMatch = linkText.match(/Course_name\s*=\s*"([^"]+)"/i);
    const courseTitle = nameMatch ? nameMatch[1] : dirName;
    return { launchPath, courseTitle, playerType: "external_link" };
  }
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

      // Skip S3 discovery when local courses path is set (use filesystem instead)
      if (!process.env.LOCAL_COURSES_PATH) {
        const s3Prefixes = process.env.S3_COURSES_PREFIX 
          ? process.env.S3_COURSES_PREFIX.split(",").map(s => s.trim())
          : ["courses"];
        console.log(`[TrainingModule] S3 auto-discovery start — prefixes: [${s3Prefixes.join(", ")}]`);
        for (const prefix of s3Prefixes) {
          let dirs: string[] = [];
          try {
            dirs = await storageListDirectories(prefix);
            console.log(`[TrainingModule] Found ${dirs.length} directories under "${prefix}/": ${dirs.join(", ") || "(none)"}`);
          } catch (err: any) {
            console.warn(`[TrainingModule] S3 list failed for prefix "${prefix}":`, err?.message ?? err);
            continue;
          }
          for (const dirName of dirs) {
            try {
              const storagePrefix = `${prefix}/${dirName}`;
              console.log(`[TrainingModule] Processing: ${storagePrefix}`);
              const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
              
              const linkText = await storageGetText(`${storagePrefix}/course_link.txt`);
              const parsed = parseCourseLink(linkText, dirName);
              
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
            } catch (err: any) {
              console.warn(`[TrainingModule] S3 discovery failed for directory "${dirName}":`, err?.message ?? err);
            }
          }
        }
      }

      // Auto-discover local courses from LOCAL_COURSES_PATH
      const localCoursesPath = process.env.LOCAL_COURSES_PATH;
      if (localCoursesPath) {
        console.log(`[TrainingModule] Local auto-discovery start — path: ${localCoursesPath}`);
        try {
          const entries = fs.readdirSync(localCoursesPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const dirName = entry.name;
            const dirPath = path.join(localCoursesPath, dirName);
            const storagePrefix = `local:${dirName}`;
            
            console.log(`[TrainingModule] Local processing: ${dirPath}`);
            const existing = await getTrainingModuleByStoragePrefix(storagePrefix);
            
            // Check for story.html to determine if it's a course
            const storyPath = path.join(dirPath, "story.html");
            const hasStoryHtml = fs.existsSync(storyPath);
            if (!hasStoryHtml) {
              console.log(`[TrainingModule] Local skip (no story.html): ${dirName}`);
              continue;
            }

            const courseTitle = dirName;
            const launchPath = "story.html";
            const playerType: "Articulate_Storyline_Web" = "Articulate_Storyline_Web";
            const thumbnailUrl = detectLocalThumbnail(dirPath);

            if (!existing) {
              console.log(`[TrainingModule] Registering local course: "${courseTitle}" at ${storagePrefix}`);
              await createTrainingModule({
                orgId: null as any,
                createdByUserId: ctx.user.id,
                courseTitle,
                launchPath,
                thumbnailUrl,
                playerType,
                trackingType: "None",
                storagePrefix,
                sourceFileName: null,
                metaJson: JSON.stringify({
                  autoDiscovered: true,
                  discoveredAt: new Date().toISOString(),
                  format: "storyline",
                  localPath: dirPath,
                }),
              });
            } else {
              const needsFix = (
                existing.courseTitle !== courseTitle ||
                existing.thumbnailUrl !== thumbnailUrl
              );
              if (needsFix) {
                console.log(`[TrainingModule] Fixing local entry: "${courseTitle}"`);
                await deleteTrainingModule(existing.id);
                await createTrainingModule({
                  orgId: null as any,
                  createdByUserId: ctx.user.id,
                  courseTitle,
                  launchPath,
                  thumbnailUrl,
                  playerType,
                  trackingType: "None",
                  storagePrefix,
                  sourceFileName: null,
                  metaJson: JSON.stringify({
                    autoDiscovered: true,
                    discoveredAt: new Date().toISOString(),
                    format: "storyline",
                    localPath: dirPath,
                  }),
                });
              }
            }
          }
        } catch (err: any) {
          console.warn(`[TrainingModule] Local auto-discovery failed:`, err?.message ?? err);
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
          const dirs = await storageListDirectories(prefix);
          results.directories = dirs;
          for (const dirName of dirs) {
            const sp = `${prefix}/${dirName}`;
            const files: string[] = [];
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

      // 2. Check local directories
      const localCoursesPath = process.env.LOCAL_COURSES_PATH;
      if (localCoursesPath) {
        try {
          const entries = fs.readdirSync(localCoursesPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const dirPath = path.join(localCoursesPath, entry.name);
            const files: string[] = [];
            for (const file of ["story.html", "index.html", "course_thumbnail.webp", "course.webp", "course_link.txt"]) {
              if (fs.existsSync(path.join(dirPath, file))) files.push(file);
            }
            results.directoryDetails.push({ name: `[LOCAL] ${entry.name}`, files });
          }
        } catch (err: any) {
          results.errors.push(`Local list error: ${err?.message || String(err)}`);
        }
      }

      // 3. Check DB
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

      if (!process.env.S3_BUCKET_NAME) results.errors.push("S3_BUCKET_NAME not set");
      if (!process.env.S3_ACCESS_KEY_ID) results.errors.push("S3_ACCESS_KEY_ID not set");

      return results;
    }),

  uploadFromLocal: ultraAdminProcedure
    .input(z.object({
      localPath: z.string().min(1),
      courseName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;
      const resolvedPath = path.resolve(input.localPath);
      
      let stat: fs.Stats;
      try {
        stat = fs.statSync(resolvedPath);
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Path not found: ${resolvedPath}` });
      }
      if (!stat.isDirectory()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provided path is not a directory" });
      }

      const courseTitle = input.courseName || path.basename(resolvedPath);
      const sanitizedDirName = path.basename(resolvedPath).replace(/[^a-zA-Z0-9 _-]/g, "").trim();
      const storagePrefix = `courses/${sanitizedDirName}`;

      console.log(`[TrainingModule] uploadFromLocal: "${resolvedPath}" → s3://${process.env.S3_BUCKET_NAME}/${storagePrefix}/ (user=${user.id})`);

      const uploadedFiles: string[] = [];
      const errors: { file: string; error: string }[] = [];

      function walkDir(dir: string) {
        let entries: string[];
        try { entries = fs.readdirSync(dir); } catch { return; }
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          let entryStat: fs.Stats;
          try { entryStat = fs.statSync(fullPath); } catch { continue; }
          if (entryStat.isDirectory()) {
            walkDir(fullPath);
          } else if (entryStat.isFile()) {
            const relativePath = path.relative(resolvedPath, fullPath).replace(/\\/g, "/");
            if (!relativePath) continue;
            const s3Key = `${storagePrefix}/${relativePath}`;
            try {
              const content = fs.readFileSync(fullPath);
              const ext = path.extname(entry).toLowerCase();
              const mimeMap: Record<string, string> = {
                ".html": "text/html", ".htm": "text/html", ".js": "application/javascript",
                ".json": "application/json", ".css": "text/css", ".xml": "text/xml",
                ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
                ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
                ".wav": "audio/wav", ".woff": "font/woff", ".woff2": "font/woff2",
                ".ttf": "font/ttf", ".otf": "font/otf", ".eot": "application/vnd.ms-fontobject",
                ".ico": "image/x-icon", ".txt": "text/plain", ".pdf": "application/pdf",
                ".zip": "application/zip", ".swf": "application/x-shockwave-flash",
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

      return { success: true, courseTitle, storagePrefix, uploadedFiles: uploadedFiles.length, fileCount: uploadedFiles.length, errorCount: errors.length, errors: errors.length > 0 ? errors : undefined };
    }),

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

      // If launchPath starts with http/https, return directly
      if (mod.launchPath.startsWith("http://") || mod.launchPath.startsWith("https://")) {
        return { url: mod.launchPath };
      }

      // Handle bare domain URLs (e.g. "training.example.com" or "//training.example.com")
      // Must NOT match file paths like "story.html", "html5/lib/script.js", etc.
      if (mod.launchPath.startsWith("//") || (
        /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mod.launchPath) &&
        !mod.launchPath.includes("/") &&
        !/\.(html?|js|css|txt|xml|json|png|jpg|jpeg|gif|webp|svg)$/i.test(mod.launchPath)
      )) {
        return { url: mod.launchPath.startsWith("//") ? `https:${mod.launchPath}` : `https://${mod.launchPath}` };
      }

      // Helper to determine the correct protocol (http vs https)
      const getBaseUrl = () => {
        const host = (ctx.req as any)?.headers?.host;
        if (host) {
          const isHttps =
            ((ctx.req as any)?.headers?.["x-forwarded-proto"] === "https") ||
            process.env.APP_BASE_URL?.startsWith("https://") ||
            process.env.HTTPS === "true";
          return `${isHttps ? "https" : "http"}://${host}`;
        }
        return process.env.APP_BASE_URL || "http://localhost:3000";
      };

      // Handle local filesystem courses (storagePrefix starts with "local:")
      if (mod.storagePrefix && mod.storagePrefix.startsWith("local:")) {
        const dirName = mod.storagePrefix.replace(/^local:/, "");
        // Construct the URL path for the locally-served course
        return { url: `${getBaseUrl()}/courses/${encodeURIComponent(dirName)}/${mod.launchPath}` };
      }

      // Legacy Storyline modules: generate presigned S3 URL
      // If S3 is not configured, fall back to local filesystem for development
      if (!process.env.S3_BUCKET_NAME && process.env.LOCAL_COURSES_PATH) {
        // Extract directory name from storagePrefix (e.g. "courses/Active Threat Response" -> "Active Threat Response")
        const dirName = mod.storagePrefix
          ? mod.storagePrefix.replace(/^courses\//, "").replace(/^local:/, "")
          : mod.courseTitle;
        return { url: `${getBaseUrl()}/courses/${encodeURIComponent(dirName)}/${mod.launchPath}` };
      }
      const s3Key = mod.storagePrefix
        ? `${mod.storagePrefix}/${mod.launchPath}`
        : mod.launchPath;
      const { url } = await storageGet(s3Key);
      return { url };
    }),
});