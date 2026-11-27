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
const PATTERN_FIELDS = Object.freeze([
  "humanExperience", "personA", "personB", "cycle", "dailySituation", "strength", "challenge", "practicalStep",
]);

function firstFifth(fields) {
  if (!fields.every(nonempty)) throw new Error("COMPARISON_PREVIEW_INVALID_STORY");
  const story = fields.map(value => value.trim()).join("\n\n");
  const words = [...story.matchAll(/\S+/gu)];
  const visibleWords = Math.max(1, Math.floor(words.length / 5));
  const lastWord = words[visibleWords - 1];
  return story.slice(0, lastWord.index + lastWord[0].length);
}

/**
 * Reveal the complete overview and the first fifth of each displayed pattern\n * and chapter body, in reading order; exclude technical details and growth.
 * Count whitespace-delimited words (Persian ZWNJ stays inside a word).
 * A sentence may be unfinished, but a word is never split. The caller can
 * display an ellipsis and the evidenceStatus separately from the verbatim text.
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
  if (!Array.isArray(reading.overviewParagraphsFa) || reading.overviewParagraphsFa.length !== 2 ||
      !reading.overviewParagraphsFa.every(nonempty) || !Array.isArray(reading.primaryPatterns) ||
      reading.primaryPatterns.length !== 3) {
    throw new Error("COMPARISON_PREVIEW_INVALID_OVERVIEW");
  }
  const overviewParagraphsFa = [...reading.overviewParagraphsFa];
  const primaryPatterns = reading.primaryPatterns.map(pattern => {
    if (!nonempty(pattern?.id) || !nonempty(pattern.title)) throw new Error("COMPARISON_PREVIEW_INVALID_PATTERN");
    return {id: pattern.id, title: pattern.title, excerptFa: firstFifth(PATTERN_FIELDS.map(key => pattern[key]))};
  });
  if (new Set(primaryPatterns.map(pattern => pattern.id)).size !== 3) throw new Error("COMPARISON_PREVIEW_INVALID_PATTERN");
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
    const excerpt = firstFifth(STORY_FIELDS.map(key => chapter.block[key]));
    return {
      id,
      title: chapter.title,
      eyebrow: nonempty(chapter.eyebrow) ? chapter.eyebrow : chapter.title,
      storyTitle: nonempty(chapter.block.title) ? chapter.block.title : chapter.title,
      evidenceStatus: assignment.status,
      excerptFa: excerpt,
    };
  });
  return { version: "comparison-chapter-preview-v4", overviewParagraphsFa, primaryPatterns, chapters };
}

/** Reproject an immutable, already validated server record using only its saved
 * evidence classifications. Supports old local demo rows without regenerating
 * their report, changing their invoice, or exposing any extra reading fields.
 * This helper must never accept a browser-supplied record or saved preview.
 */
export function refreshStoredComparisonChapterPreview(reading, stored) {
  if (!["comparison-chapter-preview-v1", "comparison-chapter-preview-v2", "comparison-chapter-preview-v3", "comparison-chapter-preview-v4"].includes(stored?.version) ||
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
