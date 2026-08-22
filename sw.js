/* Habit Wheel — offline shell.
   Everything the app needs, fonts included, is precached on install, so a
   cold start with no network renders exactly as it does online. */
const VERSION = "hw-v1";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png",
  "./fonts/doto-var.woff2", "./fonts/space-grotesk-var.woff2",
  "./fonts/space-mono-400.woff2", "./fonts/space-mono-700.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && req.mode === "navigate") {
    // Network-first for the document so a redeploy is picked up promptly.
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || Response.error()))
    );
  }
});
