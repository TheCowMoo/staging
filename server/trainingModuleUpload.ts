import { Router, Request, Response } from "express";
import multer from "multer";
import { Open } from "unzipper";
import { nanoid } from "nanoid";
import path from "path";
import { requireApiKey, ApiKeyAuthenticatedRequest } from "./_core/apiKeyAuth";
import { storagePut } from "./storage";
import { createTrainingModule } from "./db";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
export const trainingModuleUploadRouter = Router();

function normalizeArchivePath(entryPath: string): string {
  return entryPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .trim();
}

trainingModuleUploadRouter.post(
  "/api/upload/training-module",
  requireApiKey,
  upload.single("package"),
  async (req: ApiKeyAuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allowedRoles = ["ultra_admin", "super_admin", "admin"];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No package file uploaded" });
      }

      const archiveName = req.file.originalname || "training-package.zip";
      const courseTitleOverride = typeof req.body.courseTitle === "string" ? req.body.courseTitle.trim() : undefined;
      const orgId = req.body.orgId ? parseInt(req.body.orgId, 10) : undefined;

      const zipArchive = await Open.buffer(req.file.buffer);
      const fileEntries = zipArchive.files.filter((entry: any) => entry.type !== "Directory");
      const normalizedPaths = fileEntries.map((entry: any) => normalizeArchivePath(entry.path));

      if (normalizedPaths.some((entry: string) => entry.includes(".."))) {
        return res.status(400).json({ error: "Archive contains invalid path segments" });
      }

      // ✅ NEW FORMAT: Look for course_link.txt and course.webp
      const linkEntry = zipArchive.files.find(
        (entry: any) => normalizeArchivePath(entry.path) === "course_link.txt"
      );
      const thumbEntry = zipArchive.files.find(
        (entry: any) => normalizeArchivePath(entry.path) === "course.webp"
      );

      if (!linkEntry) {
        return res.status(400).json({
          error: "Training package must contain a course_link.txt file with the course URL",
        });
      }

      const linkContent = (await linkEntry.buffer()).toString("utf-8").trim();
      if (!linkContent) {
        return res.status(400).json({ error: "course_link.txt is empty" });
      }

      // Derive course title from the archive name or override
      const courseTitle = courseTitleOverride || path.parse(archiveName).name || "Training Course";

      const storagePrefix = `training-modules/${orgId || "global"}/${nanoid(10)}`;

      // Upload course_link.txt
      await storagePut(`${storagePrefix}/course_link.txt`, linkContent, "text/plain");

      // Upload course.webp if present
      let thumbnailKey: string | null = null;
      if (thumbEntry) {
        const thumbBuffer = await thumbEntry.buffer();
        await storagePut(`${storagePrefix}/course.webp`, thumbBuffer, "image/webp");
        thumbnailKey = `${storagePrefix}/course.webp`;
      }

      // launchPath stores the URL read from course_link.txt
      const launchPath = linkContent;
      const moduleId = await createTrainingModule({
        orgId: orgId || (null as any),
        createdByUserId: user.id,
        courseTitle,
        launchPath,
        thumbnailUrl: thumbnailKey,
        playerType: "external_link" as any,
        trackingType: "None",
        storagePrefix,
        sourceFileName: archiveName,
        metaJson: JSON.stringify({
          uploadedAt: new Date().toISOString(),
          format: "external_link",
        }),
      });

      return res.json({
        success: true,
        moduleId,
        courseTitle,
        launchPath,
        thumbnailUrl: thumbnailKey,
        storagePrefix,
      });
    } catch (error: any) {
      console.error("[TrainingModuleUpload] Error:", error);
      return res.status(500).json({ error: error?.message || "Failed to ingest training package" });
    }
  }
);