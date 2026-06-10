const CACHE_NAME = 'shlifim-v9';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './glossary.js',
  './data/subjects.js',
  './data/topics.js',
  './lib/normalize.js',
  './lib/aliases.js',
  './lib/search.js',
  './lib/quiz.js',
  './lib/validate.js',
  './lib/related.js',
  './lib/srs.js',
  './app/achievements.js',
  './app/sound.js',
  './app/styles-v2.css',
  './app/app-v2.jsx',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache the core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Fetch: network-first for HTML (instant updates), cache-first for assets, bypass Firebase
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (url.includes('firebaseio.com') || url.includes('googleapis.com') ||
      url.includes('firebase') || url.includes('gstatic.com/firebasejs')) {
    return; // let the browser handle auth/firestore normally
  }

  if (event.request.mode === 'navigate' || url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (event.request.method === 'GET' && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
