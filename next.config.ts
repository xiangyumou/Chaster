import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true, // During Phase 4-6, optimizing build speed
  },
};

export default nextConfig;
