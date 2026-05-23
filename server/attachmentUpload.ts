/**
 * Multipart file upload handler for facility attachments.
 * POST /api/upload/attachment
 * Form fields: file (binary), auditId (number), facilityId (number), category (string), caption (string)
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { createFacilityAttachment } from "./db";
import { sdk } from "./_core/sdk";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

export const attachmentRouter = Router();

attachmentRouter.post(
  "/api/upload/attachment",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // Verify session
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch {}
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const auditId = parseInt(req.body.auditId);
      const facilityId = parseInt(req.body.facilityId);
      const category = req.body.category || "other";
      const caption = req.body.caption || "";

      if (!auditId || !facilityId) {
        res.status(400).json({ error: "auditId and facilityId are required" });
        return;
      }

      // Generate a unique file key
      const ext = req.file.originalname.split(".").pop() || "bin";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const fileKey = `attachments/${facilityId}/${auditId}/${Date.now()}-${randomSuffix}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

      // Save to database
      await createFacilityAttachment({
        auditId,
        facilityId,
        uploadedBy: user.id,
        url,
        fileKey,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        category: category as any,
        caption: caption || null,
      });

      res.json({ success: true, url, fileKey, filename: req.file.originalname });
    } catch (err: any) {
      console.error("[AttachmentUpload] Error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);
