// Minimal service worker for PWA installability.
// Implements a network-first strategy with an offline shell fallback so the
// app stays installable and resilient. Push notifications are out of scope for
// now (can be added later via the 'push' / 'notificationclick' events).

const CACHE = "salon-booking-v1";
const OFFLINE_URLS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET navigations; let everything else hit the network.
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }
});
