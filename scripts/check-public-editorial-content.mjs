import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const hashes = {
  "00-README.md": "AAAA9D512E66D3AFCDD767C6EB9C5210321BCE765833AF97F8AA6CC3CFA24EE7",
  "01-keyword-map.md": "3D4C2977B0DE83D22B5B6EC3C40066B984521CF1D438D2BA2B95A3EF59CBC41E",
  "02-internal-link-map.md": "C2C4C5A6A971DEBBD33FEF8715B61112EA4C5E0D6DAD007A33DAEF2CC1315BE7",
  "03-homepage.md": "C25397373A5511F917C7587F5A15007397C2516DBB28B6401A5BED315D3F393D",
  "04-chart.md": "5F5F88C87B02F87FAE7D9B6B4B4C2C5F523688492C89B070A74FEB648AFED915",
  "05-compare.md": "632FF2F028CFC16DC61CB720DF98622AD67F7FBB760DC8E5A5FDF234139F2AF7",
  "06-sky.md": "5091527548E38598D3AB06F45080A89797762114E4FD6A789303298E42C7DB4B",
  "07-product.md": "B00B6548FB3E683C36ECCE709090B2628C8DC112DE2BFE6543A87C170E393DD2",
  "08-pricing.md": "D5496B2131FA0B03401B4783EE30F94FA9FDC4B74AEA7721AA030A9E14A7C713",
  "09-order.md": "AF5151CF857B5BA078A7AB594A753E4E98CE93C1C5E6A338AB7199F34ED4E4CF",
  "10-privacy.md": "180273FD8440C9B72DA5CC7DB09024ED9DEC4494B95ADB6744AF1E7798887504",
  "11-implementation-checklist.md": "C890EB68A15FF1B4F226EA2305F7D670C39555EF335D94D532A0B1EAC0DFEADD",
};

for (const [filename, expected] of Object.entries(hashes)) {
  const actual = createHash("sha256")
    .update(read(`content/public-editorial-final/${filename}`))
    .digest("hex")
    .toUpperCase();
  assert.equal(
    actual,
    expected,
    `${filename} differs from the supplied reviewed package`,
  );
}

const generated = JSON.parse(
  read("lib/public-content/final-editorial-content.generated.json"),
);

const expectedSections = {
  home: 10,
  chart: 12,
  compare: 12,
  sky: 13,
  product: 12,
  pricing: 7,
  order: 6,
  privacy: 12,
};

for (const [page, count] of Object.entries(expectedSections)) {
  assert.equal(
    generated[page].sections.length,
    count,
    `${page} does not contain every reviewed section`,
  );

  const route =
    page === "home"
      ? read("app/page.tsx")
      : read(`app/${page}/page.tsx`) +
        (page === "chart" ? read("app/chart/layout.tsx") : "");

  if (page === "home") {
    assert.ok(
      route.includes(
        'data-editorial-source="reviewed-public-editorial-home"',
      ),
      "home is not connected to the reviewed Homepage source",
    );

    for (const marker of [
      "HomepageLiveSky",
      "HomepageProductProof",
      "HomeHowItWorks",
      "getPublicWikiCatalog",
      "sortPublicWikiArticlesNewestFirst",
    ]) {
      assert.ok(
        route.includes(marker),
        `Dedicated Homepage is missing reviewed integration marker: ${marker}`,
      );
    }

    assert.ok(
      !route.includes("FinalEditorialPage"),
      "Homepage must use its dedicated product composition rather than the shared editorial renderer",
    );
  } else if (page === "chart") {
    for (const marker of [
      'getFinalEditorialPage("chart")',
      'data-editorial-source="reviewed-public-editorial-chart"',
      "ChartForm",
      "chart-shell.module.css",
      "getPublicWikiCatalog",
      "sortPublicWikiArticlesNewestFirst",
    ]) {
      assert.ok(
        route.includes(marker),
        `Dedicated Chart page is missing reviewed integration marker: ${marker}`,
      );
    }

    assert.ok(
      !route.includes('from "@/components/FinalEditorialPage"') &&
        !route.includes("<FinalEditorialPage"),
      "Chart must use its dedicated product composition rather than the shared editorial renderer",
    );
  } else if (["product", "pricing", "order"].includes(page)) {
    const componentName = page === "product" ? "ProductCommerceSurface" : page === "pricing" ? "PricingCommerceSurface" : "OrderCommerceSurface";
    assert.ok(route.includes(componentName), page + " is missing its dedicated commerce composition");
    assert.ok(!route.includes("<FinalEditorialPage"), "Dedicated commerce surfaces must supersede the shared editorial renderer");
  } else {
    assert.ok(
      route.includes('pageKey="' + page + '"'),
      page + " is not connected to the reviewed package source",
    );
  }
}

