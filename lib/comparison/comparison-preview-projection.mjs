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
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * Preserve the entire editorial lead, including its evidence and caveats.
 * Approximately 20% is an editorial target, never a runtime visibility gate.
 * Keep the complete lead even when its length falls outside the target.
 * Insufficient-evidence chapters already have a cautious, truthful writer lead;
 * expose that limitation instead of an empty chapter.
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
    return {
      id,
      title: chapter.title,
      evidenceStatus: assignment.status,
      excerptFa: lead,
    };
  });
  return { version: "comparison-chapter-preview-v2", chapters };
}

/** Reproject an immutable, already validated server record using only its saved
 * evidence classifications. Supports old local demo rows without regenerating
 * their report, changing their invoice, or exposing any extra reading fields.
 * This helper must never accept a browser-supplied record or saved preview.
 */
export function refreshStoredComparisonChapterPreview(reading, stored) {
  if (!["comparison-chapter-preview-v1", "comparison-chapter-preview-v2"].includes(stored?.version) ||
      !Array.isArray(stored.chapters) || stored.chapters.length !== CHAPTER_IDS.length ||
      !Array.isArray(reading?.chapters) || reading.chapters.length !== CHAPTER_IDS.length) {
    throw new Error("COMPARISON_PREVIEW_INVALID_STORED");
  }
  const chapterPlans = CHAPTER_IDS.map((id, index) => {
    const saved = stored.chapters[index];
    const chapter = reading.chapters[index];
    if (saved?.id !== id || chapter?.id !== id || saved.title !== chapter.title) {
      throw new Error("COMPARISON_PREVIEW_INVALID_STORED");
    }
    return { chapter: id, status: saved.evidenceStatus, primary: chapter.ownerContactId ? { id: chapter.ownerContactId } : null };
  });
  return projectComparisonChapterPreview(reading, { chapterPlans });
}
