/**
 * webhookRouter.ts — Webhook Endpoints
 *
 * POST /api/webhook/register           — Create a user account without a password (sends set-password email)
 * POST /api/webhook/plan               — Upgrade or downgrade an organization's plan
 * POST /api/webhook/create-ultra-admin — Create or promote a user to ultra_admin role
 *
 * Security: All endpoints require the `x-webhook-secret` header matching the
 * WEBHOOK_SECRET environment variable. Keep this secret out of client-side code.
 *
 * ─── Webhook Register ────────────────────────────────────────────────────────
 * Request body (JSON):
 *   { "name": "John Doe", "email": "john@example.com" }
 *
 * Response 201 JSON: { "ok": true, "message": "...", "userId": 123 }
 * Response 409 JSON: { "error": "..." }   — email already exists
 *
 * ─── Plan Upgrade/Downgrade ──────────────────────────────────────────────────
 * Request body (JSON):
 *   { "action": "upgrade" | "downgrade", "orgId": 123 }
 *
 * Response 200 JSON: { "ok": true, "plan": "paid" | "free" }
 * Response 400 JSON: { "error": "..." }   — bad request
 * Response 401 JSON: { "error": "..." }   — missing / wrong secret
 * Response 500 JSON: { "error": "..." }   — server error
 *
 * ─── Create Ultra Admin ──────────────────────────────────────────────────────
 * Request body (JSON):
 *   { "name": "Jane Doe", "email": "jane@example.com" }
 *
 * Response 201 JSON: { "ok": true, "message": "...", "userId": 123, "created": true }
 * Response 200 JSON: { "ok": true, "message": "...", "userId": 123, "created": false }  — existing user promoted
 * Response 400 JSON: { "error": "..." }   — missing name/email
 * Response 401 JSON: { "error": "..." }   — missing / wrong secret
 * Response 500 JSON: { "error": "..." }   — server error
 *
 * Example cURL (register):
 *   curl -X POST https://staging.fivestonestechnology.com/api/webhook/register \
 *     -H "Content-Type: application/json" \
 *     -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
 *     -d '{"name":"John Doe","email":"john@example.com"}'
 *
 * Example cURL (plan):
 *   curl -X POST https://staging.fivestonestechnology.com/api/webhook/plan \
 *     -H "Content-Type: application/json" \
 *     -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
 *     -d '{"action":"upgrade","orgId":1}'
 *
 * Example cURL (create-ultra-admin):
 *   curl -X POST https://staging.fivestonestechnology.com/api/webhook/create-ultra-admin \
 *     -H "Content-Type: application/json" \
 *     -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
 *     -d '{"name":"Jane Doe","email":"jane@example.com"}'
 */

