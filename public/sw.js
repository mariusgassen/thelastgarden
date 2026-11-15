// Service Worker for The Last Garden.
// Strategy:
//  - Precache the app shell + all built assets (injected into dist/sw.js by Vite).
//  - Navigations: network-first with cached index.html + offline HTML fallback.
//  - Same-origin static assets: cache-first, populated on demand, with safe offline fallback.
//  - Updates: wait for explicit SKIP_WAITING message when an active worker already exists.

const CACHE = '__TLG_CACHE_NAME__';
const BASE_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];
const BUILD_ASSETS = __TLG_PRECACHE_ASSETS__;
const PRECACHE_URLS = Array.from(new Set([...BASE_SHELL, ...BUILD_ASSETS]));

function offlinePage() {
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>The Last Garden – Offline</title>
    <style>
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #1f2e1d; color: #f4efe3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 24px; text-align: center;
      }
      .card { max-width: 340px; padding: 24px; border-radius: 16px; background: rgba(47, 74, 44, 0.85); }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0 0 16px; font-size: 14px; line-height: 1.45; opacity: 0.9; }
      button {
        border: 0; border-radius: 999px; padding: 10px 18px; font-size: 14px; font-weight: 600;
        background: #e9a23b; color: #1f2e1d; cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Keine Verbindung</h1>
      <p>The Last Garden ist gerade offline und konnte die Seite nicht aus dem Cache laden.</p>
      <button onclick="location.reload()">Erneut versuchen</button>
    </div>
  </body>
</html>`;
  return new Response(html, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        if (!self.registration.active) {
          return self.skipWaiting();
        }
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tlg-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = (await caches.match('./index.html')) || (await caches.match('./'));
          return cached || offlinePage();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (res.ok && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    }),
  );
});
