import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "هالیوس | آسترولوژی فارسی",
    short_name: "هالیوس",
    description: "آسترولوژی فارسی برای چارت تولد، تحلیل رابطه و آسمان امروز.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/halleus-logo/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/halleus-logo/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
