import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const ts = require("typescript");

const failures = [];
const chartPath = "components/ChartForm.tsx";
const cssPath = "app/chart/chart-shell.module.css";

const chartSource = readFileSync(chartPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");
const file = ts.createSourceFile(
  chartPath,
  chartSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function tagNameText(tagName) {
  if (ts.isIdentifier(tagName)) {
    return tagName.text;
  }

  return tagName.getText();
}

function opening(node) {
  if (ts.isJsxElement(node)) {
    return node.openingElement;
  }

  if (ts.isJsxSelfClosingElement(node)) {
    return node;
  }

  return null;
}

function getAttribute(nodeOpening, name) {
  for (const property of nodeOpening.attributes.properties) {
    if (
      ts.isJsxAttribute(property) &&
      property.name.text === name
    ) {
      return property;
    }
  }

  return null;
}

function getLiteralAttribute(nodeOpening, name) {
  const attribute = getAttribute(nodeOpening, name);

  if (
    !attribute ||
    !attribute.initializer ||
    !ts.isStringLiteral(attribute.initializer)
  ) {
    return null;
  }

  return attribute.initializer.text;
}

function hasClass(node, token) {
  const nodeOpening = opening(node);

  if (!nodeOpening) {
    return false;
  }

  const className = getLiteralAttribute(nodeOpening, "className");
  return className?.split(/\s+/u).includes(token) ?? false;
}

function findNodes(root, predicate) {
  const matches = [];

  function visit(node) {
    if (
      (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
      predicate(node)
    ) {
      matches.push(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(root);
  return matches;
}

const chartFieldsNodes = findNodes(
  file,
  (node) => ts.isJsxElement(node) && hasClass(node, "chart-form-fields"),
);

if (chartFieldsNodes.length !== 1) {
  failures.push(
    `Expected one chart-form-fields element; found ${chartFieldsNodes.length}.`,
  );
}

const chartFields = chartFieldsNodes[0] ?? null;
const cityCards = chartFields
  ? findNodes(
      chartFields,
      (node) =>
        ts.isJsxElement(node) &&
        hasClass(node, "chart-city-card"),
    ).filter((node) => node.parent === chartFields)
  : [];

if (cityCards.length !== 2) {
  failures.push(
    `Expected two direct city cards; found ${cityCards.length}.`,
  );
}

for (const card of cityCards) {
  if (hasClass(card, "chart-field-full")) {
    failures.push("A city card still has chart-field-full.");
  }
}

const birthButtons = chartFields
  ? findNodes(
      chartFields,
      (node) =>
        ts.isJsxElement(node) &&
        tagNameText(node.openingElement.tagName) === "button" &&
        node
          .getText(file)
          .includes('updateField("birthCity", city.faName)'),
    )
  : [];

const currentButtons = chartFields
  ? findNodes(
      chartFields,
      (node) =>
        ts.isJsxElement(node) &&
        tagNameText(node.openingElement.tagName) === "button" &&
        node
          .getText(file)
          .includes("updateCurrentResidenceCity(city.faName)"),
    )
  : [];

for (const [label, nodes] of [
  ["birth", birthButtons],
  ["current residence", currentButtons],
]) {
  if (nodes.length !== 1) {
    failures.push(
      `Expected one ${label} mapped suggestion button; found ${nodes.length}.`,
    );
    continue;
  }

  const nodeOpening = nodes[0].openingElement;

  if (
    getLiteralAttribute(nodeOpening, "className") !==
      "city-suggestion-chip" ||
    !getAttribute(nodeOpening, "data-selected") ||
    !getAttribute(nodeOpening, "aria-pressed")
  ) {
    failures.push(
      `${label} suggestion button lacks class, selected data, or aria-pressed.`,
    );
  }
}

for (const marker of [
  "function isSelectedCityValue(",
  "isSelectedCityValue(form.birthCity, city)",
  "isSelectedCityValue(currentResidenceCity, city)",
  "makeFaLabel([1576,1585,1575,1740,32,1605,1581,1575,1587,1576,1607,8204,1740,32,1578,1585,1606,1586,1740,1578,32,1585,1608,1586,1575,1606,1607,1548,32,1588,1607,1585,32,1605,1581,1604,32,1586,1606,1583,1711,1740,32,1601,1593,1604,1740,32,1585,1575,32,1608,1575,1585,1583,32,1705,1606,32,1608,32,1575,1586,32,1662,1740,1588,1606,1607,1575,1583,1607,1575,32,1575,1606,1578,1582,1575,1576,32,1705,1606,46])",
  "currentResidenceCity: selectedCurrentResidenceCity.faName",
  "currentResidenceLatitude: selectedCurrentResidenceCity.latitude",
  "currentResidenceLongitude: selectedCurrentResidenceCity.longitude",
  "currentResidenceTimezone: selectedCurrentResidenceCity.timezone",
  "currentResidencePlaceName: normalizedForm.currentResidenceCity",
  "saveGeneratedReportWithAccountFallback(nextReport)",
  "<SupabaseAuthPanel compact />",
]) {
  if (!chartSource.includes(marker)) {
    failures.push(`ChartForm missing required marker: ${marker}`);
  }
}

for (const forbidden of [
  'className="chart-field chart-field-full chart-city-field"',
  'className="form-field"',
]) {
  if (chartSource.includes(forbidden)) {
    failures.push(`ChartForm retains old city layout marker: ${forbidden}`);
  }
}

for (const marker of [
  "/* v0.1.301 chart city pair UX */",
  ":global(.chart-form-fields)",
  ":global(.chart-city-card)",
  ':global(.city-suggestion-chip[data-selected="true"])',
  "grid-template-columns: repeat(2, minmax(0, 1fr))",
  "@media (max-width: 760px)",
]) {
  if (!cssSource.includes(marker)) {
    failures.push(`Chart CSS missing city UX marker: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error("Chart city-pair UX check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Chart city-pair UX check passed.");
console.log("- birth city and current residence share the desktop grid");
console.log("- current residence explains daily transit usage");
console.log("- selected suggestions have visual and accessible state");
console.log("- transit payload, submit flow, and account panel are preserved");
