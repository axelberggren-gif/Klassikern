import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// Ensure Supabase API requests are NEVER cached by the service worker.
// These must always go directly to the network for auth and data freshness.
const supabaseNetworkOnly: RuntimeCaching = {
  matcher: ({ url }) => url.hostname.includes("supabase.co"),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  // __SW_MANIFEST is injected by serwist at build time with the list of
  // precacheable assets (app shell HTML, CSS, JS chunks, etc.)
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Supabase requests bypass cache entirely, then use default Next.js strategies
  // for everything else (NetworkFirst for pages, StaleWhileRevalidate for assets)
  runtimeCaching: [supabaseNetworkOnly, ...defaultCache],
});

serwist.addEventListeners();
