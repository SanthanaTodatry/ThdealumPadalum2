// Minimal service worker to prevent errors
self.addEventListener('install', () => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Just pass through requests
  event.respondWith(fetch(event.request));
});
