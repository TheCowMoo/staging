import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { getFlaggedVisitorById, setFlaggedVisitorPhoto } from "./db";
import { sdk } from "./_core/sdk";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const flaggedVisitorUploadRouter = Router();

/**
 * POST /api/upload/flagged-visitor-photo
 * Form fields: file (binary), id (flagged visitor id)
 */
flaggedVisitorUploadRouter.post(
  "/api/upload/flagged-visitor-photo",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch {}
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (!req.file) return res.status(400).json({ error: "No file provided" });

      const id = parseInt(req.body.id);
      if (!id) return res.status(400).json({ error: "flagged visitor id required" });

      const entry = await getFlaggedVisitorById(id);
      if (!entry) return res.status(404).json({ error: "Flagged entry not found" });

      const isPlatformAdmin = (["admin","ultra_admin"] as string[]).includes(user.role);
      if (!isPlatformAdmin && entry.addedByUserId !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const ext = req.file.originalname.split(".").pop() || "jpg";
      const rand = Math.random().toString(36).slice(2, 10);
      const fileKey = `flagged-photos/${entry.facilityId || "org"}/${id}/${Date.now()}-${rand}.${ext}`;

      const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

      await setFlaggedVisitorPhoto(id, fileKey, url);

      res.json({ success: true, url, fileKey });
    } catch (err: any) {
      console.error('[FlaggedVisitorUpload] Error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }
);
