import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Disable the service worker in dev mode since serwist uses webpack
  // and Turbopack is the default bundler in Next.js 16 dev mode
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Allow Turbopack dev mode to work alongside serwist's webpack config
  // (serwist only adds webpack config for production builds)
  turbopack: {},
};

export default withSerwist(nextConfig);
