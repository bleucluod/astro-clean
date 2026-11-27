import assert from "node:assert/strict";
import { projectComparisonChapterPreview as project, refreshStoredComparisonChapterPreview as refresh } from "../lib/comparison/comparison-preview-projection.mjs";

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
assert.equal(result.version, "comparison-chapter-preview-v3");
assert.deepEqual(result.chapters.map(c => c.id), ids);
for (const chapter of result.chapters) {
  assert.deepEqual(Object.keys(chapter), ["id", "title", "evidenceStatus", "excerptFa"]);
  assert.equal(chapter.excerptFa, "شاهد معتبر و برداشت روشن");
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
  const block = reading.chapters[0].block;
  const fields = ["humanExperience", "dailySituation", "strength", "challenge", "practicalStep"];
  const expectedWords = () => fields.flatMap(key => block[key].trim().split(/\s+/u));
  function checkPrefix(status) {
    plan.chapterPlans[0].status = status;
    const words = expectedWords();
    const excerpt = project(reading, plan).chapters[0].excerptFa;
    assert.deepEqual(excerpt.split(/\s+/u), words.slice(0, Math.floor(words.length / 5)));
    assert.equal(fields.map(key => block[key].trim()).join("\n\n").startsWith(excerpt), true);
    return excerpt;
  }
  for (const lead of ["یک دو سه چهار پنج شش هفت", "یک دو سه چهار پنج شش هفت هشت نه", "کوتاه", "این بند کامل شاهد و برداشت و محدودیت را بدون بریدن جمله توضیح می‌دهد. ".repeat(12), "نیم‌فاصله  و\nواژه‌های فارسی"]) {
    block.humanExperience = lead;
    for (const status of ["supported", "limited"]) checkPrefix(status);
  }
  block.humanExperience = "یک دو سه چهار پنج شش هفت";
  assert.equal(checkPrefix("supported"), "یک دو سه چهار پنج");
  block.humanExperience = "کوتاه";
  block.dailySituation = "نمونه روزمره بدون قطع واژه";
  assert.equal(checkPrefix("limited"), "کوتاه\n\nنمونه روزمره بدون");
  plan.chapterPlans[0].status = "insufficient";
  plan.chapterPlans[0].primary = null;
  reading.chapters[0].ownerContactId = null;
  reading.chapters[0].block.humanExperience = "از اطلاعات موجود نمی‌توان دربارهٔ الگوی گفت‌وگوی این دو نفر نتیجه گرفت.";
  const result = project(reading, plan);
  assert.deepEqual(result.chapters[0].excerptFa.split(/\s+/u), expectedWords().slice(0, Math.floor(expectedWords().length / 5)));
  assert.equal(result.chapters[0].evidenceStatus, "insufficient");
  const old = {version:"comparison-chapter-preview-v1",chapters:result.chapters.map((c,i)=>({...c,excerptFa:i===3?c.excerptFa:null}))};
  assert.deepEqual(refresh(reading, old), result);
  const v2 = {version:"comparison-chapter-preview-v2",chapters:result.chapters.map((c,i)=>({...c,excerptFa:reading.chapters[i].block.humanExperience}))};
  assert.deepEqual(refresh(reading, v2), result);
  assert.deepEqual(refresh(reading, result), result);
  assert.equal(JSON.stringify(refresh(reading, old)).includes("_PRIVATE"), false);
  assert.throws(()=>refresh(reading,{...old,chapters:old.chapters.slice(1)}),/COMPARISON_PREVIEW_INVALID/);
  assert.throws(()=>refresh(reading,{...old,chapters:old.chapters.map((c,i)=>i===0?{...c,evidenceStatus:"supported"}:c)}),/COMPARISON_PREVIEW_INVALID/);
  assert.throws(()=>refresh(reading,{...old,chapters:old.chapters.map((c,i)=>i===0?{...c,title:"wrong"}:c)}),/COMPARISON_PREVIEW_INVALID/);
}
console.log("PASS comparison preview projection and stored-preview refresh");
