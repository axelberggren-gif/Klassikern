import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const OFFLINE_URL = "/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Offline fallback: when a navigation request fails, serve /offline page
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        // Try the network first (Serwist handles caching strategies above,
        // but this catch-all ensures we always have a fallback)
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) return preloadResponse;

        return await fetch(event.request);
      } catch {
        // Network failed — serve the offline page from cache
        const cache = await caches.open("klassikern-offline-fallback");
        const cached = await cache.match(OFFLINE_URL);
        if (cached) return cached;

        // If /offline isn't cached yet, return a minimal response
        return new Response(
          '<html><body style="background:#0a0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h1>Offline</h1><p>Ingen anslutning</p></div></body></html>',
          { headers: { "Content-Type": "text/html" } }
        );
      }
    })()
  );
});

// Cache the offline page on install so it's available immediately
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open("klassikern-offline-fallback").then((cache) => cache.add(OFFLINE_URL))
  );
});
