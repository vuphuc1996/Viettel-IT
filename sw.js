/* IT WORKSPACE app-shell cache only. Never cache GAS requests, query results, or authenticated data. */
const CACHE_NAME = 'viettel-it-shell-v20261024-catalog-uppercase-v5-save-toast-fix';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('viettel-it-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheResponseSafely(event, request, response) {
  if (!response || !response.ok || response.type === 'opaque') return;
  // IMPORTANT: clone synchronously while body is still unused. Do not wait for caches.open().
  let copy;
  try { copy = response.clone(); }
  catch (error) { return; }
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.put(request, copy))
      .catch(() => undefined)
  );
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Always bypass cross-origin services (notably GAS JSONP/form POST bridge).
  if (url.origin !== self.location.origin) return;
  // Never cache query strings; they may be request IDs, health checks, or dynamic endpoints.
  if (url.search) return;

  const path = url.pathname;
  const isConfig = path.endsWith('/config.js');
  const isDocument = request.mode === 'navigate' || path.endsWith('/index.html') || path.endsWith('/');
  const knownShellAsset = APP_SHELL.some(item => new URL(item, self.registration.scope).pathname === path);
  if (!isConfig && !isDocument && !knownShellAsset) return;

  if (isConfig || isDocument) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        await cacheResponseSafely(event, request, response);
        return response;
      } catch (error) {
        const fallback = await caches.match(request) || await caches.match('./index.html');
        if (fallback) return fallback;
        return new Response('IT WORKSPACE is offline. Please reconnect to the network.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
  } else {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      await cacheResponseSafely(event, request, response);
      return response;
    })());
  }
});
