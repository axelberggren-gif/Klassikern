import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  // __SW_MANIFEST is injected by serwist at build time with the list of
  // precacheable assets (app shell HTML, CSS, JS chunks, etc.)
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Use the default Next.js caching strategies provided by @serwist/next:
  // - NetworkFirst for pages (HTML and RSC)
  // - StaleWhileRevalidate for static assets
  // - NetworkFirst for Next.js data requests
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
