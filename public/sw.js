/* Minimal service worker — required for Chrome PWA installability. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* No fetch handler — pass-through caused noisy "Failed to fetch" in DevTools
   when offline or on transient network errors; we don't cache anything yet. */
