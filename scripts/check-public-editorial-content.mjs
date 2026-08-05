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
  "06-sky.md": "C065163859DB379B0D5F4F4E43C4CE6078D1B1A1D1948D608B911A31EBF504B8",
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
  assert.equal(actual, expected, `${filename} differs from the supplied reviewed package`);
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
      route.includes('data-editorial-source="reviewed-public-editorial-home"'),
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
  } else {
    assert.ok(
      route.includes(`pageKey=\"${page}\"`),
      `${page} is not connected to the reviewed package source`,
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

const homepage = read("app/page.tsx");
assert.ok(
  homepage.includes("heroAtmosphere") && homepage.includes("heroPlanet"),
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
  read("app/privacy/page.tsx").includes("AnalyticsPreferencesLink"),
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

console.log("Final public editorial content check passed.");
console.log("- all 12 supplied Markdown files match their exact package hashes");
console.log("- all 84 reviewed public sections remain generated and connected");
console.log("- Homepage uses a dedicated product composition with real Sky, report proof, and Wiki data");
console.log("- dynamic request, privacy, and private Compare boundaries remain real");
console.log("- unresolved commercial and runtime placeholders remain filtered from shared editorial routes");