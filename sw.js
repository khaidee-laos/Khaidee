// KhaiDee ຂາຍດີ — minimal service worker (enables "Add to Home Screen" / installability)
const CACHE = 'khaidee-shell-v2';
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

// Network-first for API/data calls, cache-first for the app shell files themselves.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (event.request.method !== 'GET' || url.includes('supabase.co')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});
