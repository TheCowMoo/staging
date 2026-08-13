/**
 * reCAPTCHA v3 client — loads the invisible badge and executes per-action tokens.
 *
 * The site key is public and read from VITE_RECAPTCHA_SITE_KEY (with a fallback).
 * When no site key is configured (e.g. local development), executeRecaptcha
 * resolves to an empty string and the server-side skip logic keeps things working.
 */

export const RECAPTCHA_SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ??
  "6LdPsYItAAAAAIdBDr7kAa4tW5pYAXOkPufLpjZA";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (typeof document === "undefined") {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }
  if (document.querySelector('script[src*="recaptcha/api.js"]')) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // never block the form on script failure
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Execute reCAPTCHA v3 for a given action and return the one-time token.
 * Returns "" when reCAPTCHA is unavailable (script blocked, no site key).
 */
export async function executeRecaptcha(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return "";
  await loadRecaptchaScript();
  return new Promise((resolve) => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha || typeof grecaptcha.execute !== "function") {
      resolve("");
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action })
        .then((token) => resolve(token ?? ""))
        .catch(() => resolve(""));
    });
  });
}
