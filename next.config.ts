import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Coolify / Docker standalone image
  output: "standalone",
};

export default nextConfig;
