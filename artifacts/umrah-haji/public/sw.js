const CACHE_NAME = "vinstour-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/favicon.ico", "/favicon.svg"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((r) => {
          if (r.ok) cache.put(request, r.clone());
          return r;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }
  event.respondWith(
    fetch(request).then((r) => {
      if (r.ok) caches.open(CACHE_NAME).then((c) => c.put(request, r.clone()));
      return r;
    }).catch(() => caches.match(request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notifikasi", body: event.data.text() };
  }

  const { title = "Vinstour Travel", body = "", icon, url } = payload;

  const options = {
    body,
    icon: icon || "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    data: { url: url || "/" },
    actions: [
      { action: "open", title: "Buka" },
      { action: "close", title: "Tutup" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  if (event.action === "close") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
