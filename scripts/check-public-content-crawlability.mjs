import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function walkLoading(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkLoading(full, out);
    else if (ent.name === "loading.tsx") out.push(path.relative(root, full).replaceAll(path.sep, "/"));
  }
  return out;
}
for (const rel of walkLoading(path.join(root, "app"))) {
  if (rel === "app/loading.tsx" || rel.startsWith("app/wiki/") || rel.startsWith("app/reports/") || rel.startsWith("app/(public)/") || rel.startsWith("app/public/")) {
    failures.push("public or mixed route has blocking loader: " + rel);
  }
}

for (const rel of ["app/page.tsx", "app/wiki/page.tsx", "app/wiki/[slug]/page.tsx", "app/wiki/category/[categoryId]/page.tsx"]) {
  const source = read(rel);
  if (source.includes('"use client"') || source.includes("'use client'")) failures.push(rel + " is client-only");
  if (!/<h1\b/.test(source)) failures.push(rel + " lacks server-rendered H1");
}

const wikiArticle = read("app/wiki/[slug]/page.tsx");
for (const marker of ["generateStaticParams", "listPublicWikiRouteSlugs", "<h1>{article.title}</h1>", "permanentRedirect"]) {
  if (!wikiArticle.includes(marker)) failures.push("Wiki article missing marker: " + marker);
}
const chart = read("components/ChartForm.tsx");
if (!chart.includes('status: "idle"') || !chart.includes('"loading"') || !chart.includes("realEngineRequest")) {
  failures.push("ChartForm no longer exposes a local post-submit loading-state contract");
}

function hasMeta(html, key) {
  return html.includes('property="' + key + '"') || html.includes('name="' + key + '"');
}
function hasCanonical(html) {
  return /<link[^>]+rel="canonical"[^>]+href="[^"]+"/i.test(html) || /<link[^>]+href="[^"]+"[^>]+rel="canonical"/i.test(html);
}
async function fetchHtml(base, route) {
  const res = await fetch(new URL(route, base), { headers: { "user-agent": "Halleus-Batch3-Crawlability/1.0" }, redirect: "manual" });
  const html = await res.text();
  if (res.status !== 200) failures.push(route + " returned HTTP " + res.status);
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) failures.push(route + " did not return HTML");
  return html;
}
function validateHtml(route, html) {
  if (!/<h1\b/i.test(html)) failures.push(route + " initial HTML lacks H1");
  if (!hasCanonical(html)) failures.push(route + " initial HTML lacks canonical");
  for (const key of ["og:title", "og:description", "og:url", "twitter:title", "twitter:description"]) {
    if (!hasMeta(html, key)) failures.push(route + " missing " + key);
  }
  if (/name="robots"[^>]+content="[^"]*noindex/i.test(html)) failures.push(route + " unexpectedly noindex");
}
async function runtime(base) {
  const sitemapRes = await fetch(new URL("/sitemap.xml", base));
  const xml = await sitemapRes.text();
  if (!sitemapRes.ok) {
    failures.push("sitemap returned HTTP " + sitemapRes.status);
    return;
  }
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) {
    failures.push("sitemap has no loc entries");
    return;
  }
  const paths = [...new Set(locs.map((loc) => new URL(loc).pathname))];
  const forbiddenSitemap = paths.filter((route) => /^\/(?:admin|admini|reports|account|profile)(?:\/|$)/.test(route));
  if (forbiddenSitemap.length) failures.push("sitemap exposes internal routes: " + forbiddenSitemap.join(","));
  const categoryLabels = {
    planets: "\u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u0648 \u0646\u0642\u0627\u0637 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
    accuracy: "\u062f\u0642\u062a \u0633\u0627\u0639\u062a \u0648 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f",
    transits: "\u062a\u0631\u0646\u0632\u06cc\u062a \u0633\u06cc\u0627\u0631\u0627\u062a",
    aspects: "\u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u0648 \u0627\u0644\u06af\u0648\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
    foundations: "\u0622\u0645\u0648\u0632\u0634 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0627\u0632 \u0635\u0641\u0631",
    systems: "\u0627\u0646\u0648\u0627\u0639 \u0648 \u0646\u0638\u0627\u0645\u200c\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc",
    houses: "\u062e\u0627\u0646\u0647\u200c\u0647\u0627 \u0648 \u0632\u0627\u0648\u06cc\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
  };
  for (const id of Object.keys(categoryLabels)) {
    if (!paths.includes("/wiki/category/" + id)) failures.push("sitemap missing category: " + id);
  }
  for (const route of paths) {
    const html = await fetchHtml(base, route);
    validateHtml(route || "/", html);
    const categoryMatch = route.match(/^\/wiki\/category\/([a-z0-9-]+)$/);
    if (categoryMatch && categoryLabels[categoryMatch[1]] && !html.includes(categoryLabels[categoryMatch[1]])) {
      failures.push(route + " does not render the final category label");
    }
    if (/^\/wiki\/(?!category\/)[a-z0-9-]+$/.test(route)) {
      if (!html.includes('"@type":"Article"') && !html.includes('"@type": "Article"')) failures.push(route + " lacks Article JSON-LD");
      if (!html.includes('"@type":"BreadcrumbList"') && !html.includes('"@type": "BreadcrumbList"')) failures.push(route + " lacks BreadcrumbList JSON-LD");
    }
  }
}
const base = process.env.HALLEUS_CRAWL_BASE_URL?.trim();
if (base) {
  try { await runtime(base); }
  catch (error) { failures.push("runtime crawl exception: " + (error instanceof Error ? error.message : String(error))); }
}

if (failures.length) {
  console.error("Public content crawlability check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Public content crawlability check passed.");
console.log("- public and Wiki routes stay server-rendered without blocking route loaders");
console.log("- runtime mode validates the full current sitemap, canonical, robots, OG/Twitter and Wiki schema");
