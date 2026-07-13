import { readFileSync } from "node:fs";
import ts from "typescript";

const failures = [];
const sourcePath = "lib/report-generation/report-generation-service.ts";
const sourceText = readFileSync(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function findVariable(name) {
  let result;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    ) {
      result = node;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

function findFunction(name) {
  return sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === name,
  );
}

function nodeText(node) {
  return node ? sourceText.slice(node.getStart(sourceFile), node.getEnd()) : "";
}

const mappingDeclaration = findVariable("CARDINAL_ANGLE_HOUSE_BY_ID");
const expectedMapping = { asc: 1, dsc: 7, mc: 10, ic: 4 };

if (
  !mappingDeclaration ||
  !ts.isObjectLiteralExpression(mappingDeclaration.initializer)
) {
  failures.push("Missing cardinal angle house mapping object.");
} else {
  const actualMapping = {};

  for (const property of mappingDeclaration.initializer.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
      ts.isNumericLiteral(property.initializer)
    ) {
      actualMapping[property.name.text] = Number(property.initializer.text);
    }
  }

  if (JSON.stringify(actualMapping) !== JSON.stringify(expectedMapping)) {
    failures.push(
      "Cardinal angle mapping must be ASC=1, DSC=7, MC=10, IC=4.",
    );
  }
}

const angleIdsFunction = findFunction("getAngleIdsForHouse");
const angleIdsText = nodeText(angleIdsFunction);

if (!angleIdsText.includes("CARDINAL_ANGLE_HOUSE_BY_ID")) {
  failures.push("House angleIds must come from the cardinal mapping.");
}

if (angleIdsText.includes("getHouseNumberForLongitude")) {
  failures.push("House angleIds must not use generic cusp-boundary assignment.");
}

const angleHouseFunction = findFunction("getCardinalAngleHouseNumber");
const angleHouseText = nodeText(angleHouseFunction);

if (!angleHouseText.includes("CARDINAL_ANGLE_HOUSE_BY_ID[angleId]")) {
  failures.push("Angle house helper must return the cardinal mapping value.");
}

const adapterFunction = findFunction("toRealEngineReportAngle");
const adapterText = nodeText(adapterFunction);

if (!adapterText.includes("getCardinalAngleHouseNumber")) {
  failures.push("Visible angle snapshots must use the cardinal angle helper.");
}

if (adapterText.includes("getHouseNumberForLongitude")) {
  failures.push(
    "Visible angle snapshots must not use generic cusp-boundary assignment.",
  );
}

for (const marker of [
  "getHouseNumberForLongitude(placement.longitude, realChart)",
  "getHouseNumberForLongitude(node.longitude, realChart)",
  "getHouseNumberForLongitude(lilith.longitude, realChart)",
]) {
  if (!sourceText.includes(marker)) {
    failures.push(
      "Non-angle house assignment changed unexpectedly: " + marker,
    );
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const expectedCommand =
  "node scripts/check-placidus-cardinal-angle-invariant.mjs";

if (
  packageJson.scripts?.["check:placidus-cardinal-angle-invariant"] !==
  expectedCommand
) {
  failures.push("Missing focused package script.");
}

for (const aggregate of ["check:project", "check:engine"]) {
  if (
    !(packageJson.scripts?.[aggregate] ?? "").includes(
      "pnpm run check:placidus-cardinal-angle-invariant",
    )
  ) {
    failures.push(
      aggregate + " does not include the focused invariant guard.",
    );
  }
}

if (failures.length > 0) {
  console.error("Placidus cardinal angle invariant check failed:");

  for (const failure of failures) {
    console.error("- " + failure);
  }

  process.exit(1);
}

console.log("Placidus cardinal angle invariant check passed.");
console.log("- ASC is fixed to house 1");
console.log("- DSC is fixed to house 7");
console.log("- MC is fixed to house 10");
console.log("- IC is fixed to house 4");
console.log(
  "- planet, node, and Lilith house assignment still use calculated cusps",
);
