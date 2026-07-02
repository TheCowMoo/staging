/**
 * rasDesktopApi.ts — REST API endpoints for the RAS Desktop Alert (Windows .NET app)
 *
 * These endpoints are used by the desktop polling loop and the auto-updater.
 * They are NOT part of tRPC — they are raw Express routes authenticated via X-Api-Key.
 *
 * Endpoints:
 *   GET  /api/ras/alerts/active   — Poll: returns current active alert for an org (or 204)
 *   POST /api/ras/acknowledge     — Desktop user acknowledges/dismisses an alert
 *   GET  /api/ras/update/version.json — Public version manifest for auto-updater
 */
import { Router } from "express";
import { requireApiKey } from "./_core/apiKeyAuth";
import { getDb } from "./db";

export const rasDesktopApi = Router();

// ─── GET /api/ras/alerts/active?orgId=X ──────────────────────────────────────
// Used by the desktop tray app to poll for active alerts every 5 seconds.
// Returns the most recent non-resolved alert for the given org.
// When no alert is active, returns 204 No Content (the desktop treats this as "resolved").
rasDesktopApi.get("/api/ras/alerts/active", requireApiKey, async (req, res) => {
  try {
    const orgId = parseInt(req.query.orgId as string, 10);
    if (!orgId || isNaN(orgId)) {
      return res.status(400).json({ error: "Missing or invalid orgId query parameter" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Verify the authenticated user belongs to this org (multi-tenant scoping)
    const authReq = req as any;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const membershipRows = await db.execute(
      `SELECT id FROM org_members WHERE userId = ${userId} AND orgId = ${orgId} LIMIT 1`
    ) as unknown as Array<{ id: number }>;
    if (!membershipRows.length) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }

    // Query the most recent non-resolved alert for this org
    const alertRows = await db.execute(
      `SELECT ae.id, ae.alertType, ae.alertStatus, ae.messageTitle, ae.messageBody, ae.roleInstructions, ae.createdAt, u.name AS activatedByName
       FROM alert_events ae
       LEFT JOIN users u ON u.id = ae.createdByUserId
       WHERE ae.orgId = ${orgId} AND ae.alertStatus != 'resolved'
       ORDER BY ae.createdAt DESC
       LIMIT 1`
    ) as unknown as Array<Record<string, unknown>>;

    if (!alertRows.length) {
      // No active alert — tell desktop to standby
      return res.status(204).send();
    }

    const alert = alertRows[0];

    // Parse roleInstructions so the desktop can display role-specific guidance
    let roleInstructions: Record<string, string> = {};
    try {
      const raw = alert.roleInstructions;
      roleInstructions = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, string>) ?? {};
    } catch { /* ignore parse errors */ }

    // ── Response shape the desktop RasAlert class expects ──
    //   RasAlert { type: string; message: string; status: string }
    return res.json({
      id: alert.id,
      type: alert.alertType as string,
      alertType: alert.alertType as string,
      message: alert.messageBody as string || alert.messageTitle as string || "",
      messageTitle: alert.messageTitle as string || "",
      messageBody: alert.messageBody as string || "",
      status: alert.alertStatus as string,
      roleInstructions,
      createdAt: alert.createdAt,
      activatedByName: alert.activatedByName as string || "Unknown",
    });
  } catch (error: any) {
    console.error("[RAS/DesktopApi] GET /alerts/active error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/ras/acknowledge ──────────────────────────────────────────────
// Called by the desktop app when the user clicks "ACKNOWLEDGE & DISMISS".
// Updates the alert_recipients record for this user.
rasDesktopApi.post("/api/ras/acknowledge", requireApiKey, async (req, res) => {
  try {
    const { alertEventId } = req.body;
    if (!alertEventId || typeof alertEventId !== "number") {
      return res.status(400).json({ error: "Missing or invalid alertEventId" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const authReq = req as any;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify alert exists
    const alertRows = await db.execute(
      `SELECT id FROM alert_events WHERE id = ${alertEventId} LIMIT 1`
    ) as unknown as Array<{ id: number }>;
    if (!alertRows.length) {
      return res.status(404).json({ error: "Alert not found" });
    }

    // Mark acknowledgment — only if not already acknowledged
    await db.execute(
      `UPDATE alert_recipients SET acknowledgedAt = NOW()
       WHERE alertEventId = ${alertEventId} AND userId = ${userId} AND acknowledgedAt IS NULL`
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[RAS/DesktopApi] POST /acknowledge error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/ras/update/version.json ────────────────────────────────────────
// Public endpoint — no API key required.
// The desktop auto-updater checks this every 6 hours.
rasDesktopApi.get("/api/ras/update/version.json", async (_req, res) => {
  try {
    // Default version info — when a newer build is pushed to S3, update this.
    // The desktop installer is built via scripts/build-org-installer.mjs and
    // uploaded to S3. This manifest tells the desktop to download and install it.
    const currentVersion = "1.1.0";
    const baseUrl = process.env.APP_URL || "https://staging.fivestonestechnology.com";

    // The download URL can point to a public S3 bucket or a server-hosted file.
    const downloadUrl = process.env.RAS_INSTALLER_URL ||
      `${baseUrl}/api/ras/installer/FiveStonesRASAlert.exe`;

    return res.json({
      version: currentVersion,
      downloadUrl,
      releaseDate: "2026-07-01",
      minVersion: "1.0.0",
      changelog: "Improved alert dismissal acknowledgment, stability improvements.",
    });
  } catch (error: any) {
    console.error("[RAS/DesktopApi] GET /update/version.json error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});