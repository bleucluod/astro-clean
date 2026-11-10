import type { NextConfig } from "next";
import { WIKI_CANONICAL_REDIRECTS } from "./lib/wiki/wiki-canonical-redirects";

const nextConfig: NextConfig = {
  // The BitPay release build hit Next's default 60s no-progress guard during
  // published Wiki prerendering. Preserve the existing static routes and ISR.
  staticPageGenerationTimeout: 180,
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
