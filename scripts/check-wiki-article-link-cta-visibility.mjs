import { readFileSync } from "node:fs";

const page = readFileSync("app/wiki/[slug]/page.tsx", "utf8");
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

function ruleBody(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? "";
}

const inlineRule = ruleBody(".inlineArticleLink");
const inlineHoverRule = ruleBody(".inlineArticleLink:hover");
const inlineFocusRule = ruleBody(".inlineArticleLink:focus-visible");
const ctaRule = ruleBody(".wikiArticleCta");
const scopedCtaRule = ruleBody(".sideCard .wikiArticleCta");
const ctaVisitedRule = ruleBody(".sideCard .wikiArticleCta:visited");
const ctaHoverRule = ruleBody(".sideCard .wikiArticleCta:hover");
const ctaFocusRule = ruleBody(".sideCard .wikiArticleCta:focus-visible");

requireText(
  "Wiki inline link renderer",
  page,
  "className={styles.inlineArticleLink}",
);
requireText("Wiki inline link", inlineRule, "color: #1e40af;");
requireText(
  "Wiki inline link",
  inlineRule,
  "text-decoration-line: underline;",
);
requireText(
  "Wiki inline link",
  inlineRule,
  "text-decoration-thickness: 1px;",
);
requireText("Wiki inline link", inlineRule, "text-underline-offset: 3px;");
requireText(
  "Wiki inline link hover",
  inlineHoverRule,
  "text-decoration-thickness: 2px;",
);
requireText("Wiki inline link focus", inlineFocusRule, "outline:");
requireText("Wiki inline link focus", inlineFocusRule, "outline-offset:");

requireText(
  "Wiki article CTA renderer",
  page,
  "className={`${styles.primaryButton} ${styles.wikiArticleCta}`}",
);
requireText("Wiki article CTA", ctaRule, "color: #ffffff;");
requireText("Wiki article CTA", ctaRule, "background: #1e3a8a;");
requireText("Wiki article CTA", ctaRule, "font-weight: 600;");
requireText("Wiki article CTA scoped cascade", scopedCtaRule, "color: #ffffff;");
requireText("Wiki article CTA visited", ctaVisitedRule, "color: #ffffff;");
requireText("Wiki article CTA hover", ctaHoverRule, "color: #ffffff;");
requireText("Wiki article CTA hover", ctaHoverRule, "background: #1e40af;");
requireText("Wiki article CTA focus", ctaFocusRule, "color: #ffffff;");
requireText("Wiki article CTA focus", ctaFocusRule, "outline:");
requireText("Wiki article CTA focus", ctaFocusRule, "outline-offset:");

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
console.log("- contextual article links use a scoped visible link treatment");
console.log("- the Wiki article sidebar CTA has active hover and focus styling");
