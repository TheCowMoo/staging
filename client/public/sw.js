/**
 * sw.js — Response Activation System Service Worker
 *
 * Scope: / (root — covers the full PWA)
 * Registered from: client/src/main.tsx
 *
 * Responsibilities:
 *  1. Handle incoming push events and show native OS notifications
 *  2. On notificationclick: deep-link to /ras (active alert view)
 *  3. install / activate lifecycle for cache management
 */

const CACHE_NAME = "ras-v1";

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Push Event ───────────────────────────────────────────────────────────────
// Fires when the server sends a push notification, even if the app is closed.
self.addEventListener("push", (event) => {
  let payload = {
    title: "Emergency Alert",
    body: "An emergency alert has been issued. Open the app for details.",
    alertType: "lockdown",
    alertEventId: null,
    url: "/ras",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  // Alert type determines icon and badge color
  const isLockdown = payload.alertType === "lockdown";

  const options = {
    body: payload.body,
    icon: isLockdown ? "/icons/lockdown-192.png" : "/icons/lockout-192.png",
    badge: "/icons/badge-72.png",
    tag: `ras-alert-${payload.alertEventId ?? "active"}`,
    // renotify: true ensures the notification re-fires even if same tag exists
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.url || "/ras",
      alertEventId: payload.alertEventId,
    },
    actions: [
      { action: "open", title: "View Alert" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
// Opens /ras when the user taps the notification or the "View Alert" action.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/ras";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If the app is already open, focus it and navigate
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── Push Subscription Change ─────────────────────────────────────────────────
// Fires when the browser rotates the push subscription (e.g. after browser update).
// The app must re-register the new subscription on next open.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.__VAPID_PUBLIC_KEY__,
      })
      .then((newSub) => {
        // Post message to all clients so they can re-save the subscription
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((c) =>
            c.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED", subscription: newSub.toJSON() })
          );
        });
      })
      .catch(() => {
        // Silent — app will prompt user to re-enable on next open
      })
  );
});
