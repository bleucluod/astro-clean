import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const ts = require("typescript");

const failures = [];

const chartFormPath = "components/ChartForm.tsx";
const authPanelPath = "components/SupabaseAuthPanel.tsx";
const cssPath = "app/chart/chart-shell.module.css";

const chartFormSource = readFileSync(chartFormPath, "utf8");
const authPanelSource = readFileSync(authPanelPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");

function parseTsx(path, source) {
  return ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

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

function getLiteralClassName(node) {
  const nodeOpening = opening(node);

  if (!nodeOpening) {
    return null;
  }

  const attribute = getAttribute(nodeOpening, "className");

  if (
    !attribute ||
    !attribute.initializer ||
    !ts.isStringLiteral(attribute.initializer)
  ) {
    return null;
  }

  return attribute.initializer.text;
}

function findNodes(sourceFile, predicate) {
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

  visit(sourceFile);
  return matches;
}

const chartFormFile = parseTsx(chartFormPath, chartFormSource);
const authPanelFile = parseTsx(authPanelPath, authPanelSource);

const legacyAccountNodes = findNodes(
  chartFormFile,
  (node) =>
    getLiteralClassName(node)
      ?.split(/\s+/u)
      .includes("chart-inline-account-panel") ?? false,
);

const birthForms = findNodes(
  chartFormFile,
  (node) => {
    const nodeOpening = opening(node);
    const className = getLiteralClassName(node);

    return (
      nodeOpening !== null &&
      tagNameText(nodeOpening.tagName) === "form" &&
      className?.split(/\s+/u).includes("chart-reference-form")
    );
  },
);

const compactPanels = findNodes(
  chartFormFile,
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    tagNameText(node.tagName) === "SupabaseAuthPanel" &&
    getAttribute(node, "compact") !== null,
);

if (legacyAccountNodes.length !== 0) {
  failures.push("Legacy chart-inline-account-panel still exists.");
}

if (birthForms.length !== 1) {
  failures.push(
    `Expected one birth-data form; found ${birthForms.length}.`,
  );
}

if (compactPanels.length !== 1) {
  failures.push(
    `Expected one compact SupabaseAuthPanel; found ${compactPanels.length}.`,
  );
}

if (
  birthForms.length === 1 &&
  compactPanels.length === 1 &&
  compactPanels[0].getStart(chartFormFile) <= birthForms[0].end
) {
  failures.push(
    "Compact account panel is nested in or positioned before the closed birth form.",
  );
}

for (const removedCopy of [
  "حساب اختیاری",
  "می‌خواهی گزارش بعدی در حساب هم بماند؟",
  "بدون حساب هم گزارش ساخته",
  "این پنل اختیاری است",
]) {
  if (chartFormSource.includes(removedCopy)) {
    failures.push(`ChartForm still contains removed copy: ${removedCopy}`);
  }
}

for (const preservedChartMarker of [
  "currentResidenceSuggestions.map",
  'className="chart-form-actions"',
  "saveGeneratedReportWithAccountFallback(nextReport)",
  "router.push(",
  'fetch("/api/engine/real-chart"',
]) {
  if (!chartFormSource.includes(preservedChartMarker)) {
    failures.push(
      `ChartForm lost preserved behavior: ${preservedChartMarker}`,
    );
  }
}

const propsAliases = authPanelFile.statements.filter(
  (statement) =>
    ts.isTypeAliasDeclaration(statement) &&
    statement.name.text === "SupabaseAuthPanelProps",
);

const authFunctions = authPanelFile.statements.filter(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "SupabaseAuthPanel",
);

if (propsAliases.length !== 1) {
  failures.push(
    `Expected one SupabaseAuthPanelProps alias; found ${propsAliases.length}.`,
  );
}

if (authFunctions.length !== 1) {
  failures.push(
    `Expected one SupabaseAuthPanel function; found ${authFunctions.length}.`,
  );
} else {
  const parameterText =
    authFunctions[0].parameters[0]?.getText(authPanelFile) ?? "";

  if (
    authFunctions[0].parameters.length !== 1 ||
    !parameterText.includes("compact = false") ||
    !parameterText.includes("SupabaseAuthPanelProps")
  ) {
    failures.push(
      "SupabaseAuthPanel compact props signature is missing or malformed.",
    );
  }
}

for (const compactMarker of [
  "if (compact)",
  'className="chart-account-compact is-loading"',
  'className="chart-account-compact is-signed-in"',
  "سلام، {formatUserLabel(session)}",
  "با ثبت‌نام، گزارش‌هایت برای همیشه در حسابت ذخیره می‌شوند.",
  '<details className="chart-account-disclosure">',
  "<summary>ورود یا ثبت‌نام</summary>",
  'className="form-grid chart-account-form"',
]) {
  if (!authPanelSource.includes(compactMarker)) {
    failures.push(
      `SupabaseAuthPanel missing compact marker: ${compactMarker}`,
    );
  }
}

for (const authBehaviorMarker of [
  "const authClient = client;",
  "authClient.auth.getSession",
  "authClient.auth.onAuthStateChange",
  "client.auth.signUp",
  "client.auth.signInWithPassword",
  "client.auth.signOut",
  "validateAccountIdentityInput",
  "createSupabaseUsernameBridgeEmail",
  'auth_model: "username_password_bridge"',
  'bridge_credential_kind: "private_username_email"',
  "username_is_user_chosen: true",
  "phone_is_not_username: true",
  "email_is_secondary: true",
  'className="card"',
]) {
  if (!authPanelSource.includes(authBehaviorMarker)) {
    failures.push(
      `SupabaseAuthPanel lost auth behavior/default surface: ${authBehaviorMarker}`,
    );
  }
}

const compactStart = authPanelSource.indexOf("  if (compact) {");
const defaultReturnStatement =
  authFunctions.length === 1 && authFunctions[0].body
    ? authFunctions[0].body.statements[
        authFunctions[0].body.statements.length - 1
      ]
    : null;
const defaultReturnStart =
  defaultReturnStatement && ts.isReturnStatement(defaultReturnStatement)
    ? defaultReturnStatement.getStart(authPanelFile)
    : -1;
const compactBranch =
  compactStart >= 0 && defaultReturnStart > compactStart
    ? authPanelSource.slice(compactStart, defaultReturnStart)
    : "";

if (!compactBranch) {
  failures.push("Could not isolate the compact chart-account branch.");
}

for (const forbiddenCompactMarker of [
  "handleSignOut",
  "profile-grid",
  "home-step-list",
  "ساخت گزارش جدید",
  "دیدن گزارش‌ها",
]) {
  if (compactBranch.includes(forbiddenCompactMarker)) {
    failures.push(
      `Compact chart branch is not greeting-only for signed-in users: ${forbiddenCompactMarker}`,
    );
  }
}

for (const cssMarker of [
  "/* v0.1.300 chart compact account */",
  ":global(.chart-account-compact)",
  ":global(.chart-account-compact.is-signed-in)",
  ":global(.chart-account-greeting)",
  ":global(.chart-account-disclosure)",
  ":global(.chart-account-form.form-grid)",
]) {
  if (!cssSource.includes(cssMarker)) {
    failures.push(`Chart shell CSS missing marker: ${cssMarker}`);
  }
}

if (cssSource.includes(".chart-inline-account-panel")) {
  failures.push(
    "Phase-two CSS must not revive the removed chart-inline-account-panel.",
  );
}

if (failures.length > 0) {
  console.error("Chart account compaction check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("Chart account compaction check passed.");
console.log("- compact panel is after the closed birth-data form");
console.log("- guest UI is collapsed and signed-in UI is greeting-only");
console.log("- exact live auth/session behavior markers remain present");
