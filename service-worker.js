const CACHE_NAME = 'shlifim-v2';
const FILES_TO_CACHE = [
  './shlifim.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache the core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for Firebase
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Always go to network for Firebase calls (auth, firestore)
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || 
      url.includes('firebase') || url.includes('gstatic.com/firebasejs')) {
    return; // let the browser handle it normally
  }
  
  // Network-first for HTML (so users get updates immediately)
  if (event.request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./shlifim.html')))
    );
    return;
  }
  
  // Cache-first for other assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('./shlifim.html');
        }
      });
    })
  );
});