const renderer = read("components/FinalEditorialPage.tsx");
assert.ok(
  renderer.includes("hasUnresolvedPlaceholder"),
  "Production placeholder filtering is missing",
);
assert.ok(
  renderer.includes("FinalEditorialSectionView"),
  "Reviewed sections are not rendered through the canonical renderer",
);

const chartPage = read("app/chart/page.tsx");
const chartForm = read("components/ChartForm.tsx");
const iranCities = read("lib/locations/iran-cities.ts");
const chartStyles = read("app/chart/chart-shell.module.css");
const appShellStyles = read("components/app-shell.module.css");
const homeStyles = read("app/home.module.css");
const sharedEditorialStyles = read(
  "components/final-editorial.module.css",
);
const wikiStyles = read("app/wiki/wiki.module.css");

for (const marker of [
  "halleus-chart-refinement-v2",
  "heroAtmosphere",
  "reportStrip",
  "supportGroup",
  "linksForSection",
  "isTechnicalCopy",
  "humanizeText",
  'href="#chart-birth-data-form"',
]) {
  assert.ok(
    chartPage.includes(marker),
    `Dedicated Chart refinement is missing marker: ${marker}`,
  );
}

assert.ok(
  !chartPage.includes('href="/chart"'),
  "Chart contains a redundant self-link instead of a useful anchor or destination",
);

assert.ok(
  !chartPage.includes("previewPanel") &&
    chartPage.includes("reportStripItems") &&
    chartPage.includes("supportGroups.map((group)"),
  "Chart must use the centered form, horizontal report strip, and collapsed FAQ composition",
);

for (const marker of [
  "chart-generation-overlay",
  'aria-modal="true"',
  "chart-generation-symbol",
  "گزارشت در حال ساخته‌شدن است",
  "گزارشت آماده شد",
  "برگشت به فرم",
  "chart-form-progress",
  "chartProgress",
  'symbol-transparent-black.png',
  'toLocaleString("fa-IR")',
]) {
  assert.ok(
    chartForm.includes(marker),
    `Chart loading-dialog contract is missing marker: ${marker}`,
  );
}

assert.ok(
  !chartForm.includes("chart-journey-notification") &&
    chartForm.includes('aria-required="true"'),
  "The old loading notification remains or the required-name contract is missing",
);

for (const marker of [
  "submitLogoSpin 0.96s linear infinite",
  "width: 136px !important",
  "color-scheme: dark !important",
  "chart-modern-form-motion-v3",
  "chart-centered-modern-v4",
  ".reportStrip",
  "width: min(780px, 100%)",
  "background: #dceeff !important",
  ".birth-date-picker-grid",
  ".birth-time-picker-grid",
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "@media (prefers-reduced-motion: reduce)",
]) {
  assert.ok(
    chartStyles.includes(marker),
    `Chart form or motion styling is missing marker: ${marker}`,
  );
}

assert.ok(
  appShellStyles.includes(
    "--halleus-public-h1-size: clamp(1.5rem, 2.35vw, 1.95rem);",
  ) &&
    appShellStyles.includes(
      "--halleus-public-h1-line-height: 1.6;",
    ),
  "The public H1 size contract is missing",
);

