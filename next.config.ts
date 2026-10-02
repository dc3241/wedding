import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Satori reads these at runtime. A joined filename is not traced into the
  // server bundle. A missing font throws; a missing website screenshot used
  // to draw the placeholder phone instead.
  outputFileTracingIncludes: {
    "/admin/content-queue": [
      "./lib/admin/content-queue/fonts/**/*",
      "./stills/public/website/**/*",
    ],
    "/api/admin/ideation/produce": [
      "./lib/admin/content-queue/fonts/**/*",
      "./stills/public/website/**/*",
    ],
  },
  experimental: {
    // Opt out of Turbopack's persisted .next cache. On this machine it has been
    // corrupting route discovery across restarts (silent 404s for real pages).
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
