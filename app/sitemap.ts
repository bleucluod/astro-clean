import type { MetadataRoute } from "next";

const baseUrl = "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/chart",
    "/dashboard",
    "/reports",
    "/profile",
    "/admin",
    "/roadmap",
    "/wiki",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
