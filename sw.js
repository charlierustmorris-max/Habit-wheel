/* Habit Wheel — offline shell.
   Bump CACHE on every deploy so the new shell replaces the old one. */
const CACHE = "habit-wheel-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: serve the cached shell instantly, refresh it in the background.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(hit => {
        const net = fetch(req)
          .then(res => {
            caches.open(CACHE).then(c => c.put("./index.html", res.clone()));
            return res;
          })
          .catch(() => hit || Response.error());
        return hit || net;
      })
    );
    return;
  }

  // Everything else: cache first, fall back to network.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
