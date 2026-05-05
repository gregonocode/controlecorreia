const CACHE_NAME = "cash-correia-pwa-v1";
const APP_ASSETS = [
  "/dashboard",
  "/icon-129.png",
  "/icon-512.png",
  "/maskable-icon-192.png",
  "/maskable-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/dashboard")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});
