import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const EXPECTED_SHA = "376538c8937ab33e9217d20cc7b277a84448294b6c05963bc2551fcd6930fafd";
const sourcePath = "content/wiki/cta-199-2026-09-12.md";
const sourceBytes = readFileSync(sourcePath);
const source = sourceBytes.toString("utf8");
const actualSha = createHash("sha256").update(sourceBytes).digest("hex");
if (actualSha !== EXPECTED_SHA) throw new Error(`CTA source checksum mismatch: ${actualSha}`);

const faToNumber = (value) => Number([...value].map((ch) => { const fa = "۰۱۲۳۴۵۶۷۸۹"; const ar = "٠١٢٣٤٥٦٧٨٩"; const fi = fa.indexOf(ch); if (fi >= 0) return String(fi); const ai = ar.indexOf(ch); if (ai >= 0) return String(ai); return ch; }).join(""));
const header = /^###\s+([۰-۹٠-٩0-9]+)\.\s+`([^`]+)`\s+→\s+`([^`]+)`(?:\s+\([^\n]*\))?(?:\s+—[^\n]*)?\s*$/gm;
const matches = [...source.matchAll(header)];
if (matches.length !== 199) throw new Error(`Expected 199 CTA blocks, found ${matches.length}`);
const rows = [];
for (let i = 0; i < matches.length; i += 1) {
  const match = matches[i];
  if (faToNumber(match[1]) !== i + 1) throw new Error(`Sequence mismatch at ${match[1]}`);
  const start = match.index + match[0].length + 1;
  const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
  const body = source.slice(start, end).replace(/^\n+|\n+$/g, "");
  const fields = new Map();
  for (const line of body.split("\n")) for (const key of ["کارت:", "دکمهٔ کارت:", "پایان — عنوان:", "متن:", "دکمهٔ پایان:"]) if (line.startsWith(key)) fields.set(key, line.slice(key.length).trim());
  for (const key of ["پایان — عنوان:", "متن:", "دکمهٔ پایان:"]) if (!fields.get(key)) throw new Error(`Missing ${key} in ${match[2]}`);
  const hasText = fields.has("کارت:"); const hasLabel = fields.has("دکمهٔ کارت:"); if (hasText !== hasLabel) throw new Error(`Partial card in ${match[2]}`);
  rows.push({ slug: match[2], href: match[3], endTitle: fields.get("پایان — عنوان:"), endText: fields.get("متن:"), endLabel: fields.get("دکمهٔ پایان:"), mobileCard: hasText ? { text: fields.get("کارت:"), label: fields.get("دکمهٔ کارت:") } : null });
}
if (new Set(rows.map((row) => row.slug)).size !== 199) throw new Error("CTA slugs are not unique");
if (rows.filter((row) => row.mobileCard).length !== 170 || rows.filter((row) => !row.mobileCard).length !== 29) throw new Error("CTA card split is not 170/29");
const distribution = { chart: 0, compare: 0, sky: 0, wiki: 0 };
for (const row of rows) { if (row.href === "/chart") distribution.chart += 1; else if (row.href === "/compare") distribution.compare += 1; else if (row.href === "/sky") distribution.sky += 1; else if (row.href.startsWith("/wiki/")) distribution.wiki += 1; else throw new Error(`Unexpected href: ${row.href}`); }
if (JSON.stringify(distribution) !== JSON.stringify({ chart: 126, compare: 36, sky: 16, wiki: 21 })) throw new Error(`Destination split mismatch: ${JSON.stringify(distribution)}`);

const data = Object.fromEntries(rows.map((row) => [row.slug, { href: row.href, endTitle: row.endTitle, endText: row.endText, endLabel: row.endLabel, mobileCard: row.mobileCard }]));
const expectedData = `// Generated from content/wiki/cta-199-2026-09-12.md. Do not hand-edit copy.\nexport const WIKI_EDITORIAL_CTA_SOURCE_SHA256 = "${EXPECTED_SHA}";\n\nexport type WikiEditorialMobileCard = {\n  readonly text: string;\n  readonly label: string;\n};\n\nexport type WikiEditorialCta = {\n  readonly href: string;\n  readonly endTitle: string;\n  readonly endText: string;\n  readonly endLabel: string;\n  readonly mobileCard: WikiEditorialMobileCard | null;\n};\n\nexport const WIKI_EDITORIAL_CTA = ${JSON.stringify(data, null, 2)} as const satisfies Record<string, WikiEditorialCta>;\n\nexport function getWikiEditorialCta(slug: string): WikiEditorialCta | null {\n  return (WIKI_EDITORIAL_CTA as Record<string, WikiEditorialCta>)[slug] ?? null;\n}\n`;
if (readFileSync("lib/wiki/wiki-editorial-cta.ts", "utf8").replace(/\r\n/g, "\n") !== expectedData) throw new Error("Typed CTA map does not exactly match approved source");

