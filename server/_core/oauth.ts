/**
 * Auth routes — Standard email/password login (no external OAuth provider)
 *
 * POST /api/auth/login             — email + password → sets session cookie
 * POST /api/auth/register          — email + password + name → creates account + session
 * GET  /api/auth/verify-email      — ?token=... → marks email as verified
 * POST /api/auth/forgot-password   — email → sends reset link via GHL
 * POST /api/auth/reset-password    — token + newPassword → updates password
 * GET  /api/oauth/callback         — kept as no-op redirect for backward compat
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { createHash, randomBytes } from "crypto";
import { createGhlContact, sendGhlEmail } from "./ghl";
import { ENV } from "./env";

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(salt + password).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function verificationEmailHtml(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify Your Email</title></head>
<body style="font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1a3a5c; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Liability Defense System</h1>
      <p style="color: #a8c4e0; margin: 8px 0 0; font-size: 13px;">Five Stones Technology</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1a3a5c; margin: 0 0 16px;">Welcome, ${name}!</h2>
      <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px;">
        Thank you for registering with the Liability Defense System. Please verify your email address to activate your account.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="background: #1a3a5c; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Verify My Email
        </a>
      </div>
      <p style="color: #718096; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
        If you did not create this account, you can safely ignore this email.
      </p>
    </div>
    <div style="background: #f4f6f9; padding: 20px 40px; text-align: center;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Five Stones Technology. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Your Password</title></head>
<body style="font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1a3a5c; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Liability Defense System</h1>
      <p style="color: #a8c4e0; margin: 8px 0 0; font-size: 13px;">Five Stones Technology</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #1a3a5c; margin: 0 0 16px;">Password Reset Request</h2>
      <p style="color: #4a5568; line-height: 1.6; margin: 0 0 24px;">
        Hi ${name}, we received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: #c53030; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color: #718096; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background: #f4f6f9; padding: 20px 40px; text-align: center;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Five Stones Technology. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function registerOAuthRoutes(app: Express) {
  // Standard login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    try {
      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.passwordHash || !user.passwordSalt) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const hash = hashPassword(password, user.passwordSalt);
      if (hash !== user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, user: { openId: user.openId, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Standard registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body ?? {};
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }
    try {
      const existing = await db.getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(password, salt);
      const openId = randomBytes(16).toString("hex");
      await db.upsertUser({
        openId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        loginMethod: "email",
        lastSignedIn: new Date(),
        passwordHash: hash,
        passwordSalt: salt,
      });

      // Fetch the newly created user to get their DB id
      const newUser = await db.getUserByEmail(email.toLowerCase().trim());

      // Fire-and-forget: GHL contact creation + verification email
      if (newUser) {
        (async () => {
          try {
            // 1. Create GHL contact
            const ghlContactId = await createGhlContact({
              email: email.toLowerCase().trim(),
              name: name.trim(),
              source: "Liability Defense System",
            });
            if (ghlContactId) {
              await db.setGhlContactId(newUser.id, ghlContactId);
            }
            // 2. Generate email verification token
            const verifyToken = generateToken();
            await db.setEmailVerifyToken(newUser.id, verifyToken);
            // 3. Send verification email via GHL
            const verifyUrl = `${ENV.appBaseUrl}/verify-email?token=${verifyToken}`;
            await sendGhlEmail({
              toEmail: email.toLowerCase().trim(),
              toName: name.trim(),
              subject: "Verify your Liability Defense System account",
              html: verificationEmailHtml(name.trim(), verifyUrl),
              ghlContactId,
            });
          } catch (err) {
            console.error("[Auth] Post-registration GHL tasks failed:", err);
          }
        })();
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name.trim(),
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.status(201).json({ ok: true, user: { openId, name: name.trim(), email: email.toLowerCase().trim() } });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ─── Email verification ──────────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.redirect(302, "/?verified=invalid");
      return;
    }
    try {
      const user = await db.verifyEmailToken(token);
      if (!user) {
        res.redirect(302, "/?verified=invalid");
        return;
      }
      res.redirect(302, "/?verified=true");
    } catch (err) {
      console.error("[Auth] Email verification failed", err);
      res.redirect(302, "/?verified=error");
    }
  });

  // ─── Forgot password ─────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    // Always return 200 to prevent email enumeration
    res.json({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
    // Fire-and-forget
    (async () => {
      try {
        const user = await db.getUserByEmail(email.toLowerCase().trim());
        if (!user) return;
        const resetToken = generateToken();
        const saved = await db.setPasswordResetToken(email.toLowerCase().trim(), resetToken);
        if (!saved) return;
        const resetUrl = `${ENV.appBaseUrl}/reset-password?token=${resetToken}`;
        await sendGhlEmail({
          toEmail: email.toLowerCase().trim(),
          toName: user.name ?? "User",
          subject: "Reset your Liability Defense System password",
          html: passwordResetEmailHtml(user.name ?? "User", resetUrl),
          ghlContactId: user.ghlContactId ?? null,
        });
      } catch (err) {
        console.error("[Auth] Forgot-password email failed:", err);
      }
    })();
  });

  // ─── Reset password ──────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      res.status(400).json({ error: "token and newPassword are required" });
      return;
    }
    if ((newPassword as string).length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    try {
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(newPassword, salt);
      const ok = await db.resetPasswordWithToken(token, hash, salt);
      if (!ok) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
      }
      res.json({ ok: true, message: "Password updated successfully. You can now log in." });
    } catch (err) {
      console.error("[Auth] Reset-password failed:", err);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // Backward-compat stub — redirects home
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
