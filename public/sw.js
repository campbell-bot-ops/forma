const CACHE_NAME = 'forma-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/Frame 166.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
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
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Bypass caching Next.js/Webpack development bundle files to prevent dev environment side-effects
  if (
    event.request.url.includes('_next') || 
    event.request.url.includes('webpack') || 
    event.request.url.includes('hot-update')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTTP/HTTPS network responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request);
      })
  );
});

// Listen to push notifications events
self.addEventListener('push', (event) => {
  let data = { title: 'FORMA', body: 'Ready for your next session?' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'FORMA', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/Frame 166.png',
    badge: '/Frame 166.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      { action: 'explore', title: 'Open FORMA' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
