import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker on preview deployments — it caches pages/JS
  // with CacheFirst/NetworkFirst strategies that serve stale code after new
  // deployments, breaking auth and hydration on Vercel previews.
  // Only enable for production builds on the main production domain.
  disable: process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview",
});

const nextConfig: NextConfig = {
  // Allow Turbopack dev mode to work alongside serwist's webpack config
  // (serwist only adds webpack config for production builds)
  turbopack: {},
};

export default withSerwist(nextConfig);
