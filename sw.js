// AURA90 — service worker
// Stratégie : réseau d'abord (les pronos sont des données vivantes),
// cache de secours pour rouvrir l'app sans connexion.
const CACHE = 'aura90-v4';
const COQUILLE = ['.', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // ne jamais mettre en cache Supabase ni les fonctions : données vivantes
  if (url.hostname.endsWith('supabase.co')) return;
  e.respondWith(
    fetch(e.request)
      .then(rep => {
        if (rep.ok && url.origin === location.origin) {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(e.request, copie));
        }
        return rep;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.titre || 'AURA90', {
    body: d.corps || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return clients.openWindow('.');
  }));
});
