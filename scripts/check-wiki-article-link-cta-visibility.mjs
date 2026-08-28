import { readFileSync } from "node:fs";

const page = readFileSync("app/wiki/[slug]/page.tsx", "utf8");
const stickyCta = readFileSync("app/wiki/[slug]/WikiStickyCta.tsx", "utf8");
const renderer = readFileSync("components/wiki/WikiArticleRender.tsx", "utf8");
const styles = readFileSync("app/wiki/wiki.module.css", "utf8");
const failures = [];

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

function ruleBodies(selector) {
  const withoutComments = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    ...withoutComments.matchAll(
      new RegExp(`^\\s*${escapedSelector}\\s*\\{([^{}]*)\\}`, "gm"),
    ),
  ].map((match) => match[1] ?? "");
}

function ruleBody(selector) {
  return ruleBodies(selector).at(-1) ?? "";
}

function ruleBodyContaining(selector, marker) {
  return ruleBodies(selector).find((body) => body.includes(marker)) ?? "";
}

const inlineRule = ruleBody(".inlineArticleLink");
const inlineHoverRule = ruleBody(".inlineArticleLink:hover");
const inlineFocusRule = ruleBody(".inlineArticleLink:focus-visible");
const ctaRule = ruleBody(".wikiArticleCta");
const scopedCtaRule = ruleBody(".sideCard .wikiArticleCta");
const ctaVisitedRule = ruleBody(".sideCard .wikiArticleCta:visited");
const ctaHoverRule = ruleBody(".sideCard .wikiArticleCta:hover");
const ctaFocusRule = ruleBody(".sideCard .wikiArticleCta:focus-visible");
const stickyRule = ruleBodyContaining(".mobileStickyCta", "position: fixed;");
const stickyVisibleRule = ruleBody('.mobileStickyCta[data-visible="true"]');
const stickyLinkRule = ruleBody(".mobileStickyCtaLink");
const stickyDismissRule = ruleBody(".mobileStickyCtaDismiss");

requireText(
  "Wiki inline link renderer",
  renderer,
  "className={styles.inlineArticleLink}",
);
requireText("Wiki inline link", inlineRule, "color: var(--wiki-blue);");
requireText("Wiki inline link", inlineRule, "font-weight: 850;");
requireText("Wiki inline link", inlineRule, "text-decoration: none;");
requireText("Wiki inline link hover", inlineHoverRule, "color: #f4f6f8;");
requireText("Wiki inline link focus", inlineFocusRule, "outline:");
requireText("Wiki inline link focus", inlineFocusRule, "outline-offset:");

requireText(
  "Wiki article CTA renderer",
  page,
  "className={`${styles.primaryButton} ${styles.wikiArticleCta}`}",
);
requireText("Wiki article CTA", ctaRule, "color: #f4f6f8;");
requireText(
  "Wiki article CTA",
  ctaRule,
  "background: linear-gradient(135deg, #2b3240, #161a22);",
);
requireText("Wiki article CTA", ctaRule, "font-weight: 600;");
requireText(
  "Wiki article CTA scoped cascade",
  scopedCtaRule,
  "color: #f4f6f8 !important;",
);
requireText(
  "Wiki article CTA visited",
  ctaVisitedRule,
  "color: #f4f6f8 !important;",
);
requireText(
  "Wiki article CTA hover",
  ctaHoverRule,
  "color: #f4f6f8 !important;",
);
requireText(
  "Wiki article CTA hover",
  ctaHoverRule,
  "background: linear-gradient(135deg, #303744, #171b22);",
);
requireText(
  "Wiki article CTA focus",
  ctaFocusRule,
  "color: #f4f6f8 !important;",
);
requireText("Wiki article CTA focus", ctaFocusRule, "outline:");
requireText("Wiki article CTA focus", ctaFocusRule, "outline-offset:");

requireText(
  "Wiki sticky CTA import",
  page,
  'import { WikiStickyCta } from "./WikiStickyCta";',
);
requireText(
  "Wiki sticky CTA inline target",
  page,
  "id={WIKI_INLINE_CTA_ID}",
);
requireText(
  "Wiki sticky CTA renderer",
  page,
  "<WikiStickyCta callToAction={callToAction} inlineCtaId={WIKI_INLINE_CTA_ID} />",
);
requireText(
  "Wiki sticky CTA mobile query",
  stickyCta,
  'const MOBILE_MEDIA_QUERY = "(max-width: 720px)";',
);
requireText(
  "Wiki sticky CTA reveal threshold",
  stickyCta,
  "const REVEAL_PROGRESS = 0.25;",
);
requireText(
  "Wiki sticky CTA initial scheduling",
  stickyCta,
  "scheduleEligibilityUpdate();",
);
requireText(
  "Wiki sticky CTA inline observer",
  stickyCta,
  "new IntersectionObserver",
);
requireText(
  "Wiki sticky CTA target reuse",
  stickyCta,
  "href={callToAction.href}",
);
requireText(
  "Wiki sticky CTA label reuse",
  stickyCta,
  "{callToAction.label}",
);
requireText(
  "Wiki sticky CTA dismiss label",
  stickyCta,
  'const DISMISS_LABEL = "',
);
requireText(
  "Wiki sticky CTA dismiss control",
  stickyCta,
  "aria-label={DISMISS_LABEL}",
);

requireText("Wiki sticky CTA marker", styles, "HALLEUS_WIKI_MOBILE_STICKY_CTA");
requireText("Wiki sticky CTA mobile scope", styles, "@media (max-width: 720px)");
requireText("Wiki sticky CTA", stickyRule, "position: fixed;");
requireText(
  "Wiki sticky CTA",
  stickyRule,
  "bottom: calc(12px + env(safe-area-inset-bottom));",
);
requireText("Wiki sticky CTA hidden state", stickyRule, "pointer-events: none;");
requireText(
  "Wiki sticky CTA visible state",
  stickyVisibleRule,
  "pointer-events: auto;",
);
requireText("Wiki sticky CTA link", stickyLinkRule, "min-height: 52px;");
requireText(
  "Wiki sticky CTA link",
  stickyLinkRule,
  "color: #f4f6f8 !important;",
);
requireText("Wiki sticky CTA dismiss", stickyDismissRule, "min-width: 48px;");
requireText("Wiki sticky CTA dismiss", stickyDismissRule, "min-height: 52px;");

forbidText("Wiki article CTA", ctaRule, "opacity:");
forbidText("Wiki article CTA renderer", page, "aria-disabled");
forbidText("Wiki article CTA renderer", page, "disabled");

if (/^(?:a|\.page|\.articlePage)\s+a\b/m.test(styles)) {
  failures.push(
    "Wiki inline link styling must not target all links in the page or module.",
  );
}

if (failures.length > 0) {
  console.error("Wiki article link and CTA visibility check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki article link and CTA visibility check passed.");
console.log("- contextual article links keep the current dark Wiki treatment");
console.log("- inline Wiki CTA retains visible hover and focus styling");
console.log("- mobile sticky CTA reuses each article CTA target and label");
console.log("- sticky CTA is mobile-only, delayed, safe-area aware, and hides at the inline CTA");