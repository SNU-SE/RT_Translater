const CACHE_NAME = 'rt-translator-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/css/style.css',
    '/assets/js/script.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// 페치 이벤트 처리
self.addEventListener('fetch', (event) => {
    // OpenAI API 요청은 캐시하지 않음
    if (event.request.url.includes('api.openai.com')) {
        return fetch(event.request);
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에서 찾은 경우 반환
                if (response) {
                    return response;
                }

                // 캐시에 없는 경우 네트워크에서 가져오기
                return fetch(event.request)
                    .then((response) => {
                        // 유효한 응답이 아닌 경우 그대로 반환
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 응답 복사
                        const responseToCache = response.clone();

                        // 캐시에 저장
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // 네트워크 오류 시 기본 페이지 반환
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// 백그라운드 동기화 (향후 확장 가능)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Service Worker: Background sync');
        event.waitUntil(
            // 백그라운드에서 수행할 작업
            Promise.resolve()
        );
    }
});

// 푸시 알림 처리 (향후 확장 가능)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'RT Translator 알림',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '앱 열기',
                icon: '/icon-192x192.png'
            },
            {
                action: 'close',
                title: '닫기',
                icon: '/icon-192x192.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('RT Translator', options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click received');

    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // 알림만 닫기
    } else {
        // 기본 동작: 앱 열기
        event.waitUntil(
            clients.openWindow('/')
        );
    }
}); 