"use strict";

const CACHE_PREFIX = "fumi-math-static-";
const CACHE_NAME = CACHE_PREFIX + "2026-08-30-v2";
const CACHE_READ_TIMEOUT = 2000;
const CACHE_WRITE_TIMEOUT = 10000;
const BACKGROUND_UPDATE_TIMEOUT = 15000;
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

function withTimeout(promise, milliseconds, fallback) {
  let timer = 0;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function openCache() {
  try {
    return await withTimeout(caches.open(CACHE_NAME), CACHE_READ_TIMEOUT, null);
  } catch {
    return null;
  }
}

async function safeCacheMatch(cache, request, options) {
  if (!cache) return null;
  try {
    return await withTimeout(cache.match(request, options).catch(() => null), CACHE_READ_TIMEOUT, null);
  } catch {
    return null;
  }
}

function updateCache(request, response) {
  if (!response) return Promise.resolve(false);
  const update = caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .then(() => true)
    .catch(() => false);
  return withTimeout(update, CACHE_WRITE_TIMEOUT, false);
}

async function waitForNavigationBody(result) {
  if (result.response?.status >= 500 || typeof result.response?.clone !== "function") return result;
  const probe = result.response.clone();
  if (typeof probe.arrayBuffer === "function") await probe.arrayBuffer();
  return result;
}

async function navigationFallback(cache, request) {
  if (!cache) return null;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const shell = pathname === "/math-learn" || pathname === "/math-learn.html"
    ? "/math-learn.html"
    : pathname === "/math-practice" || pathname === "/math-practice.html"
      ? "/math-practice.html"
      : "/index.html";
  const candidates = [request, shell, "/index.html"];
  const matches = await Promise.all(candidates.map((candidate) => safeCacheMatch(cache, candidate, { ignoreSearch: true })));
  return matches.find(Boolean) || null;
}

function networkFirst(request, event) {
  const cachePromise = openCache();
  const networkPromise = fetch(request).then((response) => ({
    response,
    cacheCopy: cacheable(response) ? response.clone() : null
  }));
  const navigationReady = networkPromise.then(waitForNavigationBody);
  const cacheUpdate = withTimeout(
    networkPromise.then((result) => updateCache(request, result.cacheCopy)),
    BACKGROUND_UPDATE_TIMEOUT,
    false
  );
  event.waitUntil(cacheUpdate.catch(() => false));

  return (async () => {
    const first = await withTimeout(
      navigationReady.then(
        (result) => ({ kind: "network", result }),
        (error) => ({ kind: "error", error })
      ),
      5000,
      { kind: "slow" }
    );

    if (first.kind === "network" && first.result.response?.status < 500) {
      return first.result.response;
    }

    const cache = await cachePromise;
    if (first.kind === "error") {
      const fallback = await navigationFallback(cache, request).catch(() => null);
      if (fallback) return fallback;
      throw first.error;
    }

    if (first.kind === "slow") {
      const fallback = await navigationFallback(cache, request).catch(() => null);
      if (fallback) return fallback;
    }

    let result;
    try {
      result = first.kind === "network" ? first.result : await networkPromise;
    } catch {
      const fallback = await navigationFallback(cache, request).catch(() => null);
      if (fallback) return fallback;
      throw new Error("Network unavailable and no cached page is ready");
    }

    if (result.response?.status >= 500) {
      const fallback = await navigationFallback(cache, request).catch(() => null);
      if (fallback) return fallback;
    }
    return result.response;
  })();
}

function staleWhileRevalidate(request, event) {
  const cachePromise = openCache();
  const fresh = fetch(request).then((response) => ({
    response,
    cacheCopy: cacheable(response) ? response.clone() : null
  }));
  const cacheUpdate = withTimeout(
    fresh.then((result) => updateCache(request, result.cacheCopy)),
    BACKGROUND_UPDATE_TIMEOUT,
    false
  );
  event.waitUntil(cacheUpdate.catch(() => false));
  return (async () => {
    const cache = await cachePromise;
    const cached = await safeCacheMatch(cache, request);
    if (cached) return cached;
    return (await fresh).response;
  })();
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
    event.respondWith(networkFirst(request, event));
    return;
  }

  if (
    CORE_ASSETS.includes(url.pathname)
    || /\.(?:js|css|svg|png|jpe?g|webp|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
