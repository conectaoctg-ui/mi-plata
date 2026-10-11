// Service Worker para Onboarding conectaoctg
const CACHE_NAME = 'conectaoctg-onboarding-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './content.js',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith('conectaoctg-onboarding-') && k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Estrategia: red primero, caché como respaldo (funciona sin internet)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
