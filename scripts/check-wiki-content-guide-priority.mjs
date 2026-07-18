import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
}

async function importTypescriptModule(source, replacements = new Map()) {
  let transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  for (const [specifier, replacement] of replacements) {
    transpiled = transpiled.replaceAll(`from "${specifier}"`, `from "${replacement}"`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(transpiled, "utf8").toString("base64")}`;
  return import(url);
}

const typeStubUrl = `data:text/javascript;base64,${Buffer.from("export {};", "utf8").toString("base64")}`;
const guideSource = read("lib/wiki/wiki-content-guide.ts");
const guideModule = await importTypescriptModule(
  guideSource,
  new Map([["@/lib/wiki/wiki-cms-types", typeStubUrl]]),
);

const input = {
  baseGuide: "# Base guide\n\nPriority contract.",
  categories: [
    { id: "foundations", label: "مبانی", description: "مفاهیم پایه" },
  ],
  articles: [
    {
      stableId: "published-one",
      slug: "published-one",
      title: "مقاله منتشرشده",
      categoryId: "foundations",
      status: "published",
      contentVersion: 2,
      articleRole: "pillar",
      contentCluster: "core",
      publicationPriority: 280,
      deletedAt: null,
    },
  ],
  queue: [
    {
      stableId: "retry-two",
      title: "پشتیبان دوم",
      articleRole: "support",
      contentCluster: "core",
      publicationPriority: 140,
      runAt: "2026-07-21T06:30:00.000Z",
      jobStatus: "retry",
    },
    {
      stableId: "running-now",
      title: "در حال انتشار",
      articleRole: "pillar",
      contentCluster: "core",
      publicationPriority: 300,
      runAt: "2026-07-18T06:30:00.000Z",
      jobStatus: "running",
    },
    {
      stableId: "queued-one",
      title: "مقاله بعدی",
      articleRole: "pillar",
      contentCluster: "core",
      publicationPriority: 280,
      runAt: "2026-07-20T06:30:00.000Z",
      jobStatus: "queued",
    },
    {
      stableId: "failed-old",
      title: "ناموفق",
      articleRole: "support",
      contentCluster: "core",
      publicationPriority: 60,
      runAt: "2026-07-17T06:30:00.000Z",
      jobStatus: "failed",
    },
  ],
  generatedAt: new Date("2026-07-18T10:00:00.000Z"),
};
const frozen = JSON.stringify(input);
const first = guideModule.buildLiveWikiContentGuide(input);
const second = guideModule.buildLiveWikiContentGuide(input);
if (first !== second) failures.push("live guide output is not deterministic");
if (JSON.stringify(input) !== frozen) failures.push("live guide builder mutated its input");
for (const marker of [
  "## صف زندهٔ انتشار",
  "`publication_priority`",
  "بازهٔ ۰ تا ۳۰۰",
  "| در حال انتشار | `running-now` |",
  "| ۱ | `queued-one` |",
  "| ۲ | `retry-two` |",
  "| خارج از صف | `failed-old` |",
]) {
  requireText("live guide output", first, marker);
}
if (first.indexOf("`queued-one`") > first.indexOf("`retry-two`")) {
  failures.push("live guide positions do not follow scheduled run times");
}
const emptyGuide = guideModule.buildLiveWikiContentGuide({ ...input, queue: [] });
requireText("empty live guide", emptyGuide, "صف انتشار خالی است");

const route = read("app/api/admin/wiki/content-guide/route.ts");
const service = read("lib/wiki/wiki-cms-service.ts");
const types = read("lib/wiki/wiki-cms-types.ts");
const validation = read("lib/wiki/wiki-cms-validation.ts");
const packageParser = read("lib/wiki/wiki-package.ts");
const packageGuide = read("public/halleus-wiki-package-guide-v1.md");
const panel = read("components/admin/WikiAdminPanel.tsx");
const positionPlanner = read("lib/wiki/wiki-queue-priority.ts");
const packageJson = JSON.parse(read("package.json"));
const impact = JSON.parse(read("config/halleus-check-impact.json"));

requireText("content guide route", route, "listWikiContentGuideQueue");
requireText("content guide route", route, "queue,");
requireText("content guide types", types, "WikiContentGuideQueueItem");
requireText("content guide inventory", service, "publication_priority");
const queueFunction = service.slice(
  service.indexOf("export async function listWikiContentGuideQueue"),
  service.indexOf("export async function getAdminWikiArticle"),
);
for (const marker of [
  "halleus_private.wiki_publish_jobs",
  "status in ('queued', 'running', 'retry', 'failed')",
  "article.publication_priority",
  "job.run_at::text",
]) {
  requireText("content guide queue query", queueFunction, marker);
}
forbidText("content guide queue query", queueFunction, "body_markdown");
requireText(
  "CMS priority validation",
  validation,
  'publicationPriority: integer(input.publicationPriority ?? 0, "publicationPriority", 0, 300)',
);
requireText(
  "package priority validation",
  packageParser,
  "publication_priority`, 0, 300)",
);
for (const marker of [
  "`250–300`",
  "مقدار پیش‌فرض `280`",
  "`180–240`",
  "مقدار پیش‌فرض `220`",
  "`100–170`",
  "مقدار پیش‌فرض `140`",
  "`0–90`",
  "مقدار پیش‌فرض `60`",
  "صف زندهٔ انتشار",
]) {
  requireText("package guide priority contract", packageGuide, marker);
}
requireText("admin priority input", panel, 'min="0" max="300" step="10"');
forbidText("queue position planner", positionPlanner, "nextPublicationPriority");
forbidText(
  "queue position service",
  service,
  "set publication_priority = ${item.nextPublicationPriority}",
);
if (
  packageJson.scripts?.["check:wiki-content-guide-priority"] !==
  "node scripts/check-wiki-content-guide-priority.mjs"
) {
  failures.push("package.json is missing check:wiki-content-guide-priority");
}
for (const areaId of ["wiki", "wiki-guard-tooling"]) {
  const area = impact.areas.find((item) => item.id === areaId);
  if (!area?.guards?.includes("check:wiki-content-guide-priority")) {
    failures.push(`${areaId} impact area is missing check:wiki-content-guide-priority`);
  }
}

if (failures.length) {
  console.error("Wiki content guide priority check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki content guide priority check passed.");
console.log("- the protected guide contains the current publication queue with real positions and slots");
console.log("- AI package priorities are constrained to a documented 0-300 semantic scale");
console.log("- manual queue position changes preserve semantic article priorities");
