/* IT WORKSPACE app shell only. Never cache cross-origin GAS requests or API results. */
const CACHE_NAME = 'viettel-it-shell-v20261023-05';
const APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './viettel-v-favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('viettel-it-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // GAS is cross-origin and must never be cached.
  const path = url.pathname;
  const isConfig = path.endsWith('/config.js');
  const isDocument = request.mode === 'navigate' || path.endsWith('/index.html') || path.endsWith('/');
  if (!isConfig && !isDocument && !APP_SHELL.some(item => new URL(item, self.registration.scope).pathname === path)) return;
  if (isConfig || isDocument) {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))));
  } else {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});
