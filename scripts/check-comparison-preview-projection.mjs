import assert from "node:assert/strict";
import { projectComparisonChapterPreview as project } from "../lib/comparison/comparison-preview-projection.mjs";

const ids = ["communication", "emotional-security", "attraction-intimacy", "boundaries-commitment", "friction-repair"];
const build = () => ({
  reading: {
    privateRoot: "ROOT_PRIVATE",
    chapters: ids.map(id => ({
      id, title: id, ownerContactId: id + ":witness", crossReferencePatternTitle: "CROSS_PRIVATE",
      block: {
        humanExperience: "شاهد معتبر و برداشت روشن است.",
        dailySituation: "DAILY_PRIVATE یک دو سه چهار",
        strength: "STRENGTH_PRIVATE یک دو سه چهار",
        challenge: "CHALLENGE_PRIVATE یک دو سه چهار",
        practicalStep: "PRACTICE_PRIVATE یک دو سه چهار",
        evidence: [{ detail: "EVIDENCE_PRIVATE" }], personA: "PERSON_PRIVATE",
      },
    })),
  },
  plan: { chapterPlans: ids.map(chapter => ({chapter, status: "supported", primary: {id: chapter + ":witness"}})) },
});
const run = () => { const {reading, plan} = build(); return project(reading, plan); };
const result = run();
assert.deepEqual(Object.keys(result), ["version", "chapters"]);
assert.equal(result.version, "comparison-chapter-preview-v1");
assert.deepEqual(result.chapters.map(c => c.id), ids);
for (const chapter of result.chapters) {
  assert.deepEqual(Object.keys(chapter), ["id", "title", "evidenceStatus", "excerptFa"]);
  assert.equal(chapter.excerptFa, "شاهد معتبر و برداشت روشن است.");
}
assert.equal(JSON.stringify(result).includes("_PRIVATE"), false);
assert.deepEqual(run(), result);
{
  const {reading, plan} = build();
  const before = JSON.stringify({reading, plan});
  project(reading, plan);
  assert.equal(JSON.stringify({reading, plan}), before);
}
for (const change of [
  ({reading}) => reading.chapters.pop(),
  ({reading}) => reading.chapters.push(reading.chapters[0]),
  ({reading}) => reading.chapters.reverse(),
  ({reading}) => {reading.chapters[0].block.dailySituation = "";},
  ({reading}) => {delete reading.chapters[0].block.practicalStep;},
  ({reading}) => {reading.chapters[0].block.humanExperience = 123;},
  ({plan}) => {plan.chapterPlans[0].status = "unknown";},
  ({plan}) => {plan.chapterPlans[0].primary.id = "wrong";},
  ({plan}) => {plan.chapterPlans[0].primary = null;},
  ({plan}) => plan.chapterPlans.reverse(),
  ({plan}) => plan.chapterPlans.pop(),
]) {
  const fixture = build(); change(fixture);
  assert.throws(() => project(fixture.reading, fixture.plan), /COMPARISON_PREVIEW_INVALID/);
}
{
  const {reading, plan} = build();
  reading.chapters[0].block.humanExperience = "یک دو سه چهار پنج شش هفت";
  assert.equal(project(reading, plan).chapters[0].excerptFa, null);
  plan.chapterPlans[0].status = "limited";
  assert.equal(project(reading, plan).chapters[0].excerptFa, reading.chapters[0].block.humanExperience);
  reading.chapters[0].block.humanExperience = "یک دو سه چهار پنج شش هفت هشت نه";
  assert.equal(project(reading, plan).chapters[0].excerptFa, null);
  reading.chapters[0].block.humanExperience = "کوتاه";
  assert.equal(project(reading, plan).chapters[0].excerptFa, null);
  plan.chapterPlans[0].status = "insufficient";
  plan.chapterPlans[0].primary = null;
  reading.chapters[0].ownerContactId = null;
  assert.equal(project(reading, plan).chapters[0].excerptFa, null);
}
console.log("PASS comparison preview projection synthetic contract");
