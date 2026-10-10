const CACHE_NAME = 'study-planner-v6.9';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js?v=6.9',
  './firebase-config.js?v=6.9',
  './manifest.json',
  './logo/logo_idv_planner.png'
];

// Install: Cache các tài nguyên cốt lõi
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW Precache warning:', err);
      });
    })
  );
});

// Activate: Xóa các cache cũ khi có phiên bản mới
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Chiến lược Network First với fallback Cache cho tài nguyên web
self.addEventListener('fetch', event => {
  // Chỉ cache các request GET cùng origin hoặc các CDN thiết yếu
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bỏ qua các request Firestore / Google APIs / Firebase Auth (để SDK Firebase tự quản lý)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('apis.google.com')
  ) {
    return;
  }

  // Network First: Cố gắng lấy bản mới nhất từ mạng, nếu offline/mất mạng thì fallback vào cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
