import type { AstrologyReport, RealEngineReportAspect, ZodiacKey } from "@/types/astro";
import type { AdaptiveNarrativeAnchor, AdaptiveReportPlan } from "./adaptive-report-planner";

export const NARRATIVE_SELECTION_VERSION = "report-selection-20261027-r2" as const;
const PERSONAL = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const LABELS: Record<string, string> = { sun:"خورشید", moon:"ماه", mercury:"عطارد", venus:"ونوس", mars:"مریخ", jupiter:"مشتری", saturn:"زحل", uranus:"اورانوس", neptune:"نپتون", pluto:"پلوتو", asc:"طالع", dsc:"غروب", mc:"میانهٔ آسمان", ic:"ژرفای آسمان" };
const CORE = new Set(["sun", "moon"]);
const ORBS = { conjunction: 8, opposition: 8, square: 6, trine: 6, sextile: 5 };
const rounded = (n: number) => Math.round(n * 1000) / 1000;
const unique = <T,>(items: T[]) => [...new Set(items)];

// Editorial ranking policy, not calibrated probability or a claim of life outcomes.
// Every candidate uses the same dimensions. Tense aspects get no automatic bonus.
export const NARRATIVE_WEIGHTS = {
  base: 70, luminary: 30, personal: 12, ruler: 24,
  structure: 30, closeness: 18, angular: 18,
} as const;
export type NarrativeWeights = { [K in keyof typeof NARRATIVE_WEIGHTS]: number };
export type SelectionTerm = { key: string; points: number; reason: string; sourceIds: string[] };
export type SelectionDecision = {
  semanticKey: string; title: string; score: number; legacyScore: number;
  terms: SelectionTerm[]; eligible: boolean; exclusion: string | null;
  selected: boolean; disposition: string;
  selectionScore?: number; reusedPoints?: number;
  alternatives?: Array<{ key: string; score: number; directlyPersonal: boolean }>;
};
export type NarrativeReservation = {
  id: string; owner: string; evidenceIds: string[];
  claimId: string | null;
  sceneId: string | null; actionId: string | null; purpose: string;
};
export type NarrativeOwnership = {
  reservations: NarrativeReservation[];
  sharedCopy: Array<{ id: string; kind: "scene" | "action" | "claim"; text: string; owner: string; blockedConsumers: string[] }>;
  semanticReviewRequired: true;
};
export type NarrativeSelection = {
  version: typeof NARRATIVE_SELECTION_VERSION;
  timeReliable: boolean;
  decisions: SelectionDecision[];
  storyGroups: Array<{ id: string; ownerKey: string; memberKeys: string[]; perspectives: Array<{ key: string; title: string; kind: string; planetIds: string[]; houseIds: number[]; aspectIds: string[] }> }>;
  opening: {
    leadKey: string | null; groupId: string | null; supportingKeys: string[]; owner: "opening";
    purpose: string; house: number | null; sign: ZodiacKey | null; jointMemberIds: string[];
  };
  ownership: NarrativeOwnership;
};
export function hasReliableNarrativeTime(report: AstrologyReport) {
  return report.input.birthTimeAccuracy !== "unknown" && Boolean(report.input.birthTime)
    && !!report.realEngine?.angles?.asc
    && report.realEngine.angles.asc.reliability !== "not-calculated";
}
function distance(a: number, b: number) {
  const delta = ((a - b) % 360 + 360) % 360;
  return Math.min(delta, 360 - delta);
}
export function rankNarrativeCandidates(report: AstrologyReport, candidates: AdaptiveNarrativeAnchor[], chartRulerId: string, weights: NarrativeWeights = NARRATIVE_WEIGHTS) {
  const timeReliable = hasReliableNarrativeTime(report);
  const placements = report.realEngine?.placements ?? [];
  const aspects = report.realEngine?.aspects ?? report.realEngine?.aspectHighlights ?? [];
  const aspectMap = new Map(aspects.map(a => [a.id, a]));
  const decisions: SelectionDecision[] = [];
  const ranked = candidates.map(candidate => {
    const ids = unique(candidate.sourcePlanetIds);
    const terms: SelectionTerm[] = [];
    const add = (key: string, points: number, reason: string, sourceIds: string[]) => {
      if (points > 0) terms.push({ key, points: rounded(points), reason, sourceIds });
    };
    add("base", weights.base, "پایهٔ مشترک همهٔ نامزدها", []);
    const core = ids.filter(id => CORE.has(id));
    add("luminary", core.length ? weights.luminary : 0, "حضور مستقیم خورشید یا ماه", core);
    const personal = ids.filter(id => PERSONAL.has(id));
    add("personal", Math.min(personal.length, 3) * weights.personal, "تعداد سیاره‌های شخصی؛ حداکثر سه سهم", personal);
    const ruler = timeReliable && ids.includes(chartRulerId);
    add("ruler", ruler ? weights.ruler : 0, "حاکم طالعِ محاسبه‌شده در همین موضوع حضور دارد", ruler ? [chartRulerId] : []);
    const edges = candidate.sourceAspectIds.map(id => aspectMap.get(id)).filter((a): a is RealEngineReportAspect => !!a);
    // Weakest edge bounds pattern precision; no rewarding a wide third edge.
    const precision = edges.length ? Math.min(...edges.map(a => Math.max(0, 1 - a.orb / ORBS[a.aspectId]))) : 0;
    add("closeness", precision * weights.closeness, "نزدیکی نسبی به زاویهٔ دقیق؛ برای الگو، ضعیف‌ترین ضلع ملاک است", edges.map(a => a.id));
    const structure = candidate.kind === "aspect-pattern" && edges.length >= 3 ? 1
      : candidate.kind === "cluster" ? Math.min(1, ids.length / 5) : 0;
    add("structure", structure * weights.structure, "ساختار چندعاملیِ ثبت‌شده؛ سقف برابر برای تنش و هماهنگی", [...ids, ...edges.map(a => a.id)]);
    const angleContacts = timeReliable ? ids.flatMap(id => {
      const p = placements.find(p => p.id === id);
      return p ? Object.values(report.realEngine?.angles ?? {}).flatMap(angle => {
        const orb = distance(p.longitude, angle.longitude);
        return Number.isFinite(orb) && orb < 6 && angle.reliability !== "not-calculated"
          ? [{ planetId: id, angleId: angle.id, orb }] : [];
      }) : [];
    }).sort((a,b) => a.orb-b.orb || a.planetId.localeCompare(b.planetId)) : [];
    const closest = angleContacts[0];
    add("angular", closest ? weights.angular * (1 - closest.orb / 6) : 0,
      closest ? `فاصلهٔ واقعی ${LABELS[closest.planetId] ?? closest.planetId} از ${LABELS[closest.angleId] ?? closest.angleId}: ${closest.orb.toFixed(2)} درجه؛ صرف حضور در خانهٔ زاویه‌ای کافی نیست` : "",
      closest ? [closest.planetId, closest.angleId] : []);
    let exclusion: string | null = null;
    if (candidate.kind === "planet" || candidate.kind === "ruler-story") {
      exclusion = "این برداشت مستقل متعلق به فصل جایگاه است؛ برای پرکردن سه داستان دوباره مصرف نشود";
    } else if (!timeReliable && (candidate.kind === "house" || candidate.semanticKey.startsWith("cluster:house:") || candidate.kind === "advanced-pattern")) {
      exclusion = "این برداشت به ساعت معتبر تولد نیاز دارد";
    } else if (!timeReliable && ids.includes("moon")) {
      exclusion = "جایگاه و تماس‌های ماه بدون ساعت معلوم هنوز بازه‌سنجی نشده‌اند";
    } else if (!personal.length && !ruler && !closest) {
      exclusion = "اتصال شخصیِ کافی برای روایت اصلی ندارد؛ در فصل تخصصی خودش بررسی شود";
    } else if (candidate.sourceAspectIds.length !== edges.length) {
      exclusion = "شاهد زاویه‌ای در موجودی واقعی چارت پیدا نشد";
    }
    const score = rounded(terms.reduce((sum, term) => sum + term.points, 0));
    decisions.push({ semanticKey: candidate.semanticKey, title: candidate.title, score, legacyScore: candidate.score,
      terms, eligible: !exclusion, exclusion, selected: false, disposition: exclusion ?? "نامزد انتخاب" });
    return { ...candidate, score, rankingReasons: terms.map(t => `${t.reason} (+${t.points})`) };
  });
  const compare = (a: {score: number; semanticKey: string}, b: {score: number; semanticKey: string}) => b.score-a.score || a.semanticKey.localeCompare(b.semanticKey);
  const eligible = new Set(decisions.filter(d => d.eligible).map(d => d.semanticKey));
  return { timeReliable, candidates: ranked.filter(c => eligible.has(c.semanticKey)).sort(compare), decisions: decisions.sort(compare) };
}

