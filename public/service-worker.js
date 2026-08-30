"use strict";

const CACHE_PREFIX = "fumi-math-static-";
const CACHE_NAME = CACHE_PREFIX + "2026-08-30-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/math-learn.html",
  "/math-practice.html",
  "/favicon.svg",
  "/assets/math-course.css",
  "/assets/math-course-enhancements.css",
  "/assets/math-print.css",
  "/assets/math-diagram-contrast.css",
  "/assets/math-course-data.js",
  "/assets/math-course-data-15-16.js",
  "/assets/math-course-data-17-18.js",
  "/assets/math-review-data.js",
  "/assets/math-review-data-15-16.js",
  "/assets/math-review-data-17-18.js",
  "/assets/math-diagrams.js",
  "/assets/progress-resilience.js",
  "/assets/math-core.js",
  "/assets/math-learn.js",
  "/assets/math-practice.js",
  "/assets/math-ai.js",
  "/assets/math-home-upgrade.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requests = CORE_ASSETS.map((url) => new Request(url, { cache: "reload" }));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function cacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "default");
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (cacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const url = new URL(request.url);
    if (url.pathname.includes("math-learn")) return cache.match("/math-learn.html");
    if (url.pathname.includes("math-practice")) return cache.match("/math-practice.html");
    return cache.match("/index.html");
  } finally {
    clearTimeout(timer);
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const fresh = fetch(request).then(async (response) => {
    if (cacheable(response)) await cache.put(request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(fresh.catch(() => null));
    return cached;
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET"
    || url.origin !== self.location.origin
    || url.pathname.startsWith("/api/")
    || url.pathname.startsWith("/.netlify/functions/")
  ) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    CORE_ASSETS.includes(url.pathname)
    || /\.(?:js|css|svg|png|jpe?g|webp|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
