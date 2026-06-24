const CACHE_NAME = 'echo-rift-prism-v7.0.3-focus';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/control-bindings.js',
  './js/game.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './assets/audio/kenney-ui/ui-hover.ogg',
  './assets/audio/kenney-ui/ui-select.ogg',
  './assets/audio/kenney-ui/ui-switch.ogg',
  './assets/audio/kenney-sci-fi/laser-small.ogg',
  './assets/audio/kenney-sci-fi/force-field.ogg',
  './assets/audio/kenney-sci-fi/explosion-crunch.ogg',
  './assets/audio/kenney-sci-fi/low-boom.ogg',
  './assets/images/kenney-space/impact-cloud.png',
  './assets/images/kenney-space/rift-flare.png',
  './assets/vendor/kenney/ui-audio/License.txt',
  './assets/vendor/kenney/sci-fi-sounds/License.txt',
  './assets/vendor/kenney/space-shooter-extension/License.txt',
  './THIRD_PARTY_NOTICES.md'
];

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch (_) {
    return false;
  }
}

async function putIfCacheable(request, response) {
  if (!isSameOrigin(request) || !response?.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function networkFirstDocument(request) {
  try {
    const response = await fetch(request);
    await putIfCacheable(request, response);
    return response;
  } catch (_) {
    const fallback = await caches.match('./index.html');
    return fallback || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await putIfCacheable(request, response);
    return response;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(event.request));
    return;
  }
  event.respondWith(cacheFirstAsset(event.request));
});
