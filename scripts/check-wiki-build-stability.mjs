import { readFileSync } from "node:fs";
import ts from "typescript";
import { createCheckPlan, loadImpactRegistry } from "./halleus-check-plan.mjs";

const sourceText = readFileSync("next.config.ts", "utf8");
const sourceFile = ts.createSourceFile(
  "next.config.ts",
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

function objectProperty(object, name) {
  return object.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) && propertyName(property.name) === name,
  );
}

let configObject;
for (const statement of sourceFile.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === "nextConfig" &&
      declaration.initializer &&
      ts.isObjectLiteralExpression(declaration.initializer)
    ) {
      configObject = declaration.initializer;
    }
  }
}

if (!configObject) {
  throw new Error("next.config.ts must declare an object-valued nextConfig.");
}

const experimentalProperty = objectProperty(configObject, "experimental");
if (
  !experimentalProperty ||
  !ts.isObjectLiteralExpression(experimentalProperty.initializer)
) {
  throw new Error("nextConfig.experimental must be an object.");
}

const experimental = experimentalProperty.initializer;
const cpusProperty = objectProperty(experimental, "cpus");
if (
  !cpusProperty ||
  !ts.isNumericLiteral(cpusProperty.initializer) ||
  Number(cpusProperty.initializer.text) !== 2
) {
  throw new Error("Wiki build stability requires nextConfig.experimental.cpus = 2.");
}

if (objectProperty(configObject, "staticPageGenerationTimeout")) {
  throw new Error("Wiki build stability must not be implemented by extending the page timeout.");
}
if (objectProperty(experimental, "staticGenerationRetryCount")) {
  throw new Error("Wiki build stability must not be implemented by adding retry loops.");
}

const registry = loadImpactRegistry();
const configPlan = createCheckPlan(["next.config.ts"], registry);
if (
  !configPlan.files[0]?.exclusive ||
  !configPlan.files[0]?.areas.includes("wiki-build-stability") ||
  !configPlan.guards.includes("check:wiki-build-stability") ||
  !configPlan.lint ||
  !configPlan.build
) {
  throw new Error("next.config.ts is not protected by the focused build-stability plan.");
}

const guardPlan = createCheckPlan(
  ["scripts/check-wiki-build-stability.mjs"],
  registry,
);
if (
  !guardPlan.files[0]?.exclusive ||
  !guardPlan.files[0]?.areas.includes("wiki-build-stability-guard-tooling") ||
  !guardPlan.guards.includes("check:wiki-build-stability") ||
  guardPlan.lint ||
  guardPlan.build
) {
  throw new Error("The build-stability guard must self-verify without recursive lint/build.");
}

console.log("Wiki build stability check passed.");
console.log("- Next.js build workers are capped at two");
console.log("- timeout and retry inflation are not used");
console.log("- the focused impact plan requires lint and production build");
