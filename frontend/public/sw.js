const CACHE_NAME = 'words-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// Install event: cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened app cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: intercept network requests and serve cached assets when available
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests, skip backend API routes, and skip non-http schemes (like chrome-extension://)
  if (event.request.method === 'GET' && url.protocol.startsWith('http') && !url.pathname.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});

// --- PUSH NOTIFICATION LISTENERS ---

// Handle incoming push notifications from backend cron job
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: 'Words Reminder',
    body: 'Your daily words are waiting!',
    icon: '/android-chrome-192x192.png',
    url: '/'
  };

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.icon,
    data: { url: data.url }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle user clicking on the push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open, focus it
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});