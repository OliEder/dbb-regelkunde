// sw.js — Service Worker für Offline-Nutzung
const VERSION = 'v1.3.1';
const CACHE = 'regelkunde-v1.3.1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/rules.js',
  './js/state.js',
  './js/theme.js',
  './js/utils.js',
  './data/questions.json',
  './data/rules.json',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      const oldCaches = keys.filter(k => k !== CACHE);
      const isUpdate = oldCaches.length > 0;
      return Promise.all(oldCaches.map(k => caches.delete(k)))
        .then(() => self.clients.matchAll({ includeUncontrolled: true }))
        .then(clients => {
          if (isUpdate) {
            clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: VERSION }));
          }
        });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
