const CACHE_VERSION = "vinstour-v3";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/images/icon-192.png",
  "/images/icon-512.png",
];

// Jamaah portal routes that should work offline (shell caching)
const JAMAAH_ROUTES = [
  "/jamaah",
  "/jamaah/panduan-ibadah",
  "/jamaah/doa-panduan",
  "/jamaah/waktu-sholat",
  "/jamaah/checklist",
  "/jamaah/digital-id",
  "/jamaah/itinerary",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Skip API calls — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (JS, CSS, images) — cache-first with network fallback
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((r) => {
            if (r.ok) cache.put(request, r.clone());
            return r;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests — network-first, offline fallback to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((r) => {
          // Cache HTML shells for jamaah routes
          if (r.ok && JAMAAH_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(route + "/"))) {
            caches.open(CACHE_VERSION).then((c) => c.put(request, r.clone()));
          }
          return r;
        })
        .catch(async () => {
          // Try exact cached route first
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback: serve root shell (SPA will handle routing)
          const root = await caches.match("/");
          return root || new Response("Sedang offline. Silakan periksa koneksi internet Anda.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(request)
      .then((r) => {
        if (r.ok) caches.open(CACHE_VERSION).then((c) => c.put(request, r.clone()));
        return r;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();

  // Pre-cache critical jamaah content on demand
  if (event.data?.type === "CACHE_JAMAAH") {
    caches.open(CACHE_VERSION).then((cache) => {
      cache.addAll(JAMAAH_ROUTES).catch(() => {});
    });
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notifikasi", body: event.data.text() };
  }

  const { title = "Vinstour Travel", body = "", icon, url, tag } = payload;

  const options = {
    body,
    icon: icon || "/images/icon-192.png",
    badge: "/images/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: url || "/jamaah" },
    tag: tag || "vinstour-notif",
    renotify: true,
    actions: [
      { action: "open", title: "Buka" },
      { action: "close", title: "Tutup" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/jamaah";
  if (event.action === "close") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
