// sw.js
const CACHE = 'buzzword-ball-v6'; // bump when HTML/CSS/JS change
const ASSETS = ['./', './index.html', './manifest.json']; // ⬅️ no phrases.json here

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Network-first JUST for phrases.json
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.pathname.endsWith('/phrases.json')) {
        return e.respondWith(
            fetch(new Request(e.request, { cache: 'no-store' }))
                .catch(() => caches.match('/phrases.json')) // optional offline fallback
        );
    }
    // Cache-first for everything else
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
