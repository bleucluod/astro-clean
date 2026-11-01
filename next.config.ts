import type { NextConfig } from "next";
import { WIKI_CANONICAL_REDIRECTS } from "./lib/wiki/wiki-canonical-redirects";

const nextConfig: NextConfig = {
  experimental: {
    // Keep Wiki prerendering stable across local and release builds.
    cpus: 2,
  },
  async redirects() {
    return WIKI_CANONICAL_REDIRECTS.map(({ sourceSlug, destinationSlug }) => ({
      source: `/wiki/${sourceSlug}`,
      destination: `/wiki/${destinationSlug}`,
      statusCode: 301 as const,
    }));
  },
};

export default nextConfig;
