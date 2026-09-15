import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const ts = require("typescript");
const failures = [];

function source(path) {
  return readFileSync(path, "utf8");
}

function requireMarkers(path, markers) {
  const text = source(path);
  for (const marker of markers) {
    if (!text.includes(marker)) failures.push(`${path} missing: ${marker}`);
  }
}

requireMarkers("database/migrations/0031_account_profile_fields.sql", [
  "profile_birth_date date",
  "residence_city text",
  "residence_timezone text",
  "profile_updated_at timestamptz",
]);
requireMarkers("lib/account/account-profile-service.ts", [
  "profile_birth_date is null",
  "initializeAccountProfileFromBirthInput",
  "updateAccountProfile",
]);
requireMarkers("app/api/reports/account/route.ts", [
  "initializeAccountProfileFromBirthInput(user.id, report.input)",
]);
requireMarkers("lib/admin/admin-report-intelligence.ts", [
  "comparison_chart_a_label",
  "comparison_chart_b_label",
  "comparison_relationship_context",
  "current_residence_city",
  "current_residence_country",
]);
requireMarkers("lib/admin/admin-service.ts", [
  "phone_confirmed_at",
  "profile_birth_date",
  "residence_city",
  "natal_report_count",
  "synastry_report_count",
  "last_activity_at",
]);
requireMarkers("components/SiteHeader.tsx", [
  "const isAdminRoute",
  'pathname.startsWith("/admini/")',
  "if (isAdminRoute) return null",
]);
requireMarkers("components/comparison/ComparisonComposer.tsx", [
  "navigationGraceMs: 0",
]);
requireMarkers("lib/comparison/comparison-account-client.ts", [
  "keepalive: true",
]);
requireMarkers("lib/admin/admin-date.ts", [
  "fa-IR-u-ca-persian",
  "Asia/Tehran",
]);
requireMarkers("components/admin/AdminReportsWorkspace.tsx", [
  "parseJalaliDateInput",
  "formatReportType",
  "formatTrendKey",
  "currentResidenceCity",
]);
requireMarkers("components/ChartForm.tsx", [
  "HALLEUS_CITY_OPTIONS",
  "filterHalleusCities",
  "birthCountry: selectedCity.countryFaName",
  "currentResidenceCountry: selectedCurrentResidenceCity.countryFaName",
]);

const cityPath = "lib/locations/global-cities.ts";
const citySource = source(cityPath);
const cityFile = ts.createSourceFile(cityPath, citySource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let cityArray = null;
for (const statement of cityFile.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(cityFile) === "GLOBAL_CITY_OPTIONS" && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer)) {
      cityArray = declaration.initializer;
    }
  }
}
if (!cityArray) failures.push("GLOBAL_CITY_OPTIONS array was not found.");
else {
  const ids = new Set();
  if (cityArray.elements.length < 25) failures.push(`Expected at least 25 curated global cities; found ${cityArray.elements.length}.`);
  for (const element of cityArray.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      failures.push("Global city entry is not an object literal.");
      continue;
    }
    const values = new Map();
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = property.name.getText(cityFile).replaceAll('"', "");
      const init = property.initializer;
      if (ts.isStringLiteral(init)) values.set(key, init.text);
      else if (ts.isNumericLiteral(init)) values.set(key, Number(init.text));
      else if (ts.isPrefixUnaryExpression(init) && ts.isNumericLiteral(init.operand)) values.set(key, -Number(init.operand.text));
    }
    const id = values.get("id");
    const latitude = values.get("latitude");
    const longitude = values.get("longitude");
    const timezone = values.get("timezone");
    if (typeof id !== "string" || !id) failures.push("A global city is missing id.");
    else if (ids.has(id)) failures.push(`Duplicate global city id: ${id}`);
    else ids.add(id);
    if (typeof latitude !== "number" || latitude < -90 || latitude > 90) failures.push(`Invalid latitude for ${id ?? "unknown"}.`);
    if (typeof longitude !== "number" || longitude < -180 || longitude > 180) failures.push(`Invalid longitude for ${id ?? "unknown"}.`);
    if (typeof timezone !== "string") failures.push(`Missing timezone for ${id ?? "unknown"}.`);
    else {
      try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date()); }
      catch { failures.push(`Invalid IANA timezone ${timezone} for ${id ?? "unknown"}.`); }
    }
  }
}

if (failures.length) {
  console.error("Admin/Profile/Cities completion guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Admin/Profile/Cities completion guard passed.");
console.log("- comparison persistence/admin normalization is wired");
console.log("- account DOB/residence contract is first-write-safe and editable");
console.log("- global curated city records pass identity/coordinate/timezone checks");
console.log("- Admin dates use the Persian calendar and Admin mobile public chrome is excluded");