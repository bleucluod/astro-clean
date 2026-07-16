import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourcePath = path.join(root, "lib/wiki/wiki-scheduling.ts");
const packageRequire = createRequire(pathToFileURL(path.join(root, "package.json")));
const ts = packageRequire("typescript");
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
}).outputText;
const scheduling = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

const settings = {
  articlesPerWeek: 7,
  maxArticlesPerDay: 1,
  allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
  publishTime: "10:00",
  timezone: "Asia/Tehran",
  minimumIntervalHours: 1,
  blackoutDates: [],
  pillarBeforeSupport: true,
  maxHorizonDays: 30,
  publishingPaused: false,
};
const slots = scheduling.computeWikiScheduleSlots({
  settings,
  existingRunAt: [],
  count: 2,
  now: new Date("2026-07-16T00:00:00.000Z"),
});
const actualSlots = slots.map((slot) => slot.toISOString());
const expectedSlots = ["2026-07-16T06:30:00.000Z", "2026-07-17T06:30:00.000Z"];
if (JSON.stringify(actualSlots) !== JSON.stringify(expectedSlots)) {
  throw new Error(`Tehran schedule mismatch: ${JSON.stringify(actualSlots)}`);
}

const dailySlots = scheduling.computeWikiScheduleSlots({
  settings: {
    ...settings,
    articlesPerWeek: 35,
    maxArticlesPerDay: 5,
    publishTime: "08:00",
    minimumIntervalHours: 2,
  },
  existingRunAt: [],
  count: 5,
  now: new Date("2026-07-16T00:00:00.000Z"),
});
const expectedDailySlots = [
  "2026-07-16T04:30:00.000Z",
  "2026-07-16T06:30:00.000Z",
  "2026-07-16T08:30:00.000Z",
  "2026-07-16T10:30:00.000Z",
  "2026-07-16T12:30:00.000Z",
];
if (JSON.stringify(dailySlots.map((slot) => slot.toISOString())) !== JSON.stringify(expectedDailySlots)) {
  throw new Error(`Multi-publication daily schedule mismatch: ${JSON.stringify(dailySlots)}`);
}

const base = {
  slug: "x", title: "x", shortTitle: "x", seoTitle: "x", metaDescription: "x",
  categoryId: "foundations", tags: [], summary: "x", intro: "x", readingMinutes: 1,
  publicationPriority: 0, contentCluster: "cluster", indexable: true, bodyMarkdown: "x",
  keyPoints: ["x"], sections: [], contextLinks: [], sources: [], callToAction: null,
  contentVersion: 1,
};
const ordered = scheduling.sortWikiArticlesForPublishing([
  { ...base, stableId: "support", articleRole: "support", relatedArticleIds: ["pillar"] },
  { ...base, stableId: "pillar", articleRole: "pillar", relatedArticleIds: [] },
], true);
if (ordered.map((item) => item.stableId).join(",") !== "pillar,support") {
  throw new Error("Pillar/dependency order is not deterministic.");
}
let cycleRejected = false;
try {
  scheduling.sortWikiArticlesForPublishing([
    { ...base, stableId: "a", articleRole: "support", relatedArticleIds: ["b"] },
    { ...base, stableId: "b", articleRole: "support", relatedArticleIds: ["a"] },
  ], true);
} catch {
  cycleRejected = true;
}
if (!cycleRejected) throw new Error("Circular Wiki dependencies were not rejected.");

console.log("Wiki scheduling determinism check passed.");
console.log("- Tehran slots, one-to-five daily publications, Persian week boundaries, pillar ordering, dependencies, and cycles are deterministic");
