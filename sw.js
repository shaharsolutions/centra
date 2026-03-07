const CACHE_NAME = 'centra-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './pricing.html',
  './landing.html',
  './manifest.json',
  './favicon.png',
  './styles/main.css',
  './styles/landing.css',
  './js/app-config.js',
  './js/store.js',
  './js/auth.js',
  './js/ui.js',
  './js/app.js',
  './js/admin.js'
];

// Install Event - Caching basic assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Cleaning up old caches
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
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fallback to cache for static assets
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Supabase or Google Fonts) to avoid issues
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
