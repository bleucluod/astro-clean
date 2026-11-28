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
const wordCount = value => (value.match(/\S+/gu) ?? []).length;

/** Select a verbatim proper prefix at a completed sentence, not a word count.
 * The 30% ceiling is deliberately conservative: if no adequate boundary is
 * available, do not disclose most of the paid text or claim sale readiness.
 * Short/limited material may have a shorter complete preview or no excerpt.
 */
function naturalPreview(fields, evidenceQualified) {
  if (!fields.every(nonempty)) throw new Error("COMPARISON_PREVIEW_INVALID_STORY");
  const story = fields.map(value => value.trim()).join("\n\n");
  const total = wordCount(story);
  const ceiling = Math.floor(total * 0.30);
  const candidates = [...story.matchAll(/[.!?؟…]+[»”’"')\]]*(?=\s|$)/gu)]
    .map(match => {
      const end = match.index + match[0].length;
      return { end, words: wordCount(story.slice(0, end)) };
    })
    .filter(item => item.end < story.length && item.words <= ceiling && item.words < total)
    .sort((a, b) => Math.abs(a.words - total / 5) - Math.abs(b.words - total / 5) || a.end - b.end);
  // Prefer a complete narrative field to a sentence opening the next scene.
  const fieldEnds = new Set();
  let offset = 0;
  for (const field of fields.slice(0, -1)) {
    offset += field.trim().length;
    fieldEnds.add(offset);
    offset += 2;
  }
  const complete = candidates.find(item => item.words >= 80 && fieldEnds.has(item.end));
  const chosen = complete ?? candidates.find(item => item.words >= 80) ?? candidates[0];
  return {
    excerptFa: chosen ? story.slice(0, chosen.end) : "",
    previewReady: evidenceQualified && total >= 400 && !!complete,
  };
}

/** Only a server-derived plan can establish independent evidence for both people.
 * A long text or a saved readiness flag cannot substitute for that evidence. */
function independentEvidenceQualified(id, chapter, assignment, plan) {
  const pointIds = {
    communication: ["mercury","sun"],
    "emotional-security": ["moon","venus","sun"],
    "attraction-intimacy": ["venus","mars","sun"],
    "boundaries-commitment": ["venus","saturn","sun"],
    "friction-repair": ["mars","mercury","saturn"],
  }[id];
  const entries = assignment.individualContext;
  const charts = plan.chartFeatures;
  const evidence = chapter.block.evidence;
  if (!pointIds || !Array.isArray(entries) || entries.length !== 2 ||
      !Array.isArray(charts) || charts.length !== 2 || !Array.isArray(evidence) ||
      new Set(charts.map(chart => chart.chartId)).size !== 2 ||
      new Set(entries.map(entry => entry.side)).size !== 2) return false;
  const hasEvidence = evidenceId => evidence.some(item => item.id === evidenceId && item.label === "زمینهٔ فردی مستقل");
  const allowedPairs = id === "boundaries-commitment" ? ["saturn|venus"] : id === "friction-repair" ? ["mercury|saturn", "mars|moon", "mars|mercury"] : [];
  return entries.every(entry => {
    const chart = charts[entry.side === "a" ? 0 : entry.side === "b" ? 1 : -1];
    const point = entry.point;
    if (!chart || !point || !["exact","unknown"].includes(chart.birthTimeStatus) ||
        point.birthTimeStatus !== chart.birthTimeStatus || point.ownerChartId !== chart.chartId ||
        point.ownerLabel !== chart.label || !pointIds.includes(point.pointId) ||
        point.evidenceId !== "natal-point:" + chart.chartId + ":" + point.pointId ||
        !nonempty(point.signId) || !hasEvidence(point.evidenceId) ||
        !chart.context?.some(item => item.evidenceId === point.evidenceId && item.signId === point.signId &&
          item.birthTimeStatus === point.birthTimeStatus && item.ownerChartId === chart.chartId)) return false;
    if (chart.birthTimeStatus === "unknown") {
      return entry.timeBasis === "reference-window-sampled" && entry.aspect == null &&
        point.pointId !== "moon" && point.natalHouse == null &&
        point.limitation === "unknown-time-reference-position-not-exact-degree";
    }
    if (!entry.aspect) return true;
    const aspect = entry.aspect;
    return allowedPairs.includes([aspect.firstPointId, aspect.secondPointId].sort().join("|")) &&
      ["conjunction","square","opposition","trine","sextile"].includes(aspect.aspectId) &&
      Number.isFinite(aspect.orb) && aspect.orb >= 0 && aspect.orb <= 5 &&
      typeof aspect.evidenceId === "string" &&
      aspect.evidenceId.startsWith("natal-aspect:" + chart.chartId + ":") &&
      hasEvidence(aspect.evidenceId);
  });
}

/** Explicit allowlist of the complete overview and five chapter prefixes.
 * Legacy patterns remain in the private reading, not in the preview payload.
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
      !reading.overviewParagraphsFa.every(nonempty)) {
    throw new Error("COMPARISON_PREVIEW_INVALID_OVERVIEW");
  }
  const overviewParagraphsFa = [...reading.overviewParagraphsFa];
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
    const qualified = assignment.status === "supported" || independentEvidenceQualified(id, chapter, assignment, plan);
    const excerpt = naturalPreview(STORY_FIELDS.map(key => chapter.block[key]), qualified);
    return {
      id,
      title: chapter.title,
      eyebrow: nonempty(chapter.eyebrow) ? chapter.eyebrow : chapter.title,
      storyTitle: nonempty(chapter.block.title) ? chapter.block.title : chapter.title,
      evidenceStatus: assignment.status,
      ...excerpt,
    };
  });
  const readyForSale = wordCount(overviewParagraphsFa.join(" ")) >= 300 && chapters.every(chapter => chapter.previewReady);
  return { version: "comparison-chapter-preview-v7", overviewParagraphsFa, chapters, readyForSale };
}

/** Reproject an immutable, already validated server record using only its saved
 * evidence classifications. Supports old local demo rows without regenerating
 * their report, changing their invoice, or exposing any extra reading fields.
 * This helper must never accept a browser-supplied record or saved preview.
 */
export function refreshStoredComparisonChapterPreview(reading, stored, trustedPlan) {
  if (!["comparison-chapter-preview-v1", "comparison-chapter-preview-v2", "comparison-chapter-preview-v3", "comparison-chapter-preview-v4", "comparison-chapter-preview-v5", "comparison-chapter-preview-v6", "comparison-chapter-preview-v7"].includes(stored?.version) ||
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
  if (trustedPlan) {
    if (!Array.isArray(trustedPlan.chapterPlans) || trustedPlan.chapterPlans.length !== CHAPTER_IDS.length ||
        chapterPlans.some((saved, index) => {
          const current = trustedPlan.chapterPlans[index];
          return current?.chapter !== saved.chapter || current.status !== saved.status ||
            (current.primary?.id ?? null) !== (saved.primary?.id ?? null);
        })) throw new Error("COMPARISON_PREVIEW_INVALID_STORED_PLAN");
    return projectComparisonChapterPreview(reading, trustedPlan);
  }
  // Older callers can reproject supported chapters. Independent chapters
  // remain fail-closed until a server-derived plan is supplied.
  return projectComparisonChapterPreview(reading, { chapterPlans });
}

/** The approved demo exposes a bounded first fifth of each pattern. Keep this
 * read-time projection separate from immutable v7 chapter snapshots. */
const PATTERN_FIELDS=["humanExperience","personA","personB","cycle","dailySituation","strength","challenge","practicalStep"];
/** @param {import("../../types/comparison-product").ComparisonReading} reading */
export function projectComparisonPatternPreviews(reading){
 if(!Array.isArray(reading.primaryPatterns)||reading.primaryPatterns.length!==3)throw Error("COMPARISON_PREVIEW_INVALID_PATTERN");
 const patterns=reading.primaryPatterns.map(pattern=>{
  if(!nonempty(pattern.id)||!nonempty(pattern.title))throw Error("COMPARISON_PREVIEW_INVALID_PATTERN");
  const fields=PATTERN_FIELDS.map(key=>pattern[key]);
  if(!fields.every(value=>typeof value==="string"))throw Error("COMPARISON_PREVIEW_INVALID_PATTERN");
  const story=fields.map(value=>value.trim()).filter(Boolean).join("\n\n");
  const words=[...story.matchAll(/\S+/gu)];
  const count=Math.floor(words.length/5);
  const end=count>0?words[count-1]:null;
  return {id:pattern.id,title:pattern.title,excerptFa:end?story.slice(0,end.index+end[0].length):""};
 });
 if(new Set(patterns.map(p=>p.id)).size!==3)throw Error("COMPARISON_PREVIEW_INVALID_PATTERN");
 return patterns;
}
