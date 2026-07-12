const CACHE_NAME = 'shlifim-v46';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './crossword.html',
  './manifest.json',
  './glossary.js',
  './data/subjects.js',
  './data/topics.js',
  './lib/normalize.js',
  './lib/aliases.js',
  './lib/search.js',
  './lib/quiz.js',
  './lib/validate.js',
  './lib/tiers.js',
  './app/achievements.js',
  './audio/manifest.js',
  './app/sound.js',
  './app/mlicons.js',
  './app/styles-v2.css',
  './app/app-v2.js',
  './icon-192.png',
  './icon-512.png',
  './intro.mp4'
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

// Allow the page to tell a waiting SW to take over immediately
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Network-first for our own HTML + app code (so deploys show up on the next reload),
// cache-first only for static media (icons/images/fonts). Firebase is bypassed.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;
  if (req.method !== 'GET') return;

  if (url.includes('firebaseio.com') || url.includes('googleapis.com') ||
      url.includes('firebase') || url.includes('gstatic.com/firebasejs')) {
    return; // let the browser handle auth/firestore normally
  }

  const sameOrigin = url.startsWith(self.location.origin);
  const isCode = req.mode === 'navigate' || /\.(html|js|jsx|css|json)(\?|$)/i.test(url);

  // App shell + code → network-first (always fresh when online, cache fallback offline)
  if (sameOrigin && isCode) {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match(req).then(c => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Everything else (images, icons, fonts) → cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return response;
    }).catch(() => undefined))
  );
});
