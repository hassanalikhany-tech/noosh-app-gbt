const SHELL_CACHE = 'noosh-shell-v2';
const IMAGE_CACHE = 'noosh-images-v2';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/data/recipes_overrides.json', '/brand/noosh-logo.png', '/icons/noosh-192.png', '/icons/noosh-512.png', '/hero-chelo-kabab-barg.png', '/hero-zereshk-polo.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_URLS);
    const manifestResponse = await fetch('/sw-precache.json', { cache: 'no-cache' });
    if (!manifestResponse.ok) throw new Error('Noosh offline asset list is missing.');
    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest.assets)) throw new Error('Noosh offline asset list is invalid.');
    await cache.addAll(manifest.assets);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const retained = new Set([SHELL_CACHE, IMAGE_CACHE]);
    const cachesToRemove = (await caches.keys()).filter(key => key.startsWith('noosh-') && !retained.has(key));
    await Promise.all(cachesToRemove.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/.netlify/functions/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(SHELL_CACHE).then(cache => cache.put('/', response.clone()));
      return response;
    }).catch(async () => (await (await caches.open(SHELL_CACHE)).match('/')) || Response.error()));
    return;
  }

  if (request.destination === 'image' && (url.pathname.startsWith('/images/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/hero-'))) {
    event.respondWith(caches.open(IMAGE_CACHE).then(async cache => {
      const cached = await cache.match(request);
      const update = fetch(request).then(async response => {
        if (response.ok) {
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          if (keys.length > 180) await cache.delete(keys[0]);
        }
        return response;
      }).catch(() => null);
      return cached || await update || Response.error();
    }));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || url.pathname.endsWith('.webmanifest') || url.pathname === '/data/recipes_overrides.json') {
    event.respondWith(caches.open(SHELL_CACHE).then(async cache => {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    }));
  }
});
