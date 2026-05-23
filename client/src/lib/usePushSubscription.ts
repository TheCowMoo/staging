/**
 * usePushSubscription.ts
 *
 * Manages the full PWA push subscription lifecycle:
 *  - Service worker registration (scope: /)
 *  - Permission request
 *  - Subscription creation using VITE_VAPID_PUBLIC_KEY
 *  - Subscription save to server via ras.savePushSubscription
 *  - Subscription change listener (re-registers on browser rotation)
 *
 * Environment: VITE_VAPID_PUBLIC_KEY must be set.
 * VAPID_PRIVATE_KEY is server-only and never referenced here.
 */

import { useState, useEffect, useCallback } from "react";
import { trpc } from "./trpc";

export type PushStatus =
  | "unsupported"   // Browser does not support push
  | "checking"      // Determining current state
  | "not_subscribed" // Supported but no subscription yet
  | "permission_denied" // User denied notification permission
  | "subscribing"   // In progress
  | "subscribed"    // Active subscription on this device
  | "error";        // Unexpected error

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = trpc.ras.savePushSubscription.useMutation();

  // Check current subscription state on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setStatus("subscribed");
        } else if (Notification.permission === "denied") {
          setStatus("permission_denied");
        } else {
          setStatus("not_subscribed");
        }
      });
    }).catch(() => setStatus("not_subscribed"));

    // Listen for subscription rotation from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && event.data.subscription) {
        saveMutation.mutate({
          subscription: event.data.subscription,
          userAgent: navigator.userAgent,
        });
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      setError("Push notifications are not configured for this environment.");
      setStatus("error");
      return;
    }

    setStatus("subscribing");
    setError(null);

    try {
      // Register service worker if not already registered
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("permission_denied");
        return;
      }

      // Create push subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
        expirationTime: number | null;
      };

      // Save to server
      await saveMutation.mutateAsync({
        subscription: subJson,
        userAgent: navigator.userAgent,
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("[RAS/Push] Subscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to enable push notifications.");
      setStatus("error");
    }
  }, [saveMutation]);

  return { status, error, subscribe };
}
