// Basic Service Worker for PWA Add to Home Screen (A2HS) support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple fetch pass-through
  event.respondWith(fetch(event.request));
});
