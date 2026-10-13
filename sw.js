const CACHE = 'guia-de-bolso-offline-v3';
const ASSETS = ['./', './index.html', './style.css', './script.js', './explore.js', './tasks.js',
  './translator.js', './conversion-history.js', './weather.js', './sos.js', './imagens/argentina.png', './imagens/brasil.svg',
  './imagens/canada.png', './imagens/espanha.png', './imagens/estados-unidos.png',
  './imagens/inglaterra.png', './imagens/guia-de-bolso-logo.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('guia-de-bolso-offline-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const allowed = ASSETS.some((asset) => new URL(asset, self.registration.scope).pathname === url.pathname);
  if (!allowed) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('Unavailable');
      await cache.put(event.request, response.clone());
      return response;
    } catch {
      return await cache.match(event.request, { ignoreSearch: true }) || Response.error();
    }
  })());
});
