import { readFileSync } from "node:fs";

const globals = readFileSync("app/globals.css", "utf8");
const homeStyles = readFileSync("app/home.module.css", "utf8");
const wikiStyles = readFileSync("app/wiki/wiki.module.css", "utf8");
const chartStyles = readFileSync("app/chart/chart-shell.module.css", "utf8");
const failures = [];

function ruleBody(source, selector) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const flexibleSelector = selector
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const matches = [
    ...withoutComments.matchAll(
      new RegExp(`^\\s*${flexibleSelector}\\s*\\{([^{}]*)\\}`, "gm"),
    ),
  ];
  return matches.at(-1)?.[1] ?? "";
}

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

const globalLink = ruleBody(globals, "a");
const globalLinkHover = ruleBody(globals, "a:hover");
const homePrimary = ruleBody(homeStyles, ".primaryButton");
const homePrimaryStates = ruleBody(
  homeStyles,
  ".page .primaryButton, .page .primaryButton:visited, .page .primaryButton:hover, .page .primaryButton:focus-visible",
);
const wikiPrimary = ruleBody(wikiStyles, ".primaryButton");
const wikiCta = ruleBody(wikiStyles, ".wikiArticleCta");
const chartPrimary = ruleBody(chartStyles, ".discoveryPrimary");

requireText("Global text link", globalLink, "color: #3A4A5C;");
forbidText("Global text link", globalLink, "!important");
requireText("Global text link hover", globalLinkHover, "color: #243447;");
forbidText("Global text link hover", globalLinkHover, "!important");

requireText("Home primary CTA", homePrimary, "color: #fff;");
requireText("Home primary CTA states", homePrimaryStates, "color: #fff;");
requireText("Wiki primary CTA", wikiPrimary, "color: #ffffff;");
requireText("Wiki article CTA", wikiCta, "color: #ffffff;");
requireText("Chart discovery CTA", chartPrimary, "color: #ffffff;");

requireText(
  "Navigation link protection",
  globals,
  ".site-nav-links .nav-link {\n  color: #3A4A5C !important;",
);
requireText(
  "Navigation hover protection",
  globals,
  '.site-nav-links .nav-link[aria-current="page"] {\n  color: #243447 !important;',
);

if (failures.length > 0) {
  console.error("Site-wide link CTA contrast check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site-wide link CTA contrast check passed.");
console.log("- global text-link colors no longer override component CTA colors");
console.log("- dark public CTAs retain explicit light text");
console.log("- site navigation keeps its dedicated color protection");
