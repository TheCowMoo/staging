import { Router, Request, Response } from "express";
import multer from "multer";
import { Open } from "unzipper";
import { nanoid } from "nanoid";
import path from "path";
import { requireApiKey, ApiKeyAuthenticatedRequest } from "./_core/apiKeyAuth";
import { storagePut, storagePublicUrl } from "./storage";
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

function detectContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".xml":
      return "application/xml";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".mp4":
      return "video/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    default:
      return "application/octet-stream";
  }
}

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractTitleFromMetaXml(xml: string): string | null {
  const match = xml.match(/<name>([\s\S]*?)<\/name>/i);
  return match ? match[1].trim() : null;
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

      const archiveName = req.file.originalname || "storyline-package.zip";
      const moduleTitleOverride = typeof req.body.courseTitle === "string" ? req.body.courseTitle.trim() : undefined;
      const orgId = req.body.orgId ? parseInt(req.body.orgId, 10) : undefined;

      const zipArchive = await Open.buffer(req.file.buffer);
      const fileEntries = zipArchive.files.filter((entry: any) => entry.type !== "Directory");
      const normalizedPaths = fileEntries.map((entry: any) => normalizeArchivePath(entry.path));

      if (normalizedPaths.some((entry: string) => entry.includes(".."))) {
        return res.status(400).json({ error: "Archive contains invalid path segments" });
      }

      const storyEntry = zipArchive.files.find((entry: any) => normalizeArchivePath(entry.path) === "story.html");
      if (!storyEntry) {
        return res.status(400).json({ error: "Storyline package must contain a root-level story.html file" });
      }

      const contentRootFound = zipArchive.files.some((entry: any) => {
        const normalized = normalizeArchivePath(entry.path);
        const segment = normalized.split("/")[0];
        return ["story_content", "story_html5", "html5"].includes(segment);
      });
      if (!contentRootFound) {
        return res.status(400).json({ error: "Storyline package must include a root content folder such as story_content or story_html5" });
      }

      const storyHtmlBuffer = await storyEntry.buffer();
      const storyHtml = storyHtmlBuffer.toString("utf-8");
      const storyTitle = extractTitleFromHtml(storyHtml);

      let packageTitle = storyTitle;
      if (!packageTitle) {
        const metaEntry = zipArchive.files.find((entry: any) => /(^|\/)meta\.xml$/i.test(normalizeArchivePath(entry.path)));
        if (metaEntry) {
          const metaXml = (await metaEntry.buffer()).toString("utf-8");
          packageTitle = extractTitleFromMetaXml(metaXml);
        }
      }

      if (!packageTitle) {
        packageTitle = moduleTitleOverride || path.parse(archiveName).name || "Articulate Storyline Course";
      }

      const storagePrefix = `training-modules/${orgId || "global"}/${nanoid(10)}`;
      for (const entry of zipArchive.files) {
        if (entry.type === "Directory") continue;
        const relativePath = normalizeArchivePath(entry.path);
        if (!relativePath) continue;

        const buffer = await entry.buffer();
        const contentType = detectContentType(relativePath);
        await storagePut(`${storagePrefix}/${relativePath}`, buffer, contentType);
      }

      const launchPath = storagePublicUrl(`${storagePrefix}/story.html`);
      const moduleId = await createTrainingModule({
        orgId: orgId || undefined,
        createdByUserId: user.id,
        courseTitle: moduleTitleOverride || packageTitle,
        launchPath,
        playerType: "Articulate_Storyline_Web",
        trackingType: "None",
        storagePrefix,
        sourceFileName: archiveName,
        metaJson: JSON.stringify({ uploadedAt: new Date().toISOString(), rootFolders: Array.from(new Set(normalizedPaths.map((p: string) => p.split("/")[0]))) }),
      });

      return res.json({
        success: true,
        moduleId,
        courseTitle: moduleTitleOverride || packageTitle,
        launchPath,
        storagePrefix,
      });
    } catch (error: any) {
      console.error("[TrainingModuleUpload] Error:", error);
      return res.status(500).json({ error: error?.message || "Failed to ingest Storyline package" });
    }
  }
);
