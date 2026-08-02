import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Opt out of Turbopack's persisted .next cache. On this machine it has been
    // corrupting route discovery across restarts (silent 404s for real pages).
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