for (const [label, source] of [
  ["Homepage", homeStyles],
  ["Chart", chartStyles],
  ["Shared editorial pages", sharedEditorialStyles],
  ["Wiki", wikiStyles],
]) {
  assert.ok(
    /var\(\s*--halleus-public-h1-size/.test(source),
    `${label} does not use the shared public H1 size`,
  );
}

assert.ok(
  appShellStyles.includes(
    ".nav :global(.site-nav-links .nav-link)",
  ) &&
    appShellStyles.includes("color: #ffffff !important;") &&
    appShellStyles.includes(
      "-webkit-text-fill-color: #ffffff !important;",
    ),
  "Dark header navigation does not force readable white text",
);

const homepage = read("app/page.tsx");
assert.ok(
  homepage.includes("heroAtmosphere") &&
    homepage.includes("heroPlanet"),
  "The dedicated Homepage planet hero is missing",
);
assert.ok(
  homepage.includes("halleus-soft-app"),
  "The restored Homepage theme contract is missing",
);
assert.ok(
  homepage.includes("HomepageLiveSky"),
  "Homepage Sky must use its real source-of-truth component",
);
assert.ok(
  read("app/sky/page.tsx").includes("deliverSkyPublicSnapshot"),
  "Sky must use real delivery data",
);
assert.ok(
  read("app/order/page.tsx").includes("PremiumRequestForm"),
  "Order must retain the real request form",
);
assert.ok(
  read("app/privacy/page.tsx").includes(
    "AnalyticsPreferencesLink",
  ),
  "Privacy must retain real analytics controls",
);

const compareBoundary =
  read("app/compare/layout.tsx") +
  read("app/compare/[comparisonId]/layout.tsx");

assert.ok(
  compareBoundary.includes("noarchive: true") &&
    compareBoundary.includes("nosnippet: true"),
  "Private Compare metadata boundary is missing",
);


assert.ok(
  chartPage.includes("ساخت چارت تولد آنلاین") &&
    chartPage.includes("پرسش‌های رایج درباره محاسبه و تفسیر چارت تولد") &&
    chartPage.includes("در تفسیر چارت تولد چه می‌بینی؟") &&
    !chartPage.includes("سه بخش اصلی، بدون شلوغی اضافه"),
  "Chart SEO copy is incomplete or demo-style copy remains",
);

for (const marker of [
  "function ChartSelect(",
  'className="chart-select-trigger"',
  'className="chart-select-options"',
  "filterIranCities",
  'onKeyDown={(event) =>',
]) {
  assert.ok(
    chartForm.includes(marker),
    `Chart polished-control contract is missing marker: ${marker}`,
  );
}

assert.ok(
  !chartForm.includes('className="chart-required-label"') &&
    chartForm.includes('aria-required="true"'),
  "Name must remain required without a visible required badge",
);

for (const marker of [
  "chart-product-ready-controls-v4",
  ".chart-select-options::-webkit-scrollbar",
  "inset: 0 0 0 auto !important",
  ".supportSectionCopy p",
  "color: #f4f7fb !important",
]) {
  assert.ok(
    chartStyles.includes(marker),
    `Chart final visual polish is missing marker: ${marker}`,
  );
}

assert.ok(
  iranCities.includes("export function filterIranCities") &&
    iranCities.includes("cityName === normalizedValue") &&
    iranCities.includes("city.faName === city.provinceFaName") &&
    iranCities.includes(
      "const scoreDifference = left.score - right.score",
    ),
  "Iran city ranking or province-capital display contract is missing",
);

console.log("Final public editorial content check passed.");
console.log(
  "- all 12 supplied Markdown files match their exact package hashes",
);
console.log(
  "- all 84 reviewed public sections remain generated and connected",
);
console.log(
  "- Homepage and Chart use dedicated product compositions with real data sources",
);
console.log(
  "- Chart uses a centered form, compact report strip, collapsed FAQ, and Persian user-facing copy",
);
console.log(
  "- the public H1 contract and white dark-header navigation are enforced",
);
console.log(
  "- dynamic request, privacy, and private Compare boundaries remain real",
);