const required = [
  ["app/wiki/[slug]/page.tsx", ["getWikiEditorialCta(article.slug)", "<WikiArticleCtaCoordinator", "mobileCard={editorialCta.mobileCard}", "rootId={WIKI_ARTICLE_BODY_ID}", 'data-wiki-editorial-reviewed={editorialCta ? "true" : undefined}']],
  ["app/wiki/[slug]/WikiArticleCtaCoordinator.tsx", ["if (!mobileCard) return null;", "<WikiEditorialMobileCta", "HALLEUS_WIKI_CTA_COORDINATOR_SSR_RUNTIME_V18"]],
  ["app/wiki/[slug]/WikiEditorialMobileCta.tsx", ["HALLEUS_WIKI_EDITORIAL_MOBILE_CTA_SSR_RUNTIME_V18", 'data-wiki-editorial-mobile-cta="true"', 'data-wiki-cta-progress="true"', 'data-wiki-cta-dismiss="true"', "{mobileCard.text}", "{mobileCard.label}", "href={href}", "hidden"]],
  ["components/AppShell.tsx", ["HALLEUS_WIKI_CTA_RUNTIME_V18", 'data-wiki-chrome-control="back-to-top"', 'const revealProgress = 0.35;', 'const visibleAttentionMs = 15000;', 'const visibleDurationMs = 8000;', 'const exitDurationMs = 240;', 'const minSafeViewportHeight = 320;', 'new IntersectionObserver', "visibilitychange", "data-wiki-card-active", "data-wiki-end-cta-in-view", "pointerdown", "focusin", "prefers-reduced-motion: reduce"]],
  ["components/app-shell.module.css", ["HALLEUS_WIKI_CTA_CHROME_COLLISION_V12", "body[data-wiki-card-active=\"true\"]", "body[data-wiki-end-cta-in-view=\"true\"]", "visibility: hidden !important;", "pointer-events: none !important;"]],
  ["components/admin/WikiAdminPanel.tsx", ["getWikiEditorialCta(draft.slug)", "متن این CTA از فایل تأییدشدهٔ CTAها می‌آید", "readOnly value={draftEditorialCta.endTitle}"]],
];
for (const [file, tokens] of required) { const text = readFileSync(file, "utf8"); for (const token of tokens) if (!text.includes(token)) throw new Error(`${file} missing ${token}`); }
const appShell = readFileSync("components/AppShell.tsx", "utf8");
if ((appShell.match(/new IntersectionObserver/g) ?? []).length !== 1) throw new Error("Reviewed AppShell runtime must own exactly one end-CTA observer");
const editorialMobile = readFileSync("app/wiki/[slug]/WikiEditorialMobileCta.tsx", "utf8");
for (const forbidden of ["line-clamp", "text-overflow: ellipsis"]) if (editorialMobile.includes(forbidden)) throw new Error(`Editorial mobile CTA contains forbidden truncation: ${forbidden}`);
const css = readFileSync("app/wiki/wiki.module.css", "utf8");
for (const token of [".editorialMobileCta[hidden]", "display: none !important;", "background: #111923;", "color: #f4f8fc;", "border: 1px solid #35516a;", "border-radius: 18px;", "box-shadow: 0 12px 32px rgba(0, 0, 0, .24);", "width: min(360px, calc(100vw - 32px));", "max-height: min(220px, 35dvh);", "background: #b9e5ff;", "color: #092235 !important;", "min-height: 48px;", "width: 44px;", "height: 44px;", "stroke: #a9dfff;", ".editorialMobileCta[data-tab-visible=\"false\"]"]) {
  if (!css.includes(token)) throw new Error(`Wiki CTA CSS missing exact contract token: ${token}`);
}
console.log("Wiki editorial CTA guard passed: 199 exact records, 170 cards, 29 no-card rows, 126/36/16/21 destinations.");