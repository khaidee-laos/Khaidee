/* ============================================================
   KhaiDee service worker
   Shared by the customer storefront (index.html) and the seller
   app (seller.html) — both register this same file at the site
   root so a single push subscription / cache covers the domain.

   NOTE: if you already have a sw.js on the server with custom
   offline-caching logic, merge the PUSH / NOTIFICATIONCLICK
   sections below into it instead of overwriting the whole file.
   ============================================================ */
const CACHE_NAME = 'khaidee-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Simple network-first strategy for navigations, cache-first for everything else — enough
// for basic offline resilience without getting in the way of fresh data from Supabase.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* ---- Push notifications: new-order alerts for sellers (sound + vibration), even when
   the app is closed or the phone is locked. ---- */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'KhaiDee', body: event.data ? event.data.text() : '' }; }

  const title = data.title || '🛍️ ອໍເດີໃໝ່ເຂົ້າມາ!';
  const options = {
    body: data.body || 'ທ່ານໄດ້ຮັບອໍເດີໃໝ່ໃນຮ້ານຄ້າ',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.tag || 'khaidee-order',
    vibrate: [300, 150, 300, 150, 300], // distinct pattern so it's felt even screen-down in a pocket
    requireInteraction: true, // stays on screen until the seller taps/dismisses it, not just a few seconds
    data: { url: data.url || 'seller.html' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an already-open seller tab if there is one, otherwise
// opens a new one straight to the orders page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || 'seller.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes('seller.html'));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