import { Router } from "express";
import { randomBytes, createHash } from "crypto";
import { updateOrgPlan, getUserByEmail, upsertUser, setPasswordResetToken, setGhlContactId, updateUserRole } from "../db";
import { createGhlContact, sendGhlEmail } from "./ghl";
import { ENV } from "./env";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function welcomeSetPasswordEmailHtml(name: string, setPasswordUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Set Your Password</title></head>
<body style="font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1a3a5c; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Liability Defense System</h1>
      <p style="color: #a8c4e0; margin: 8px 0 0; font-size: 13px;">Five Stones Technology</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1a3a5c; margin: 0 0 16px;">Welcome, ${name}!</h2>
      <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px;">
        Your account has been created on the <strong>Liability Defense System</strong>. To get started, please set your password by clicking the button below.
      </p>
      <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px;">
        This link will expire in <strong>48 hours</strong>. If it expires, use the "Forgot Password" option on the login page.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${setPasswordUrl}" style="background: #1a3a5c; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Set My Password
        </a>
      </div>
      <p style="color: #718096; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
        If you were not expecting this email, you can safely ignore it. No action is required.
      </p>
    </div>
    <div style="background: #f4f6f9; padding: 20px 40px; text-align: center;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Five Stones Technology. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export const webhookRouter = Router();

// ── Webhook User Registration ─────────────────────────────────────────────────
// POST /api/webhook/register
// Creates a user account without a password and sends a "Set Your Password" email.
webhookRouter.post("/api/webhook/register", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "Webhook endpoint is not configured on this server." });
  }
  const providedSecret = req.headers["x-webhook-secret"];
  if (!providedSecret || providedSecret !== secret) {
    console.warn("[webhook/register] Unauthorized attempt from", req.ip);
    return res.status(401).json({ error: "Unauthorized: invalid or missing x-webhook-secret header." });
  }

  const { name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "'name' and 'email' are required." });
  }

  const normalizedEmail = (email as string).toLowerCase().trim();
  const normalizedName = (name as string).trim();

  try {
    // Check if user already exists
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists.",
        userId: existing.id,
      });
    }

    // Create account with a random unusable temporary password
    // The user must set their own password via the emailed link
    const openId = randomBytes(16).toString("hex");
    const tempSalt = randomBytes(16).toString("hex");
    const tempHash = createHash("sha256")
      .update(tempSalt + randomBytes(32).toString("hex"))
      .digest("hex");

    await upsertUser({
      openId,
      name: normalizedName,
      email: normalizedEmail,
      loginMethod: "email",
      lastSignedIn: new Date(),
      passwordHash: tempHash,
      passwordSalt: tempSalt,
    });

    const newUser = await getUserByEmail(normalizedEmail);
    if (!newUser) throw new Error("User creation failed — could not retrieve newly created user.");

    // Generate a password-reset token (48-hour expiry) used as the set-password link
    const setPasswordToken = generateToken();
    await setPasswordResetToken(normalizedEmail, setPasswordToken);

    const setPasswordUrl = `${ENV.appBaseUrl}/set-password?token=${setPasswordToken}`;

    // Fire-and-forget: GHL contact creation + welcome email
    (async () => {
      try {
        const ghlContactId = await createGhlContact({
          email: normalizedEmail,
          name: normalizedName,
          source: "Webhook Registration",
        });
        if (ghlContactId) {
          await setGhlContactId(newUser.id, ghlContactId);
        }
        await sendGhlEmail({
          toEmail: normalizedEmail,
          toName: normalizedName,
          subject: "Welcome — Set Your Password for the Liability Defense System",
          html: welcomeSetPasswordEmailHtml(normalizedName, setPasswordUrl),
          ghlContactId: ghlContactId ?? null,
        });
        console.log(`[webhook/register] Welcome email sent to ${normalizedEmail}`);
      } catch (err) {
        console.error("[webhook/register] Post-creation tasks failed:", err);
      }
    })();

    return res.status(201).json({
      ok: true,
      message: `Account created. A set-password email has been sent to ${normalizedEmail}.`,
      userId: newUser.id,
    });
  } catch (err: any) {
    console.error("[webhook/register] Failed:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to create user account." });
  }
});

