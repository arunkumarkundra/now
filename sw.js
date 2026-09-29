// Offline support. Bump VERSION whenever you change any file, so phones pick up the update.
const VERSION = "observer-v2.0.0";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/app.css",
  "assets/js/app.js",
  "assets/js/audio.js",
  "assets/js/content.js",
  "assets/js/cues-data.js",
  "assets/js/session.js",
  "assets/fonts/instrument-serif-latin-400-normal.woff2",
  "assets/fonts/instrument-serif-latin-400-italic.woff2",
  "assets/fonts/inter-latin-wght-normal.woff2",
  "assets/icons/icon-192.png",
  "assets/icons/favicon.svg",
  "assets/audio/calm/g_end.mp3",
  "assets/audio/calm/g_intro.mp3",
  "assets/audio/calm/g_p1_late.mp3",
  "assets/audio/calm/g_p1_mid.mp3",
  "assets/audio/calm/g_p1_start.mp3",
  "assets/audio/calm/g_p2_late.mp3",
  "assets/audio/calm/g_p2_mid.mp3",
  "assets/audio/calm/g_p2_start.mp3",
  "assets/audio/calm/g_p3_drop.mp3",
  "assets/audio/calm/g_p3_late.mp3",
  "assets/audio/calm/g_p3_start.mp3",
  "assets/audio/calm/m_end.mp3",
  "assets/audio/calm/m_intro.mp3",
  "assets/audio/calm/m_p1_start.mp3",
  "assets/audio/calm/m_p2_start.mp3",
  "assets/audio/calm/m_p3_drop.mp3",
  "assets/audio/calm/m_p3_start.mp3",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  // Pages: try the network first so updates arrive; fall back to the cached copy offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); return res; }).catch(() => caches.match("index.html")));
    return;
  }
  // Everything else: cached copy first, then network (and remember it).
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