export type NarrativeCoverage = Map<string, Set<string>>;
const UNIQUE_TERMS = new Set(["luminary", "personal", "ruler", "angular"]);
export function marginalNarrativeScore(decision: SelectionDecision, coverage: NarrativeCoverage, weights: NarrativeWeights = NARRATIVE_WEIGHTS) {
  let score = 0;
  for (const term of decision.terms) {
    if (!UNIQUE_TERMS.has(term.key)) { score += term.points; continue; }
    const covered = coverage.get(term.key) ?? new Set<string>();
    if (term.key === "angular") {
      if (!covered.has(term.sourceIds.join(":"))) score += term.points;
    } else {
      const fresh = term.sourceIds.filter(id => !covered.has(id));
      score += term.key === "personal" ? Math.min(term.points, fresh.length * weights.personal)
        : fresh.length ? term.points : 0;
    }
  }
  return rounded(score);
}
export function coverNarrativeDecision(decision: SelectionDecision, coverage: NarrativeCoverage) {
  for (const term of decision.terms.filter(t => UNIQUE_TERMS.has(t.key))) {
    const covered = coverage.get(term.key) ?? new Set<string>();
    for (const id of term.key === "angular" ? [term.sourceIds.join(":")] : term.sourceIds) covered.add(id);
    coverage.set(term.key, covered);
  }
}

