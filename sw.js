/* Guarda as telas e os cards para o app abrir mesmo com internet ruim.
   Sempre tenta a versão nova primeiro; sem internet, usa a guardada. */
const CACHE = 'revisao-v3';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (!/\/(|[\w-]+\.(html|js|css|json|webmanifest))$/.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(e.request, {cache: 'no-cache'});
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const g = await c.match(e.request);
      if (g) return g;
      throw err;
    }
  })());
});
