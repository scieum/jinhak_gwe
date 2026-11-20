// 진학 내비 서비스 워커: 오프라인에서도 앱 화면이 열리게 해요.
// 같은 출처의 GET만 다뤄요. Supabase·AI 프록시 등 다른 출처 요청(계정·학생 글)은 건드리지 않고 저장하지도 않아요.
const CACHE = 'jinhak-navi-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // 화면 이동: 새 버전을 먼저, 안 되면 저장해 둔 앱 화면
  if (req.mode === 'navigate') { e.respondWith(fetch(req).then(res => put('/', res)).catch(() => caches.match('/'))); return; }
  // 빌드 파일은 이름에 해시가 있어 바뀌지 않아요: 저장본 먼저
  if (url.pathname.startsWith('/assets/') && /-[A-Za-z0-9_-]{8,}\./.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)))); return;
  }
  // 공개 자료·아이콘 등: 새 것을 먼저, 오프라인이면 저장본
  e.respondWith(fetch(req).then(res => put(req, res)).catch(() => caches.match(req).then(hit => hit || Response.error())));
});
