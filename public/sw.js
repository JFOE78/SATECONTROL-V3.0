const CACHE_NAME = 'sate-pro-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Estrategia Stale-While-Revalidate para recursos locales (mismo origen)
  // Esto es sumamente eficiente y no recalienta el móvil ya que responde del caché al instante
  // y actualiza los recursos de segundo plano de manera pasiva y no bloqueante.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Silenciar fallos de red en segundo plano
          });

        // Retornar la versión cacheada inmediatamente para evitar activar el módem celular/CPU,
        // o esperar a la red si no está cacheado
        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // Para cualquier otro origen (ej. fuentes de google), pasamos a través de la red normal
    event.respondWith(fetch(event.request));
  }
});