// Exact-copy ownership supplements, never replaces, human semantic review.
const normalize = (s: string) => s.normalize("NFKC").replace(/[يى]/gu,"ی").replace(/ك/gu,"ک").replace(/[\s\u200c]+/gu," ").replace(/[،؛.!؟?:—]/gu,"").trim();
function stableId(s: string) {
  let hash = 2166136261;
  for (const ch of s) { hash ^= ch.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}
export function buildNarrativeOwnership(plan: Pick<AdaptiveReportPlan, "topStories" | "bigThree" | "placementStories" | "importantHouses" | "importantAspects" | "nodeStory" | "balanceStory" | "weeklyActions">, candidates: AdaptiveNarrativeAnchor[] = []): NarrativeOwnership {
  const reservations: NarrativeReservation[] = [];
  const copies = new Map<string, {id: string; kind: "scene" | "action" | "claim"; text: string; owner: string; consumers: string[]}>();
  function reserve(owner: string, evidenceIds: string[], claim: string, scene: string, action: string, purpose: string, facetKey = "main") {
    function own(kind: "scene" | "action" | "claim", text: string) {
      const normalized = normalize(text);
      if (!normalized) return null;
      const key = `${kind}:${normalized}`;
      const previous = copies.get(key);
      if (previous) { previous.consumers.push(owner); return previous.id; }
      const id = `${kind}:${stableId(normalized)}`;
      copies.set(key,{ id, kind, text, owner, consumers: [owner] });
      return id;
    }
    const claimId = own("claim",claim);
    reservations.push({ id: `insight:${owner}:${facetKey}`, owner, claimId, evidenceIds: unique(evidenceIds), sceneId: own("scene",scene), actionId: own("action",action), purpose });
  }
  for (const s of plan.topStories) {
    reserve(`story:${s.semanticKey}`,s.evidenceRefs.flatMap(e=>e.sourceIds),s.summary,s.dailyLife,s.action,"شرح کامل سازوکار همین الگو؛ صاحب مثال و تمرین آن");
    for (const facet of candidates.filter(c => s.absorbedSemanticKeys.includes(c.semanticKey) && ["cluster","aspect"].includes(c.kind))) {
      reserve(`story:${s.semanticKey}`,facet.evidenceRefs.flatMap(e=>e.sourceIds),facet.summary,facet.dailyLife,facet.action,
        `زاویهٔ مکمل در همین داستان: ${facet.title}؛ شاهد آن مستقل بماند و به همهٔ اعضای گروه تعمیم داده نشود`,facet.semanticKey);
    }
  }
  for (const p of [...plan.bigThree,...plan.placementStories]) reserve(`placement:${p.planetId}`,[p.planetId],p.interpretation.plainMeaning,p.interpretation.dailyLifeExample,p.interpretation.smallExperiment,"نقش مستقل این جایگاه؛ برداشتِ مصرف‌شده در داستان اصلی دوباره گفته نشود");
  for (const h of plan.importantHouses) reserve(`house:${h.houseNumber}`,h.evidence.flatMap(e=>e.sourceIds),h.synthesis,h.livedExample,"","پرسش ویژهٔ این حوزهٔ زندگی؛ نه بازگویی کارت سیاره");
  for (const a of plan.importantAspects) reserve(`aspect:${a.aspect.id}`,a.evidence.flatMap(e=>e.sourceIds),a.healthy,a.dailyLife,a.action,"سازوکار همین رابطه؛ خارج از روابط مصرف‌شده در الگوی اصلی");
  if (plan.nodeStory) reserve("nodes",plan.nodeStory.evidence.flatMap(e=>e.sourceIds),plan.nodeStory.familiarBehavior,"",plan.nodeStory.experiment,"محور عادت و مسیر تازه");
  reserve("balance",plan.balanceStory.evidence.flatMap(e=>e.sourceIds),plan.balanceStory.body,"",plan.balanceStory.action,"نسبت نیروها در کل چارت");
  plan.weeklyActions.forEach((a,i)=>reserve(`action:${i}`,[],"","",a.replace(/^[^—]+—\s*/u,""),"فقط اقدام تازه با مبنای زمانی در مرحلهٔ نهم؛ اقدام تکراری مجاز نیست"));
  reservations.unshift({ id:"insight:opening", owner:"opening", claimId:null, evidenceIds: unique(plan.topStories.flatMap(s=>s.evidenceRefs.flatMap(e=>e.sourceIds))), sceneId:null, actionId:null, purpose:"رابطهٔ میان موضوع‌های منتخب؛ جزئیات، مثال و تمرین فصل‌ها در افتتاحیه مصرف نشوند" });
  return { reservations, sharedCopy:[...copies.values()].filter(c=>unique(c.consumers).length>1).map(c=>({ id:c.id,kind:c.kind,text:c.text,owner:c.owner,blockedConsumers:unique(c.consumers).filter(x=>x!==c.owner) })), semanticReviewRequired:true };
}
export function finalizeNarrativeSelection(report: AstrologyReport, ranked: ReturnType<typeof rankNarrativeCandidates>, plan: Parameters<typeof buildNarrativeOwnership>[0]): NarrativeSelection {
  const lead = plan.topStories[0];
  const storyGroups = plan.topStories.map(story => {
    const members = ranked.candidates.filter(c => c.semanticKey === story.semanticKey || story.absorbedSemanticKeys.includes(c.semanticKey));
    const primary = members.filter(c => c.kind === "cluster" || c.kind === "aspect-pattern" || c.semanticKey === story.semanticKey);
    const memberKeys = unique(primary.map(c => c.semanticKey)).sort();
    return { id: memberKeys.join("+"), ownerKey: story.semanticKey, memberKeys,
      perspectives: members.filter(c => c.kind !== "house").map(c => ({ key:c.semanticKey,title:c.title,kind:c.kind,planetIds:c.sourcePlanetIds,houseIds:c.sourceHouseIds,aspectIds:c.sourceAspectIds })) };
  });
  const house = ranked.timeReliable && lead?.semanticKey.startsWith("cluster:house:") ? lead.sourceHouseIds[0] ?? null : null;
  const members = (report.realEngine?.placements ?? []).filter(p=>lead?.sourcePlanetIds.includes(p.id) && p.house===house);
  const sign = house !== null && members.length >= 3 && members.every(p=>p.signId===members[0].signId) ? members[0].signId : null;
  return { version:NARRATIVE_SELECTION_VERSION, timeReliable:ranked.timeReliable, storyGroups,
    decisions:ranked.decisions.map(d=>{
      const selected=plan.topStories.some(s=>s.semanticKey===d.semanticKey);
      const owner=plan.topStories.find(s=>s.absorbedSemanticKeys.includes(d.semanticKey));
      return {...d,selected,disposition:d.exclusion ?? (selected?"منتخب برای داستان اصلی":owner?`شواهد در ${owner.semanticKey} ادغام شد`:"اولویت پایین‌تر یا هم‌پوشانی؛ روایت مستقل اصلی نیست")};
    }),
    opening:{ leadKey:lead?.semanticKey??null,groupId:storyGroups[0]?.id??null,supportingKeys:plan.topStories.slice(1).map(s=>s.semanticKey),owner:"opening",purpose:"ترکیب کلی مستقل بر پایهٔ همین انتخاب مشترک",house,sign,jointMemberIds:sign?members.map(p=>p.id):[] },
    ownership:buildNarrativeOwnership(plan, ranked.candidates) };
}
