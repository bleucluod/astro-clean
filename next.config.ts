import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep Wiki prerendering stable across local and release builds.
    cpus: 2,
  },
  async redirects() {
    return [
      {
        source: "/wiki/pluto-in-twelve-houses",
        destination: "/wiki/pluto-in-houses",
        statusCode: 301,
      },
      {
        source: "/wiki/bts-members-birth-chart",
        destination: "/wiki/bts-members-birth-dates-zodiac",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
