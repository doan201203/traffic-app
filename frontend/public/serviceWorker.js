// Service worker for offline functionality and improved performance

// Cache names for different types of assets
const STATIC_CACHE = 'traffic-app-static-v1';
const DYNAMIC_CACHE = 'traffic-app-dynamic-v1';
const MAP_CACHE = 'traffic-app-map-v1';

// Assets to cache immediately when service worker is installed
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.bundle.js',
  '/static/css/main.css',
  '/static/media/notification.mp3'
];

// Set up cache size limits
const DYNAMIC_CACHE_LIMIT = 50;
const MAP_CACHE_LIMIT = 100;

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== MAP_CACHE)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to limit the size of a cache
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete the oldest item
    await cache.delete(keys[0]);
    // Recursively call until we're under the limit
    await limitCacheSize(cacheName, maxItems);
  }
};

// Fetch event - respond with cached resources when possible
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.includes('mapbox.com/')) {
    return;
  }
  
  // Special handling for mapbox tiles
  if (event.request.url.includes('mapbox.com/')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Return from cache if available
        if (response) return response;
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(fetchResponse => {
            // Store a copy in cache
            return caches.open(MAP_CACHE).then(cache => {
              cache.put(event.request.url, fetchResponse.clone());
              limitCacheSize(MAP_CACHE, MAP_CACHE_LIMIT);
              return fetchResponse;
            });
          })
          .catch(error => {
            console.error('Error fetching map tile:', error);
            // If offline, return a fallback
            return new Response('Map unavailable offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
    );
    return;
  }
  
  // Handle API requests - network first with cache fallback
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For all other requests - cache first with network fallback
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return from cache if available
      if (response) return response;
      
      // Otherwise fetch from network
      return fetch(event.request)
        .then(fetchResponse => {
          // Don't cache non-GET requests
          if (event.request.method !== 'GET') {
            return fetchResponse;
          }
          
          // Store a copy in dynamic cache
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request.url, fetchResponse.clone());
            limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            return fetchResponse;
          });
        })
        .catch(error => {
          console.error('Fetch failed:', error);
          
          // Return fallback for HTML pages
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
          
          // Return generic offline response
          return new Response('Application is offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
    })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'trafficapp-sync') {
    event.waitUntil(
      // Process any pending offline requests
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            msg: 'sync-ready'
          });
        });
      })
    );
  }
});