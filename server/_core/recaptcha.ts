/**
 * reCAPTCHA v3 — server-side verification via the Google SiteVerify API.
 *
 * Requires RECAPTCHA_SECRET_KEY to be configured. When the secret is missing
 * (e.g. local development), verification is skipped with a warning so the app
 * still works without breaking development workflows.
 */
import { ENV } from "./env";

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export interface RecaptchaVerificationResult {
  success: boolean;
  skipped: boolean;
  score?: number;
  reason?: string;
}

export async function verifyRecaptcha(
  token: string | null | undefined,
  remoteIp?: string,
  expectedAction?: string
): Promise<RecaptchaVerificationResult> {
  if (!token) {
    return { success: false, skipped: false, reason: "missing_token" };
  }

  const secret = ENV.recaptchaSecretKey;
  if (!secret) {
    // F-16: fail closed in production — bot protection must not silently turn off.
    if (ENV.isProduction) {
      console.error("[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured in production — blocking request");
      return { success: false, skipped: false, reason: "recaptcha_not_configured" };
    }
    console.warn("[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured — skipping verification (dev only)");
    return { success: true, skipped: true };
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp) params.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      return { success: false, skipped: false, reason: `siteverify_http_${res.status}` };
    }

    const data = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return {
        success: false,
        skipped: false,
        reason: `rejected:${(data["error-codes"] ?? []).join(",") || "unknown"}`,
      };
    }

    // Score gate (v3): reject low-confidence traffic.
    const threshold = ENV.recaptchaScoreThreshold;
    if (typeof data.score === "number" && data.score < threshold) {
      return { success: false, skipped: false, score: data.score, reason: "score_too_low" };
    }

    // Action gate: the token must match the action it was issued for.
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { success: false, skipped: false, score: data.score, reason: "action_mismatch" };
    }

    return { success: true, skipped: false, score: data.score };
  } catch (err) {
    console.error("[reCAPTCHA] Verification failed:", err);
    return { success: false, skipped: false, reason: "network_error" };
  }
}
