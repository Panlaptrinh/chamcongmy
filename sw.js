const CACHE = "cham-cong-mi-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./app.js?v=7",
  "./manifest.webmanifest",
  "./icons/icon-192.png?v=7",
  "./icons/icon-512.png?v=7"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Network-first strategy to ensure mobile devices get fresh UI updates immediately
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then(cached => {
          return cached || caches.match("./index.html");
        });
      })
  );
});
