/* Ritim service worker — çevrimdışı çalışma ve bildirim tıklamaları */
const VERSION = "ritim-v2";
const BASE = new URL(self.registration.scope).pathname; // "/" ya da "/ritim/"
const SHELL = ["", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"].map(p => BASE + p);

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Sayfa gezinmeleri: önce ağ, çevrimdışıysa önbellekteki uygulama kabuğu
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(BASE + "index.html", copy)); return res; })
      .catch(() => caches.match(BASE + "index.html")));
    return;
  }
  // Aynı kaynaktaki dosyalar ve Google Fonts: önbellekten hızlı yanıt, arka planda yenile
  if (url.origin === location.origin || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com")) {
    if (url.pathname.startsWith(BASE + "api/") || url.pathname.startsWith("/api/")) return;
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow(BASE);
  }));
});
