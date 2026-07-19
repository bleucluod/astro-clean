import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep Wiki prerendering stable across local and release builds.
    cpus: 2,
  },
};

export default nextConfig;
