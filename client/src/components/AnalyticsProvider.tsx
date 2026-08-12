import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  scrub,
  setUserId,
  setUserProperties,
  trackEvent,
  trackException,
  trackPageView,
} from "@/lib/analytics";

function isExternalUrl(href: string): boolean {
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isFileDownload(href: string): boolean {
  return /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|gif|svg|webp|mp4|webm|mp3|wav|csv|json)$/i.test(
    href
  );
}

/**
 * Always-on GA4 tracking: page views, hashed user identity, and global
 * interaction/error capture. Renders nothing.
 *
 * Mounted once in App.tsx inside the ErrorBoundary so it survives every route.
 */
export default function AnalyticsProvider() {
  const [location] = useLocation(); // wouter path string, e.g. "/facilities/123"
  const { user, isAuthenticated } = useAuth();
  const planQuery = trpc.auth.myPlan.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  // ── Page views on SPA navigation (initial load is handled by the gtag snippet) ──
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    trackPageView(location, document.title);
  }, [location]);

  // ── User identity + properties (non-PII only) ──
  useEffect(() => {
    if (!isAuthenticated || !user) {
      void setUserId(null);
      return;
    }
    void setUserId(user.id);
    setUserProperties({
      role: user.role ?? "unknown",
      plan: planQuery.data ?? "unknown",
      is_impersonated: (user as { _isImpersonated?: boolean })._isImpersonated ? "true" : "false",
    });
  }, [isAuthenticated, user, planQuery.data]);

  // ── Global interaction + error capture (installed once) ──
  useEffect(() => {
    if (typeof document === "undefined") return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;

      const el = target.closest<HTMLElement>(
        "a, button, [role='button'], input[type='submit'], [data-ga-event], [data-ga-label]"
      );
      if (!el) return;

      const tag = el.tagName.toLowerCase();
      const dataLabel = el.getAttribute("data-ga-label") ?? el.getAttribute("data-ga-event");
      const elementText = scrub((el.textContent ?? "").trim(), 60);

      if (tag === "a") {
        const href = (el as HTMLAnchorElement).href || "";
        const external = href ? isExternalUrl(href) : false;
        const download =
          Boolean((el as HTMLAnchorElement).download) || (href ? isFileDownload(href) : false);
        trackEvent("click", {
          element_type: "link",
          link_text: dataLabel ?? elementText,
          link_domain: external ? new URL(href, window.location.href).hostname : undefined,
          link_path: external ? undefined : new URL(href, window.location.href).pathname,
          outbound: external ? "true" : "false",
          file_download: download ? "true" : "false",
        });
      } else {
        trackEvent("click", {
          element_type: tag,
          element_id: el.id || undefined,
          element_text: dataLabel ?? elementText,
        });
      }
    };

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || typeof form.action !== "string") return;
      trackEvent("form_submit", {
        form_id: form.id || undefined,
        form_action: form.action ? new URL(form.action, window.location.href).pathname : undefined,
      });
    };

    const onError = (e: ErrorEvent) => trackException(e.message || "window.onerror", false);

    const onUnhandledRejection = (e: PromiseRejectionEvent) =>
      trackException(typeof e.reason === "string" ? e.reason : "unhandledrejection", false);

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
