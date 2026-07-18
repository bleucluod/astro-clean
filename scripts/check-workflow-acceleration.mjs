import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCheckPlan, loadImpactRegistry } from "./halleus-check-plan.mjs";
import {
  createPnpmInvocation,
  formatDuration,
  getPnpmExecutable,
} from "./halleus-verify.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function requirePlan(label, plan, predicate, message) {
  if (!predicate(plan)) failures.push(`${label}: ${message}`);
}

const registry = loadImpactRegistry();
const packageJson = JSON.parse(read("package.json"));
const packageScripts = packageJson.scripts ?? {};
const registeredGuards = new Set([
  ...registry.baseline.guards,
  ...registry.fallback.guards,
  ...registry.areas.flatMap((area) => area.guards),
]);

for (const guard of registeredGuards) {
  if (typeof packageScripts[guard] !== "string" || packageScripts[guard].trim().length === 0) {
    failures.push(`registry guard has no package script: ${guard}`);
  }
}

const commandMarkers = {
  "check:plan": "scripts/halleus-check-plan.mjs",
  verify: "scripts/halleus-verify.mjs",
  "check:workflow-acceleration": "scripts/check-workflow-acceleration.mjs",
  "check:wiki-content-foundation": "scripts/check-wiki-content-foundation.mjs",
};

for (const [command, marker] of Object.entries(commandMarkers)) {
  if (!packageScripts[command]?.includes(marker)) {
    failures.push(`package command ${command} does not invoke ${marker}`);
  }
}

const docsPlan = createCheckPlan(["docs/example.md"], registry);
requirePlan("docs-only", docsPlan, (plan) => !plan.lint && !plan.build, "must skip lint and build");

const runtimePlan = createCheckPlan(["app/example/page.tsx"], registry);
requirePlan("runtime", runtimePlan, (plan) => plan.lint && plan.build, "must require lint and build");

const authPlan = createCheckPlan(["components/SupabaseAuthPanel.tsx"], registry);
requirePlan(
  "auth UI",
  authPlan,
  (plan) => plan.guards.includes("check:auth-readiness"),
  "must include check:auth-readiness",
);

const reportWheelPlan = createCheckPlan(["components/ReportBirthChartWheel.tsx"], registry);
for (const guard of ["check:report-quality", "check:report-birth-chart-wheel"]) {
  requirePlan("report wheel", reportWheelPlan, (plan) => plan.guards.includes(guard), `must include ${guard}`);
}

const wikiPlan = createCheckPlan(["app/wiki/page.tsx"], registry);
for (const guard of ["check:wiki-content-foundation", "check:wiki-storage-public-read", "check:full-wiki-cms"]) {
  requirePlan("Wiki public surface", wikiPlan, (plan) => plan.guards.includes(guard), `must include ${guard}`);
}
requirePlan(
  "Wiki public surface",
  wikiPlan,
  (plan) => plan.files[0]?.exclusive && plan.files[0]?.areas.includes("wiki-public-surface"),
  "must use the focused exclusive public-surface policy",
);
requirePlan(
  "Wiki public surface",
  wikiPlan,
  (plan) => !plan.guards.includes("check:wiki-bulk-actions-ui"),
  "must not run unrelated Wiki admin guards",
);

const wikiAdminPlan = createCheckPlan(["components/admin/WikiAdminPanel.tsx"], registry);
for (const guard of [
  "check:secure-admin-core",
  "check:full-wiki-cms",
  "check:wiki-bulk-actions-ui",
  "check:wiki-queue-operations",
]) {
  requirePlan("Wiki admin UI", wikiAdminPlan, (plan) => plan.guards.includes(guard), `must include ${guard}`);
}
requirePlan(
  "Wiki admin UI",
  wikiAdminPlan,
  (plan) => !plan.guards.includes("check:wiki-storage-public-read"),
  "must not run unrelated public-read guards",
);

const wikiGuardPlan = createCheckPlan(["scripts/check-wiki-queue-operations.mjs"], registry);
requirePlan(
  "Wiki guard tooling",
  wikiGuardPlan,
  (plan) =>
    plan.files[0]?.exclusive &&
    plan.guards.includes("check:wiki-queue-operations") &&
    !plan.guards.includes("check:wiki-bulk-scheduling") &&
    !plan.lint &&
    !plan.build,
  "must self-verify without running the full Wiki guard set, lint, or build",
);

