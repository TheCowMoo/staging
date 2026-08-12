/**
 * Google Analytics 4 (gtag.js) — typed, PII-safe wrapper.
 *
 * The measurement ID can be overridden at build time via VITE_GA_MEASUREMENT_ID.
 * Every helper no-ops safely if gtag.js hasn't loaded yet (e.g. blocked by an
 * ad blocker or before the async script arrives).
 */

export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? "G-Y6YQT5T61F";

// ─── Global typings ────────────────────────────────────────────────────────────
export type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// ─── Core wrapper ─────────────────────────────────────────────────────────────
/** Push a command to the GA4 dataLayer. No-ops before gtag.js is loaded. */
export function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

// ─── PII scrubbing ────────────────────────────────────────────────────────────
/** Collapse whitespace and truncate — never send raw user content to GA. */
export function scrub(value: string | null | undefined, maxLength = 100): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
}

// ─── Page views ───────────────────────────────────────────────────────────────
/** Fire a page_view for SPA navigation. The snippet handles the initial load. */
export function trackPageView(path: string, title?: string): void {
  gtag("event", "page_view", {
    page_path: path,
    page_title: scrub(title),
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
  });
}

// ─── Custom events ────────────────────────────────────────────────────────────
export function trackEvent(eventName: string, params?: GtagParams): void {
  gtag("event", eventName, { ...(params ?? {}) });
}

// ─── Identity (non-PII only) ──────────────────────────────────────────────────
function hashUserId(userId: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      return subtle
        .digest("SHA-256", new TextEncoder().encode(`pp:${userId}`))
        .then(
          (buf) =>
            Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
        )
        .catch(() => `u-${userId}`);
    }
  } catch {
    // crypto unavailable — fall through to plain prefix
  }
  return Promise.resolve(`u-${userId}`);
}

/** Associate the session with a stable hashed (non-PII) user id. */
export async function setUserId(userId: number | string | null | undefined): Promise<void> {
  if (userId === null || userId === undefined) {
    gtag("config", GA_MEASUREMENT_ID, { user_id: undefined });
    return;
  }
  const hashed = await hashUserId(String(userId));
  gtag("config", GA_MEASUREMENT_ID, { user_id: hashed });
}

/** Set GA4 user properties. NEVER pass PII (name, email, address, facility names). */
export function setUserProperties(props: GtagParams): void {
  gtag("set", "user_properties", props);
}

// ─── Exceptions ───────────────────────────────────────────────────────────────
export function trackException(description: string, fatal = false): void {
  trackEvent("exception", { description: scrub(description, 200), fatal });
}
