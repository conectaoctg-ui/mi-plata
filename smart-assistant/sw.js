// Service worker: red primero y caché como respaldo para uso sin conexión.
const CACHE = 'conectaoctg-sa-v2';
const ARCHIVOS = [
  './', './index.html', './styles.css', './manifest.json', './js/app.js',
  './js/core/money.js', './js/core/finance.js', './js/core/permissions.js', './js/core/crm.js', './js/core/service.js',
  './js/core/search.js', './js/core/academy.js', './js/core/roleplay.js', './js/core/catalog.js', './js/core/auth.js', './js/core/audit.js', './js/core/garantia.js',
  './js/data/store.js', './js/data/repo.js', './js/data/seed.js',
  './js/ui/h.js', './js/ui/inicio.js', './js/ui/ventas.js', './js/ui/clientes.js', './js/ui/financiacion.js', './js/ui/tecnico.js',
  './js/ui/academia.js', './js/ui/buscar.js', './js/ui/admin.js'
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('conectaoctg-sa-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