const workflowCorePlan = createCheckPlan(["scripts/halleus-verify.mjs"], registry);
requirePlan(
  "workflow core",
  workflowCorePlan,
  (plan) =>
    plan.files[0]?.exclusive &&
    plan.guards.includes("check:workflow") &&
    !plan.lint &&
    !plan.build,
  "must run focused workflow guards without lint or build",
);

const releaseGuardPlan = createCheckPlan(["scripts/check-vps-release-workflow.mjs"], registry);
requirePlan(
  "release guard tooling",
  releaseGuardPlan,
  (plan) =>
    plan.files[0]?.exclusive &&
    plan.guards.includes("check:vps-release-workflow") &&
    !plan.lint &&
    !plan.build,
  "must run only the focused release guard without lint or build",
);

const unknownPlan = createCheckPlan(["future/unknown.runtime"], registry);
requirePlan(
  "unknown path",
  unknownPlan,
  (plan) => plan.files[0]?.unknown && plan.lint && plan.build,
  "must use fail-safe lint and build",
);
for (const guard of registry.baseline.guards) {
  requirePlan("unknown path", unknownPlan, (plan) => plan.guards.includes(guard), `must include ${guard}`);
}

if (formatDuration(0.2) !== "<1 ms") {
  failures.push("verification timing does not format sub-millisecond durations");
}
if (formatDuration(1250) !== "1.25 s") {
  failures.push("verification timing does not format second-scale durations");
}
try {
  formatDuration(-1);
  failures.push("verification timing accepted a negative duration");
} catch {
  // expected
}

if (getPnpmExecutable("win32") !== "pnpm.cmd") {
  failures.push("Windows verification does not select pnpm.cmd");
}
const windowsInvocation = createPnpmInvocation("lint", "win32", {
  ComSpec: "C:\\Windows\\System32\\cmd.exe",
});
if (
  windowsInvocation.command !== "C:\\Windows\\System32\\cmd.exe" ||
  windowsInvocation.args.at(-1) !== "pnpm.cmd run lint"
) {
  failures.push("Windows verification does not use an explicit safe pnpm.cmd invocation");
}

const verifierSource = read("scripts/halleus-verify.mjs");
for (const marker of ["performance.now()", "Verification timing:", "Total verification time:"]) {
  if (!verifierSource.includes(marker)) {
    failures.push(`shared verifier is missing timing marker: ${marker}`);
  }
}

const workflow = read(".github/workflows/halleus-verify.yml");
for (const marker of ["pull_request:", "pnpm run verify", "--base", "--head"]) {
  if (!workflow.includes(marker)) failures.push(`PR workflow is missing marker: ${marker}`);
}

const attributes = read(".gitattributes");
if (!/^\*\s+text=auto\s+eol=lf$/m.test(attributes)) {
  failures.push(".gitattributes does not pin repository text to LF by default");
}
if (!/^\*\.mjs\s+text\s+eol=lf$/m.test(attributes)) {
  failures.push(".gitattributes does not pin MJS files to LF");
}
if (!/^\*\.cmd\s+text\s+eol=crlf$/m.test(attributes)) {
  failures.push(".gitattributes does not pin CMD files to CRLF");
}

const editorConfig = read(".editorconfig");
if (!/^charset\s*=\s*utf-8$/m.test(editorConfig) || !/^end_of_line\s*=\s*lf$/m.test(editorConfig)) {
  failures.push(".editorconfig does not establish UTF-8 and LF defaults");
}
if (!/\[\*\.\{bat,cmd,ps1\}\][\s\S]*?end_of_line\s*=\s*crlf/m.test(editorConfig)) {
  failures.push(".editorconfig does not establish CRLF for Windows command files");
}

if (failures.length > 0) {
  console.error("Workflow acceleration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workflow acceleration check passed.");
console.log("- exclusive impact areas narrow focused Wiki, workflow, and release-guard changes");
console.log("- one shared registry still drives local and PR verification");
console.log("- guard timing is recorded and Windows uses the centralized pnpm.cmd invocation");
console.log("- unknown paths remain fail-safe");
