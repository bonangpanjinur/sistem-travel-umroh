const CACHE_VERSION = "vinstour-v4";
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
  "/jamaah/manasik-interaktif",
  "/jamaah/manasik",
  "/jamaah/tracker-ibadah",
  "/jamaah/doa-counter",
  "/jamaah/badges",
  "/jamaah/jurnal",
  "/jamaah/target-ibadah",
  "/jamaah/peta-lokasi",
  "/jamaah/rombongan",
  "/jamaah/sertifikat",
  "/sholat",
  "/alquran",
  "/kiblat",
  "/tracker-ibadah",
  "/tasbih",
  "/kalkulator-islami",
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
            if (r.ok) {
              const copy = r.clone();
              cache.put(request, copy).catch(() => {});
            }
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
            const copy = r.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
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
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(request))
  );
});

// Scheduled notification timers (persisted across soft navigations)
const scheduledNotifTimers = new Map();

// ── BACKGROUND SYNC ──────────────────────────────────────────────────────────
// Replay queued offline actions when connectivity is restored.
const OFFLINE_QUEUE_KEY = "vinstour-offline-queue";

self.addEventListener("sync", (event) => {
  if (event.tag === "vinstour-sync-queue") {
    event.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue() {
  let queue;
  try {
    const db = await openQueueDB();
    queue = await getAllFromDB(db);
  } catch {
    return;
  }

  if (!queue || queue.length === 0) return;

  const remaining = [];
  for (const action of queue) {
    if (!action.url || !action.payload) continue;
    try {
      const res = await fetch(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Notify all clients about successful sync
      const allClients = await clients.matchAll();
      allClients.forEach((c) =>
        c.postMessage({ type: "SYNC_SUCCESS", actionId: action.id, label: action.label })
      );
    } catch {
      if ((action.retries || 0) < 3) {
        remaining.push({ ...action, retries: (action.retries || 0) + 1 });
      }
    }
  }

  try {
    const db = await openQueueDB();
    await clearDB(db);
    for (const item of remaining) {
      await putInDB(db, item);
    }
  } catch {
    // best-effort
  }
}

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("vinstour-sync-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("queue", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function clearDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const req = tx.objectStore("queue").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function putInDB(db, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    const req = tx.objectStore("queue").put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();

  // Pre-cache critical jamaah content on demand
  if (event.data?.type === "CACHE_JAMAAH") {
    caches.open(CACHE_VERSION).then((cache) => {
      cache.addAll(JAMAAH_ROUTES).catch(() => {});
    });
  }

  // Schedule a local notification from the main thread
  // Payload: { type: "SCHEDULE_NOTIF", id, title, body, fireAt (ISO string), icon, url, tag }
  if (event.data?.type === "SCHEDULE_NOTIF") {
    const { id, title, body, fireAt, icon, url, tag } = event.data;
    const ms = new Date(fireAt).getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;

    // Clear any existing timer for this id
    if (scheduledNotifTimers.has(id)) {
      clearTimeout(scheduledNotifTimers.get(id));
    }

    const timer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: icon || "/images/icon-192.png",
        badge: "/images/icon-192.png",
        vibrate: [200, 100, 200],
        tag: tag || id,
        renotify: true,
        data: { url: url || "/jamaah/pengingat-ibadah" },
        actions: [
          { action: "open", title: "Buka" },
          { action: "dismiss", title: "Tutup" },
        ],
      });
      scheduledNotifTimers.delete(id);
    }, ms);

    scheduledNotifTimers.set(id, timer);
  }

  // Cancel a scheduled notification
  if (event.data?.type === "CANCEL_NOTIF") {
    const { id } = event.data;
    if (scheduledNotifTimers.has(id)) {
      clearTimeout(scheduledNotifTimers.get(id));
      scheduledNotifTimers.delete(id);
    }
  }

  // Cancel all scheduled notifications
  if (event.data?.type === "CANCEL_ALL_NOTIFS") {
    scheduledNotifTimers.forEach((t) => clearTimeout(t));
    scheduledNotifTimers.clear();
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
