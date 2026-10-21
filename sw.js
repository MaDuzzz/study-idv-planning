const CACHE_NAME = 'study-planner-v8.7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js?v=8.7',
  './firebase-config.js?v=8.7',
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

// ==========================================
// 4. WEB PUSH NOTIFICATION HANDLERS (iOS 16.4+ & Desktop)
// ==========================================

// Nhận payload thông báo từ Apple APNs / Web Push Server
self.addEventListener('push', event => {
  let data = {
    title: 'Study & Life Planner ⏰ (23h30)',
    body: 'Bạn có nhiệm vụ cần kiểm tra hôm nay!',
    icon: './logo/logo_idv_planner.png',
    badge: './logo/logo_idv_planner.png',
    data: { url: './' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './logo/logo_idv_planner.png',
    badge: data.badge || './logo/logo_idv_planner.png',
    vibrate: [150, 80, 150],
    data: data.data || { url: './' },
    actions: [
      { action: 'open', title: 'Mở danh sách task' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Khi người dùng bấm / chạm vào thông báo trên màn hình khóa iPhone
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
