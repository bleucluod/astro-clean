/** Pure projection for a trusted server-generated reading and its evidence plan.
 * Not an access decision, route, storage format, or client-side paywall.
 * Never pass a full reading or evidence plan to a locked client.
 */
const CHAPTER_IDS = Object.freeze([
  "communication", "emotional-security", "attraction-intimacy",
  "boundaries-commitment", "friction-repair",
]);
const STORY_FIELDS = Object.freeze([
  "humanExperience", "dailySituation", "strength", "challenge", "practicalStep",
]);
const words = (text) => text.trim().split(/\s+/u).filter(Boolean).length;
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * Preserve the entire editorial lead, including its evidence and caveats.
 * Supported chapters target 15–25% of the five visible narrative fields.
 * Limited chapters permit up to 30% so a short caveat need not be truncated.
 * Insufficient evidence or out-of-range prose has no excerpt until reviewed.
 * The output is an explicit allowlist, never a spread of a private object.
 * @param {import("../../types/comparison-product").ComparisonReading} reading
 * @param {ReturnType<import("./comparison-evidence-plan").buildComparisonEvidencePlan>} plan
 */
export function projectComparisonChapterPreview(reading, plan) {
  if (!Array.isArray(reading?.chapters) || !Array.isArray(plan?.chapterPlans) ||
      reading.chapters.length !== CHAPTER_IDS.length ||
      plan.chapterPlans.length !== CHAPTER_IDS.length) {
    throw new Error("COMPARISON_PREVIEW_INVALID_CHAPTERS");
  }
  const chapters = CHAPTER_IDS.map((id, index) => {
    const chapter = reading.chapters[index];
    const assignment = plan.chapterPlans[index];
    if (chapter?.id !== id || assignment?.chapter !== id ||
        !nonempty(chapter.title) || !chapter.block ||
        !["supported", "limited", "insufficient"].includes(assignment.status) ||
        (chapter.ownerContactId ?? null) !== (assignment.primary?.id ?? null) ||
        (assignment.status !== "insufficient" && !nonempty(assignment.primary?.id)) ||
        (assignment.status === "insufficient" && assignment.primary != null)) {
      throw new Error("COMPARISON_PREVIEW_INVALID_CHAPTER");
    }
    const fields = STORY_FIELDS.map((key) => chapter.block[key]);
    if (!fields.every(nonempty)) {
      throw new Error("COMPARISON_PREVIEW_INVALID_STORY");
    }
    const lead = fields[0];
    const total = fields.reduce((sum, value) => sum + words(value), 0);
    const leadWords = words(lead);
    const upper = assignment.status === "limited" ? 30 : 25;
    const inRange = leadWords * 100 >= total * 15 && leadWords * 100 <= total * upper;
    return {
      id,
      title: chapter.title,
      evidenceStatus: assignment.status,
      excerptFa: assignment.status !== "insufficient" && inRange ? lead : null,
    };
  });
  return { version: "comparison-chapter-preview-v1", chapters };
}