// ── Create Ultra Admin ────────────────────────────────────────────────────────
// POST /api/webhook/create-ultra-admin
// Creates a new user with ultra_admin role, or promotes an existing user.
// Sends a set-password email for newly created accounts.
webhookRouter.post("/api/webhook/create-ultra-admin", async (req, res) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "Webhook endpoint is not configured on this server." });
  }
  const providedSecret = req.headers["x-webhook-secret"];
  if (!providedSecret || providedSecret !== secret) {
    console.warn("[webhook/create-ultra-admin] Unauthorized attempt from", req.ip);
    return res.status(401).json({ error: "Unauthorized: invalid or missing x-webhook-secret header." });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  const { name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: "'name' and 'email' are required." });
  }

  const normalizedEmail = (email as string).toLowerCase().trim();
  const normalizedName = (name as string).trim();

  try {
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      // Promote existing user to ultra_admin
      await updateUserRole(existing.id, "ultra_admin");
      console.log(`[webhook/create-ultra-admin] Promoted existing user ${normalizedEmail} (id=${existing.id}) to ultra_admin`);
      return res.status(200).json({
        ok: true,
        message: `Existing user promoted to ultra_admin.`,
        userId: existing.id,
        created: false,
      });
    }

    // Create new account with a random unusable temporary password
    const openId = randomBytes(16).toString("hex");
    const tempSalt = randomBytes(16).toString("hex");
    const tempHash = createHash("sha256")
      .update(tempSalt + randomBytes(32).toString("hex"))
      .digest("hex");

    await upsertUser({
      openId,
      name: normalizedName,
      email: normalizedEmail,
      loginMethod: "email",
      lastSignedIn: new Date(),
      passwordHash: tempHash,
      passwordSalt: tempSalt,
    });

    const newUser = await getUserByEmail(normalizedEmail);
    if (!newUser) throw new Error("User creation failed — could not retrieve newly created user.");

    // Set ultra_admin role immediately
    await updateUserRole(newUser.id, "ultra_admin");

    // Generate a set-password token (48-hour expiry)
    const setPasswordToken = generateToken();
    await setPasswordResetToken(normalizedEmail, setPasswordToken);
    const setPasswordUrl = `${ENV.appBaseUrl}/set-password?token=${setPasswordToken}`;

    // Fire-and-forget: GHL contact + welcome email
    (async () => {
      try {
        const ghlContactId = await createGhlContact({
          email: normalizedEmail,
          name: normalizedName,
          source: "Webhook Ultra Admin",
        });
        if (ghlContactId) await setGhlContactId(newUser.id, ghlContactId);
        await sendGhlEmail({
          toEmail: normalizedEmail,
          toName: normalizedName,
          subject: "Admin Account Created — Set Your Password",
          html: welcomeSetPasswordEmailHtml(normalizedName, setPasswordUrl),
          ghlContactId: ghlContactId ?? null,
        });
        console.log(`[webhook/create-ultra-admin] Welcome email sent to ${normalizedEmail}`);
      } catch (err) {
        console.error("[webhook/create-ultra-admin] Post-creation tasks failed:", err);
      }
    })();

    return res.status(201).json({
      ok: true,
      message: `Ultra admin account created. A set-password email has been sent to ${normalizedEmail}.`,
      userId: newUser.id,
      created: true,
    });
  } catch (err: any) {
    console.error("[webhook/create-ultra-admin] Failed:", err?.message ?? err);
    return res.status(500).json({ error: "Failed to create ultra admin account." });
  }
});

// ── Plan Upgrade/Downgrade ────────────────────────────────────────────────────
webhookRouter.post("/api/webhook/plan", async (req, res) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] WEBHOOK_SECRET env var is not set — endpoint disabled");
    return res.status(503).json({ error: "Webhook endpoint is not configured on this server." });
  }

  const providedSecret = req.headers["x-webhook-secret"];
  if (!providedSecret || providedSecret !== secret) {
    console.warn("[webhook] Unauthorized plan webhook attempt from", req.ip);
    return res.status(401).json({ error: "Unauthorized: invalid or missing x-webhook-secret header." });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  const { action, orgId, externalSubscriptionId } = req.body ?? {};

  if (!action || !["upgrade", "downgrade"].includes(action)) {
    return res.status(400).json({ error: "Invalid 'action'. Must be 'upgrade' or 'downgrade'." });
  }

  const hasOrgId = typeof orgId === "number" && Number.isInteger(orgId) && orgId > 0;
  const hasSubId = typeof externalSubscriptionId === "string" && externalSubscriptionId.trim().length > 0;

  if (!hasOrgId && !hasSubId) {
    return res.status(400).json({
      error: "Must provide either 'orgId' (integer) or 'externalSubscriptionId' (string) to identify the organization.",
    });
  }

  const newPlan: "free" | "paid" = action === "upgrade" ? "paid" : "free";

  // ── Update DB ───────────────────────────────────────────────────────────────
  try {
    const identifier = hasOrgId
      ? { orgId: orgId as number }
      : { externalSubscriptionId: (externalSubscriptionId as string).trim() };

    await updateOrgPlan(
      identifier,
      newPlan,
      hasSubId ? (externalSubscriptionId as string).trim() : undefined,
    );

    console.log(
      `[webhook] Plan ${action}d → ${newPlan} for`,
      hasOrgId ? `orgId=${orgId}` : `externalSubscriptionId=${externalSubscriptionId}`,
    );

    return res.status(200).json({ ok: true, plan: newPlan });
  } catch (err: any) {
    console.error("[webhook] Failed to update org plan:", err?.message ?? err);
    return res.status(500).json({ error: "Internal server error while updating plan." });
  }
});
