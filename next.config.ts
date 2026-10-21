import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Keep visited page segments in the client router cache so re-opening the
    // Borrow/Earn tabs is instant instead of a fresh RSC round-trip.
    staleTimes: { dynamic: 60 },
  },
  // Off so the floating badge never shows in screenshots or demo recordings.
  devIndicators: false,
  turbopack: {
    // Pin the file watcher to the repo. Without this, Next falls back to a
    // parent dir (stray pnpm-lock.yaml in the user profile), and any write
    // anywhere under the profile can trigger Fast Refresh rebuild storms
    // that stall page hydration in dev.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
