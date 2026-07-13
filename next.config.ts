import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Coolify / Docker standalone image
  output: "standalone",
  experimental: {
    // Dish photo uploads (multipart) via server actions / route handlers
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
