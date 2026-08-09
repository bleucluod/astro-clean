import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}
function walk(relativeRoot) {
  const absolute = path.join(root, relativeRoot);
  if (!fs.existsSync(absolute)) return [];
  const results = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      results.push(...walk(relative));
    } else if (allowedExtensions.has(path.extname(entry.name))) {
      results.push(relative);
    }
  }
  return results;
}

function isUiRuntimeFile(relative, source) {
  const p = relative.replaceAll("\\", "/");
  if (p.startsWith("app/api/")) return false;
  if (p.startsWith("app/admin/")) return false;

  if (p.startsWith("app/")) return true;
  if (p.startsWith("components/")) return true;

  if (p.startsWith("src/") || p.startsWith("lib/")) {
    return (
      source.includes('"use client"') ||
      source.includes("'use client'") ||
      source.includes("router.push(") ||
      source.includes("router.replace(") ||
      source.includes("<Link ") ||
      source.includes("href=")
    );
  }
  return false;
}

const legacyLiteral = /(["'`])\/admin(?=\/|\?|#|["'`])/g;
const legacyAbsolute = /(https?:\/\/[^"'\`\s]+)\/admin(?=\/|\?|#|["'`\s])/g;

const candidates = [
  ...walk("app"),
  ...walk("components"),
  ...walk("src"),
  ...walk("lib"),
];

const failures = [];
for (const relative of [...new Set(candidates)].sort()) {
  const source = read(relative);
  if (!isUiRuntimeFile(relative, source)) continue;

  const literalMatches = source.match(legacyLiteral) ?? [];
  const absoluteMatches = source.match(legacyAbsolute) ?? [];

  if (literalMatches.length || absoluteMatches.length) {
    failures.push(
      relative +
        " -> " +
        [...literalMatches, ...absoluteMatches].join(", "),
    );
  }
}

if (failures.length) {
  throw new Error(
    "Live UI still contains legacy /admin navigation:\n" +
      failures.map((item) => "- " + item).join("\n"),
  );
}

const consoleSource = read("components/admin/AdminConsole.tsx");
const reportsSource = read("components/admin/AdminReportsWorkspace.tsx");
const gateSource = read("components/admin/AdminDirectGate.tsx");
const legacyPage = read("app/admin/page.tsx");
const livePage = read("app/admini/page.tsx");

if (!consoleSource.includes("/admini")) {
  throw new Error("AdminConsole must emit /admini navigation.");
}
if (!consoleSource.includes("/api/admin/")) {
  throw new Error("AdminConsole must preserve /api/admin/* endpoints.");
}
if (!reportsSource.includes("/api/admin/reports")) {
  throw new Error("AdminReportsWorkspace must preserve /api/admin/reports.");
}
if (
  !gateSource.includes("/api/admin/direct-session") ||
  !gateSource.includes("/api/admin/session")
) {
  throw new Error("Direct admin API endpoints changed.");
}
if (!legacyPage.includes("notFound")) {
  throw new Error("Legacy /admin must remain unavailable.");
}
if (!livePage.includes("AdminDirectGate")) {
  throw new Error("Live /admini page must keep AdminDirectGate.");
}

console.log("Admini repository-wide UI route audit passed.");
console.log("- app UI contains no legacy /admin navigation");
console.log("- components contain no legacy /admin navigation");
console.log("- client-side src/lib route helpers contain no legacy /admin navigation");
console.log("- /api/admin/* remains unchanged");
console.log("- legacy /admin remains unavailable; live UI uses /admini");
console.log("HALLEUS_ADMINI_ALL_UI_ROUTES_R20=PASS");
