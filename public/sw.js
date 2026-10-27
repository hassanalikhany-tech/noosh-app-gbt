const SHELL_CACHE = 'noosh-shell-__NOOSH_BUILD_ID__';
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
    // Keep the preceding release for a tab still using its hashed lazy chunks.
    const previousShells = (await caches.keys()).filter(key => key.startsWith('noosh-shell-') && key !== SHELL_CACHE).slice(-1);
    const retained = new Set([SHELL_CACHE, IMAGE_CACHE, ...previousShells]);
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
      if (response.ok && url.pathname !== '/admin' && !url.pathname.startsWith('/admin/') && !url.pathname.endsWith('.html')) {
        const copy = response.clone();
        event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.put('/', copy)).catch(() => {}));
      }
      return response;
    }).catch(async () => (await (await caches.open(SHELL_CACHE)).match('/')) || Response.error()));
    return;
  }

  if (request.destination === 'image' && (url.pathname.startsWith('/images/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/hero-'))) {
    event.respondWith(caches.open(IMAGE_CACHE).then(async cache => {
      const cached = await cache.match(request);
      const update = fetch(request).then(async response => {
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          // Storage quota failure must never hide an image received successfully.
          try {
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          if (keys.length > 180) await cache.delete(keys[0]);
          } catch {}
        }
        return response;
      }).catch(() => null);
      event.waitUntil(update.then(() => {}));
      return cached || await update || Response.error();
    }));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || url.pathname.endsWith('.webmanifest') || url.pathname === '/data/recipes_overrides.json') {
    event.respondWith(caches.open(SHELL_CACHE).then(async cache => {
      try {
        const response = await fetch(request);
        if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
          try { await cache.put(request, response.clone()); } catch {}
        }
        if (!response.ok && (request.destination === 'script' || request.destination === 'style')) {
          const saved = await caches.match(request);
          if (saved) return saved;
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    }));
  }
});
