// KhaiDee ຂາຍດີ — minimal service worker (enables "Add to Home Screen" / installability)
const CACHE = 'khaidee-shell-v3'; // bumped so this update forces one clean cache refresh
const SHELL_FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;
  if (req.method !== 'GET' || url.includes('supabase.co')) return;

  // NETWORK-FIRST for the page itself: every time the app opens, it tries the
  // server first so a new deploy shows up immediately — no more waiting on a
  // CACHE-version bump or asking users to delete/reinstall the app. Falls back
  // to the last cached copy only when there's no connection at all.
  const isHTML = req.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/');
  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (icons, manifest, logo — things that rarely change) stays
  // cache-first for speed and offline use, same as before.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
