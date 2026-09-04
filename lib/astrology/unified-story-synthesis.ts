// HALLEUS_R39_NARRATIVE_RECOMPOSITION_EVIDENCE_HYGIENE_R3_20260902
// HALLEUS_R39_NARRATIVE_RECOMPOSITION_EVIDENCE_HYGIENE_R1_20260902
import type {
  AdvancedRelevanceEvidence,
  AdvancedRelevancePlan,
} from "@/lib/astrology/advanced-relevance-engine";
import type {
  AdaptiveNarrativeAnchor,
  AdaptiveNarrativeEvidence,
} from "@/lib/astrology/adaptive-report-planner";

export const UNIFIED_STORY_SYNTHESIS_VERSION =
  "unified-story-synthesis-v1-20260901" as const;

export type UnifiedStorySynthesisDiagnostics = {
  version: typeof UNIFIED_STORY_SYNTHESIS_VERSION;
  mergedExistingStoryCount: number;
  standaloneAdvancedStoryCount: number;
  strongTitleChangeCount: number;
  strongToneCount: number;
  predictiveLineCount: number;
  corePlacementExpansion: false;
  weakAdvancedPromotion: false;
};

export type UnifiedStorySynthesisResult = {
  storyCandidates: AdaptiveNarrativeAnchor[];
  diagnostics: UnifiedStorySynthesisDiagnostics;
};

const OBJECT_LABELS: Record<string, string> = {
  chiron: "کایران",
  "part-of-fortune": "فورچون",
  vertex: "ورتکس",
  ceres: "سرس",
  pallas: "پالاس",
  juno: "جونو",
  vesta: "وستا",
  eris: "اریس (Eris)",
  pholus: "فولوس",
  nessus: "نسوس",
};

const FACTOR_LABELS: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
  asc: "رایزینگ",
  mc: "MC",
  dsc: "DSC",
  ic: "IC",
};

const MERGEABLE_KINDS = new Set<AdaptiveNarrativeAnchor["kind"]>([
  "planet",
  "aspect",
  "cluster",
  "aspect-pattern",
  "house",
  "ruler-story",
]);

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}
function evidenceForStory(
  relevance: AdvancedRelevancePlan,
  semanticKey: string,
): AdvancedRelevanceEvidence[] {
  return relevance.decisions
    .filter(
      (item) =>
        item.evidenceKind !== "traditional-lot" &&
        item.matchedStorySemanticKey === semanticKey &&
        (item.decision === "merge" || item.decision === "support"),
    )
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function evidenceObjectIds(items: AdvancedRelevanceEvidence[]): string[] {
  return unique(items.flatMap((item) => item.objectIds.map(normalizeId)));
}

function evidenceSharedTags(items: AdvancedRelevanceEvidence[]): string[] {
  return unique(items.flatMap((item) => item.sharedThemeTags));
}

function intersect<T>(first: T[], second: T[]): T[] {
  const secondSet = new Set(second);
  return first.filter((item) => secondSet.has(item));
}

function splitTitle(title: string): { factors: string; theme: string } {
  const separator = " — ";
  const at = title.indexOf(separator);
  if (at < 0) return { factors: title, theme: title };
  return {
    factors: title.slice(0, at).trim(),
    theme: title.slice(at + separator.length).trim(),
  };
}

function themePhrase(tags: string[], fallback: string): string {
  const set = new Set(tags);
  if (set.has("commitment") && set.has("freedom")) return "تعهد و آزادی";
  if (
    set.has("security") &&
    (set.has("intimacy") || set.has("trust") || set.has("vulnerability"))
  ) {
    return "امنیت و صمیمیت";
  }
  if (set.has("care") && set.has("freedom")) return "مراقبت و آزادی";
  if (
    (set.has("value") || set.has("self-worth")) &&
    (set.has("intimacy") || set.has("trust"))
  ) {
    return "ارزش و صمیمیت";
  }
  if (set.has("boundaries") && set.has("power")) return "مرز و قدرت";
  if (set.has("strategy") || set.has("pattern")) {
    if (set.has("clarity") || set.has("mind")) return "راهبرد و وضوح";
  }
  if (set.has("focus") && (set.has("mission") || set.has("commitment"))) {
    return "تمرکز و تعهد";
  }
  if (set.has("relationship") && set.has("equality")) return "رابطه و برابری";
  if (
    set.has("turning-point") ||
    (set.has("catalyst") && set.has("choice"))
  ) {
    return "انتخاب و نقطه عطف";
  }
  if (set.has("security") && (set.has("value") || set.has("self-worth"))) return "امنیت و ارزش";
  return fallback;
}

function predictionFor(tags: string[]): string {
  const set = new Set(tags);
  if (
    set.has("relationship") ||
    set.has("partnership") ||
    set.has("commitment") ||
    set.has("intimacy")
  ) {
    return "در رابطه‌ها این موضوع در دوره‌های مختلف دوباره پررنگ می‌شود و هر بار شکل تازه‌ای از تعادل را می‌طلبد.";
  }
  if (set.has("turning-point") || set.has("catalyst") || set.has("choice")) {
    return "در مسیرت بعضی تغییرهای بزرگ از تصمیم‌هایی شروع می‌شوند که در ابتدا کوچک به نظر می‌رسند.";
  }
  if (set.has("security") || set.has("value") || set.has("self-worth")) {
    return "هر وقت امنیت یا ارزش شخصی‌ات درگیر شود، این الگو دوباره خودش را نشان می‌دهد.";
  }
  return "این الگو در دوره‌های مختلف زندگی دوباره فعال می‌شود، مخصوصاً وقتی همین موضوع‌ها هم‌زمان درگیر باشند.";
}

function evidenceRef(item: AdvancedRelevanceEvidence): AdaptiveNarrativeEvidence {
  return {
    id: item.id,
    kind: "pattern",
    sourceIds: item.sourceIds,
    label: item.label,
    detail: item.detail,
  };
}

function dedupeEvidence(
  items: AdaptiveNarrativeEvidence[],
): AdaptiveNarrativeEvidence[] {
  const byId = new Map<string, AdaptiveNarrativeEvidence>();
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

function mergeExistingStories(
  stories: AdaptiveNarrativeAnchor[],
  relevance: AdvancedRelevancePlan,
): { stories: AdaptiveNarrativeAnchor[]; mergedCount: number } {
  const sorted = [...stories].sort(
    (a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey),
  );
  const consumed = new Set<string>();
  const merged: AdaptiveNarrativeAnchor[] = [];
  let mergedCount = 0;

  for (const ownerOriginal of sorted) {
    if (consumed.has(ownerOriginal.semanticKey)) continue;
    let owner = ownerOriginal;
    if (!MERGEABLE_KINDS.has(owner.kind)) {
      merged.push(owner);
      continue;
    }

    const ownerEvidence = evidenceForStory(relevance, owner.semanticKey);
    const ownerObjects = evidenceObjectIds(ownerEvidence);
    const ownerTags = evidenceSharedTags(ownerEvidence);

    const candidate = sorted.find((other) => {
      if (other.semanticKey === owner.semanticKey || consumed.has(other.semanticKey)) {
        return false;
      }
      if (!MERGEABLE_KINDS.has(other.kind)) return false;
      const otherEvidence = evidenceForStory(relevance, other.semanticKey);
      if (otherEvidence.length === 0 || ownerEvidence.length === 0) return false;
      const sharedObjects = intersect(
        ownerObjects,
        evidenceObjectIds(otherEvidence),
      );
      const sharedThemes = intersect(
        ownerTags,
        evidenceSharedTags(otherEvidence),
      );
      return sharedObjects.length >= 1 && sharedThemes.length >= 2;
    });

    if (candidate) {
      const candidateEvidence = evidenceForStory(relevance, candidate.semanticKey);
      const sharedThemes = intersect(
        ownerTags,
        evidenceSharedTags(candidateEvidence),
      );
      const candidateAdvancedRefs = candidateEvidence.map(evidenceRef);
      owner = {
        ...owner,
        score: owner.score + Math.min(18, 6 + candidate.score * 0.08),
        sourcePlanetIds: unique([
          ...owner.sourcePlanetIds,
          ...candidate.sourcePlanetIds,
        ]),
        sourceAspectIds: unique([
          ...owner.sourceAspectIds,
          ...candidate.sourceAspectIds,
        ]),
        sourceHouseIds: unique([
          ...owner.sourceHouseIds,
          ...candidate.sourceHouseIds,
        ]),
        sourceNodeIds: unique([
          ...owner.sourceNodeIds,
          ...candidate.sourceNodeIds,
        ]),
        rankingReasons: unique([
          ...owner.rankingReasons,
          ...candidate.rankingReasons,
          `دو داستان موجود با تم مشترک ${sharedThemes.slice(0, 3).join(" / ")} در یک مالک روایی ادغام شدند`,
        ]),
        evidenceRefs: dedupeEvidence([
          ...owner.evidenceRefs,
          ...candidate.evidenceRefs,
          ...candidateAdvancedRefs,
        ]),
        absorbedSemanticKeys: unique([
          ...owner.absorbedSemanticKeys,
          candidate.semanticKey,
          ...candidate.absorbedSemanticKeys,
        ]),
      };
      consumed.add(candidate.semanticKey);
      mergedCount += 1;
    }
    merged.push(owner);
  }

  return { stories: merged, mergedCount };
}
function standaloneStories(
  relevance: AdvancedRelevancePlan,
): AdaptiveNarrativeAnchor[] {
  return relevance.decisions
    .filter(
      (item) =>
        item.evidenceKind === "special-point-aspect" &&
        item.decision === "standalone" &&
        item.score >= 84,
    )
    .flatMap((item) => {
      const factors = unique(
        item.objectIds
          .map((id) => OBJECT_LABELS[normalizeId(id)])
          .filter((label): label is string => Boolean(label)),
      ).slice(0, 3);
      if (factors.length === 0) return [];
      const tags = unique([...item.sharedThemeTags, ...item.themeTags]);
      const theme = themePhrase(tags, "الگوی برجسته");
      const factorText = factors.join("، ");
      const summary = `${factorText} در این چارت آن‌قدر شخصی و دقیق شده که ارزش خواندن مستقل دارد؛ موضوع اصلی‌اش ${theme} است.`;
      return [{
        anchorId: `advanced-standalone:${item.id}`,
        kind: "advanced-pattern" as const,
        semanticKey: `advanced:${item.id}`,
        title: `${factorText} — ${theme}`,
        summary,
        dailyLife: predictionFor(tags) || "این الگو بیشتر زمانی دیده می‌شود که موضوعش در یک تصمیم واقعی فعال شود.",
        healthyExpression: "وقتی این نیرو جهت روشن داشته باشد، می‌تواند به انتخابی آگاهانه و قابل‌استفاده تبدیل شود.",
        friction: "اگر بدون زمینه و شواهد دیگر بزرگ‌نمایی شود، ممکن است بیشتر از وزن واقعی‌اش دیده شود.",
        action: "فقط زمانی به این الگو وزن بده که در تجربه واقعی تو هم تکرار می‌شود.",
        score: item.score,
        sourcePlanetIds: item.sourceIds.filter((id) =>
          Object.prototype.hasOwnProperty.call(FACTOR_LABELS, normalizeId(id)),
        ),
        sourceAspectIds: [],
        sourceHouseIds: [],
        sourcePatternId: item.id,
        sourceNodeIds: [],
        rankingReasons: [],
        evidenceRefs: [evidenceRef(item)],
        absorbedSemanticKeys: [],
      }];
    });
}
// HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_R3_20260902
// HALLEUS_R39_ADVANCED_BODY_NARRATIVE_SEMANTICS_R5_20260902
type AdvancedBodyNarrativeSemantic = {
  id: string;
  label: string;
  aliases: string[];
  summary: string;
  dailyLife: string;
  healthy: string;
  friction: string;
};

const ADVANCED_BODY_NARRATIVE_ORDER = [
  "chiron",
  "juno",
  "ceres",
  "pallas",
  "vesta",
  "eris",
  "pholus",
  "nessus",
] as const;

const ADVANCED_BODY_NARRATIVE: Record<
  (typeof ADVANCED_BODY_NARRATIVE_ORDER)[number],
  AdvancedBodyNarrativeSemantic
> = {
  ceres: {
    id: "ceres",
    label: "سرس",
    aliases: ["سرس", "ceres"],
    summary:
      "سرس به این داستان موضوع مراقبت، دریافت حمایت و مرز میان حمایت و مسئولیت اضافی را اضافه می‌کند",
    dailyLife:
      "این لایه وقتی خودش را نشان می‌دهد که باید بین حمایت‌کردن، کمک‌خواستن و پذیرفتن اینکه همه‌چیز مسئولیت تو نیست مرز بگذاری",
    healthy:
      "مراقبت بدون به‌دوش‌کشیدن همه مسئولیت، و پذیرفتن حمایت وقتی به آن نیاز داری",
    friction:
      "مراقبت می‌تواند به نجات‌دادن، مسئولیت اضافی یا سختی در پذیرفتن کمک تبدیل شود",
  },
  pallas: {
    id: "pallas",
    label: "پالاس",
    aliases: ["پالاس", "pallas"],
    summary:
      "پالاس لایهٔ دیدن الگو، راهبرد و پیداکردن راه‌حل هوشمندانه را اضافه می‌کند",
    dailyLife:
      "در عمل، این لایه وقتی پررنگ می‌شود که مسئلهٔ پیچیده‌ای را به الگوهای کوچک‌تر می‌شکنی تا راه قابل اجرا پیدا کنی",
    healthy:
      "تشخیص الگو و تبدیل آن به راهبردی که در دنیای واقعی قابل آزمودن باشد",
    friction:
      "همه‌چیز می‌تواند به مسئلهٔ ذهنی تبدیل شود و احساس، زمان‌بندی یا مرز واقعی دیرتر دیده شود",
  },
  juno: {
    id: "juno",
    label: "جونو",
    aliases: ["جونو", "juno"],
    summary:
      "جونو کیفیت تعهد، توافق و انتظار از رابطهٔ برابر را مستقیم وارد ماجرا می‌کند",
    dailyLife:
      "جونو وقتی روشن‌تر دیده می‌شود که رابطه از جذابیت به قول، توافق، تقسیم مسئولیت یا انتظار دوطرفه می‌رسد",
    healthy:
      "تعهدی که قابل گفت‌وگو باشد، انتظارها روشن بمانند و برابری فقط به حدس واگذار نشود",
    friction:
      "تعهد می‌تواند به اثبات وفاداری، ماندن به‌خاطر شکل رابطه یا انتظارهای ناگفته تبدیل شود",
  },
  vesta: {
    id: "vesta",
    label: "وستا",
    aliases: ["وستا", "vesta"],
    summary:
      "وستا تمرکز، وقف انرژی و مرز زمانی و شخصی برای چیزی که واقعاً مهم است را پررنگ می‌کند",
    dailyLife:
      "این لایه وقتی دیده می‌شود که باید برای کار، رابطه یا مسیری مهم وقت متمرکز بسازی و به بقیهٔ تقاضاها مرز بدهی",
    healthy:
      "تمرکز پایدار بدون حذف استراحت، رابطه یا مرزهای شخصی",
    friction:
      "وقف انرژی می‌تواند به تک‌محوری، انزوا یا فرسودگی تبدیل شود",
  },
  chiron: {
    id: "chiron",
    label: "کایران",
    aliases: ["کایران", "chiron"],
    summary:
      "کایران این نقطه را حساس‌تر می‌کند: تجربهٔ زیسته می‌تواند به‌مرور این حوزه را به مهارت و ترمیم تبدیل کند",
    dailyLife:
      "این لایه وقتی زنده می‌شود که موضوعی حساس یا قدیمی لمس می‌شود و باید بین واکنش امروز و اثر تجربهٔ قبلی فرق بگذاری",
    healthy:
      "نام‌گذاری نقطهٔ حساس، یادگیری از تجربه و تبدیل آن به مهارت و مسیر ترمیم، بدون اینکه زخم تمام هویت را تعریف کند",
    friction:
      "گاهی تماس جدید از فیلتر حساسیت قدیمی خوانده می‌شود، یا برعکس برای لمس‌نکردن نقطهٔ حساس از موضوع دوری می‌کنی",
  },
  eris: {
    id: "eris",
    label: "اریس (Eris)",
    aliases: ["اریس (eris)", "eris"],
    summary:
      "اریس (Eris) موضوع تعلق، کنار گذاشته شدن و واکنش به نادیده گرفته شدن را فقط وقتی پررنگ می‌کند که خودش به عنوان عامل اصلی وارد عنوان شده باشد",
    dailyLife:
      "این لایه در جمع، گروه یا رابطه وقتی بیشتر دیده می‌شود که حس می‌کنی سهم تو از قاعده بیرون مانده یا دیده نشده‌ای",
    healthy:
      "دفاع روشن از تعلق و سهم خود بدون اینکه هر اختلاف به جنگ بر سر موجودیت تبدیل شود",
    friction:
      "حس حذف‌شدن یا نادیده‌شدن می‌تواند شدت واکنش را بیشتر از خود موقعیت بالا ببرد",
  },
  pholus: {
    id: "pholus",
    label: "فولوس",
    aliases: ["فولوس", "pholus"],
    summary:
      "فولوس وقتی مهم می‌شود که یک محرک کوچک بتواند زنجیره‌ای بزرگ‌تر از واکنش‌ها یا تغییرها را باز کند",
    dailyLife:
      "این لایه وقتی دیده می‌شود که یک حرف، تصمیم یا جابه‌جایی کوچک پیامدهای پی‌درپی می‌سازد و مکث پیش از قدم بعدی مهم می‌شود",
    healthy:
      "دیدن نقطهٔ آغاز زنجیره، مکث و انتخاب آگاهانهٔ آستانهٔ بعدی",
    friction:
      "یک محرک کوچک می‌تواند بدون مکث به زنجیره‌ای بزرگ‌تر از واکنش‌ها تبدیل شود",
  },
  nessus: {
    id: "nessus",
    label: "نسوس",
    aliases: ["نسوس", "nessus"],
    summary:
      "نسوس موضوع مرز، قدرت و متوقف‌کردن چرخه‌ای را که نباید تکرار شود وارد داستان می‌کند",
    dailyLife:
      "این لایه وقتی دیده می‌شود که باید نه روشن بگویی، رضایت و مسئولیت را شفاف کنی یا تکرار یک الگوی فرساینده را متوقف کنی",
    healthy:
      "مرز روشن، رضایت شفاف، مسئولیت‌پذیری و متوقف‌کردن تکرار پیش از آنکه عادی شود",
    friction:
      "فشار، مرز مبهم یا الگوی کنترل می‌تواند عادی‌سازی شود و تکرار را بیشتر کند",
  },
};

function advancedBodyNarrativeIdsFromTitle(
  title: string,
): (typeof ADVANCED_BODY_NARRATIVE_ORDER)[number][] {
  const factors = splitTitle(title).factors.toLocaleLowerCase("fa-IR");
  return ADVANCED_BODY_NARRATIVE_ORDER.filter((id) => {
    const semantic = ADVANCED_BODY_NARRATIVE[id];
    return semantic.aliases.some((alias) =>
      factors.includes(alias.toLocaleLowerCase("fa-IR")),
    );
  }).slice(0, 3);
}

// HALLEUS_R39_TRUE_SYNTHESIS_RECOMPOSITION_R1_20260902
type AdvancedBodyNarrativeFocus = {
  focus: string;
  dailyCue: string;
  healthyCue: string;
  frictionCue: string;
};

const ADVANCED_BODY_NARRATIVE_FOCUS: Record<
  (typeof ADVANCED_BODY_NARRATIVE_ORDER)[number],
  AdvancedBodyNarrativeFocus
> = {
  ceres: {
    focus: "مراقبت، دریافت حمایت و مرز مسئولیت",
    dailyCue: "کمک‌کردن، کمک‌خواستن یا تقسیم مسئولیت",
    healthyCue: "حمایت دوطرفه بدون نجات‌دادن",
    frictionCue: "به‌دوش‌کشیدن مسئولیت اضافی",
  },
  pallas: {
    focus: "دیدن الگو و ساختن راهبرد",
    dailyCue: "شکستن یک مسئلهٔ پیچیده به چند الگوی قابل اجرا",
    healthyCue: "تبدیل الگو به راهبرد قابل آزمودن",
    frictionCue: "ذهنی‌کردن بیش از حد مسئله",
  },
  juno: {
    focus: "تعهد، توافق و برابری در رابطه",
    dailyCue: "روشن‌کردن قول، انتظار یا سهم هر طرف",
    healthyCue: "تعهد قابل گفت‌وگو و انتظارهای روشن",
    frictionCue: "اثبات وفاداری یا ماندن به‌خاطر شکل رابطه",
  },
  vesta: {
    focus: "تمرکز، تعهد به یک مسیر و مرز انرژی",
    dailyCue: "جداکردن وقت و توجه برای چیزی که واقعاً مهم است",
    healthyCue: "تمرکز پایدار همراه با استراحت و مرز",
    frictionCue: "تک‌محوری یا فرسودگی",
  },
  chiron: {
    focus: "نقطهٔ حساس، یادگیری و ترمیم",
    dailyCue: "فرق‌گذاشتن بین واکنش امروز و اثر یک تجربهٔ قدیمی",
    healthyCue: "یادگیری از حساسیت و تبدیل آن به مهارت و ترمیم",
    frictionCue: "خواندن موقعیت امروز از فیلتر حساسیت قدیمی",
  },
  eris: {
    focus: "تعلق، دیده‌شدن و واکنش به کنار گذاشته‌شدن",
    dailyCue: "فرق‌گذاشتن بین دفاع از جایگاه خود و بالابردن بی‌دلیل تنش",
    healthyCue: "دفاع روشن از تعلق و سهم خود",
    frictionCue: "بزرگ‌شدن واکنش به حس نادیده‌شدن",
  },
  pholus: {
    focus: "محرک کوچک و پیامدهای زنجیره‌ای",
    dailyCue: "مکث بعد از یک حرف یا تصمیم کوچک پیش از پیامد بعدی",
    healthyCue: "دیدن نقطهٔ آغاز زنجیره و انتخاب آگاهانهٔ قدم بعدی",
    frictionCue: "تبدیل یک محرک کوچک به زنجیره‌ای بزرگ بدون مکث",
  },
  nessus: {
    focus: "مرز، قدرت و متوقف‌کردن تکرار فرساینده",
    dailyCue: "روشن‌کردن مرز، رضایت و مسئولیت پیش از تکرار یک الگو",
    healthyCue: "مرز روشن و مسئولیت‌پذیری",
    frictionCue: "عادی‌شدن مرز مبهم یا الگوی کنترل",
  },
};

function composeAdvancedBodyNarrative(
  ids: (typeof ADVANCED_BODY_NARRATIVE_ORDER)[number][],
) {
  const focuses = ids.map((id) => ADVANCED_BODY_NARRATIVE_FOCUS[id]);

  // HALLEUS_R39_SINGLE_ADVANCED_DIRECT_VOICE_R3_20260902
  if (ids.length === 1) {
    const id = ids[0];
    const focus = ADVANCED_BODY_NARRATIVE_FOCUS[id];

    if (id === "juno") {
      return {
        summary:
          "جونو در این الگو تعهد، توافق و برابری را مستقیم وارد رابطه می‌کند.",
        dailyLife:
          "در رابطه‌ها این موضوع در دوره‌های مختلف دوباره پررنگ می‌شود؛ به‌ویژه وقتی قول، انتظار یا سهم هر طرف باید روشن شود.",
        healthy:
          "تعهد وقتی پخته‌تر کار می‌کند که انتظارها قابل گفت‌وگو باشند و هیچ‌کس برای حفظ شکل رابطه از سهم خودش حذف نشود.",
        friction:
          "زیر فشار، تعهد می‌تواند به اثبات وفاداری یا ماندن صرفاً برای حفظ شکل رابطه تبدیل شود.",
      };
    }

    const label = ADVANCED_BODY_NARRATIVE[id].label;
    return {
      summary: `${label} در این الگو ${focus.focus} را مستقیم پررنگ می‌کند.`,
      dailyLife:
        `در زندگی روزمره، این موضوع بیشتر وقتی دیده می‌شود که ${focus.dailyCue}.`,
      healthy: `شکل پختهٔ آن، ${focus.healthyCue} است.`,
      friction: `زیر فشار، ${focus.frictionCue} می‌تواند جلو بیفتد.`,
    };
  }


  if (ids.includes("ceres") && ids.includes("juno") && ids.includes("chiron")) {
    return {
      summary:
        "اینجا تعهد و مراقبت دقیقاً به نقطه‌ای حساس می‌رسند: رابطه وقتی امن‌تر می‌شود که حمایت دوطرفه باشد، انتظارها گفته شوند و ترمیم جای اثبات وفاداری را بگیرد.",
      dailyLife:
        "در عمل، یک قول، تقسیم مسئولیت یا درخواست حمایت می‌تواند حساسیت قدیمی را زود فعال کند؛ مسئله این است که نیاز امروز را از واکنش قدیمی جدا کنی و پیش از عقب‌نشینی یا نجات‌دادن، توافق را روشن کنی.",
      healthy:
        "بهترین شکل این ترکیب، مراقبت دوطرفه، تعهد قابل گفت‌وگو و توان برگشتن به رابطه بعد از لمس یک نقطهٔ حساس است.",
      friction:
        "زیر فشار، حمایت می‌تواند به نجات‌دادن و تعهد به اثبات وفاداری تبدیل شود، در حالی که حساسیت قدیمی ابهام کوچک را بزرگ‌تر از موقعیت امروز می‌کند.",
    };
  }

  if (ids.includes("juno") && ids.includes("chiron")) {
    return {
      summary:
        "این ترکیب تعهد را به نقطهٔ حساس رابطه وصل می‌کند؛ قول و توافق وقتی محکم‌تر می‌شوند که جایی برای ترمیم هم باز بماند.",
      dailyLife:
        "در عمل، جدی‌شدن یک قول یا انتظار می‌تواند حساسیت قدیمی را فعال کند؛ تفاوت نیاز امروز و واکنش قدیمی را روشن کن.",
      healthy:
        "تعهد قابل گفت‌وگو و توان ترمیم بعد از لمس یک نقطهٔ حساس، ظرفیت اصلی این ترکیب است.",
      friction:
        "زیر فشار، تعهد می‌تواند به اثبات وفاداری تبدیل شود و حساسیت قدیمی هر ابهام را شدیدتر نشان بدهد.",
    };
  }

  if (ids.includes("ceres") && ids.includes("juno")) {
    return {
      summary:
        "این ترکیب مراقبت را از حس خوب جدا می‌کند و به توافق و برابری وصل می‌کند: حمایت وقتی پایدارتر است که سهم هر طرف روشن باشد.",
      dailyLife:
        "در عمل، قول، تقسیم مسئولیت و درخواست کمک جایی است که باید مرز حمایت و مسئولیت را روشن کنی.",
      healthy:
        "مراقبت دوطرفه و تعهدی که انتظارهایش قابل گفت‌وگو باشند، شکل پختهٔ این ترکیب است.",
      friction:
        "زیر فشار، مراقبت می‌تواند به نجات‌دادن و تعهد به ماندن به‌خاطر شکل رابطه تبدیل شود.",
    };
  }

  if (ids.includes("ceres") && ids.includes("chiron")) {
    return {
      summary:
        "این ترکیب نشان می‌دهد مراقبت خودش می‌تواند نقطهٔ حساس باشد؛ حمایت وقتی مفیدتر است که به ترمیم کمک کند، نه اینکه جای انتخاب طرف مقابل را بگیرد.",
      dailyLife:
        "در عمل، کمک‌خواستن یا کمک‌کردن می‌تواند حساسیت قدیمی را فعال کند؛ اول روشن کن امروز واقعاً چه نیازی هست.",
      healthy:
        "مراقبتی که هم حمایت می‌دهد و هم فضای ترمیم و انتخاب را حفظ می‌کند، ظرفیت مهم این ترکیب است.",
      friction:
        "زیر فشار، حساسیت می‌تواند کمک را به نجات‌دادن یا ردکردن کمک تبدیل کند.",
    };
  }

  const labels = ids.map((id) => ADVANCED_BODY_NARRATIVE[id].label);
  return {
    summary:
      labels.join("، ") +
      " این داستان را به یک مسئلهٔ مشترک وصل می‌کنند: " +
      focuses.map((item) => item.focus).join("، ") +
      ".",
    dailyLife:
      "در عمل، این الگو وقتی روشن‌تر می‌شود که " +
      focuses.map((item) => item.dailyCue).join(" و ") +
      " در یک موقعیت به هم می‌رسند.",
    healthy:
      "شکل پختهٔ این ترکیب، " +
      focuses.map((item) => item.healthyCue).join(" و ") +
      " است.",
    friction:
      "زیر فشار، " +
      focuses.map((item) => item.frictionCue).join(" و ") +
      " می‌توانند هم‌زمان فعال شوند.",
  };
}

export function applyAdvancedBodyNarrativeSemanticsToStory(
  story: AdaptiveNarrativeAnchor,
): AdaptiveNarrativeAnchor {
  const ids = advancedBodyNarrativeIdsFromTitle(story.title);
  if (ids.length === 0) return story;

  const composed = composeAdvancedBodyNarrative(ids);
  return {
    ...story,
    summary: composed.summary,
    dailyLife: composed.dailyLife,
    healthyExpression: composed.healthy,
    friction: composed.friction,
  };
}


function applyFinalVoice(
  story: AdaptiveNarrativeAnchor,
  relevance: AdvancedRelevancePlan,
): {
  story: AdaptiveNarrativeAnchor;
  titleChanged: boolean;
  strongTone: boolean;
  predictive: boolean;
} {
  const matched = evidenceForStory(relevance, story.semanticKey);
  const absorbedMatched = story.absorbedSemanticKeys.flatMap((key) =>
    evidenceForStory(relevance, key),
  );
  const all = unique([...matched, ...absorbedMatched].map((item) => item.id))
    .map((id) => relevance.decisions.find((item) => item.id === id))
    .filter(
      (item): item is AdvancedRelevanceEvidence =>
        Boolean(item) && item?.evidenceKind !== "traditional-lot",
    );
  const strongest = all[0];
  const mergeEvidence = all.filter(
    (item) => item.decision === "merge" && item.evidenceKind === "special-point-aspect",
  );
  const strong = Boolean(
    (strongest &&
      strongest.evidenceKind === "special-point-aspect" &&
      strongest.score >= 84 &&
      strongest.decision === "merge") ||
      all.filter(
        (item) => item.evidenceKind === "special-point-aspect" && item.score >= 72,
      ).length >= 2,
  );
  const tags = unique(
    all.flatMap((item) => [...item.sharedThemeTags, ...item.themeTags]),
  );
  const current = splitTitle(story.title);
  const titleEligible = Boolean(
    story.kind !== "cluster" &&

    mergeEvidence.some((item) => item.score >= 84) && tags.length >= 2,
  );
  let title = story.title;
  let titleChanged = false;
  if (titleEligible) {
    const advancedFactors = unique(
      mergeEvidence
        .flatMap((item) => item.objectIds)
        .map((id) => OBJECT_LABELS[normalizeId(id)])
        .filter((label): label is string => Boolean(label)),
    );
    const baseFactors = story.sourcePlanetIds
      .map((id) => FACTOR_LABELS[normalizeId(id)] ?? "")
      .filter(Boolean);
    const factors = unique([...advancedFactors, ...baseFactors]).slice(0, 3);
    if (factors.length > 0) {
      title = `${factors.join("، ")} — ${themePhrase(tags, current.theme)}`;
      titleChanged = title !== story.title;
    }
  }

  const predictive = strong && tags.length >= 1;
  const prediction = predictive ? predictionFor(tags) : "";
  const dailyLife = story.dailyLife;
  // HALLEUS_R39_STRONG_TONE_RECONCILIATION_R7_20260901
  const directSummary = (() => {
    if (!strong) return story.summary;
    const trimmed = story.summary.trim();
    if (!/^(?:ممکن است|شاید|گاهی|احتمال دارد)/u.test(trimmed)) return trimmed;
    const theme = themePhrase(tags, current.theme);
    return `${theme} در این داستان پررنگ است؛ این الگو در تصمیم‌های واقعی‌ات خودش را نشان می‌دهد.`;
  })();

  return {
    story: {
      ...story,
      title,
      summary: directSummary,
      dailyLife:
        predictive && prediction && !dailyLife.includes(prediction)
          ? `${dailyLife} ${prediction}`.trim()
          : dailyLife,
      rankingReasons: story.rankingReasons.filter(
        (reason) =>
          !reason.includes("advanced evidence item") &&
          !reason.startsWith("سطح قطعیت روایت") &&
          !reason.startsWith("evidence-score="),
      ),
    },
    titleChanged,
    strongTone: strong,
    predictive,
  };
}

export function buildUnifiedStorySynthesis(input: {
  stories: AdaptiveNarrativeAnchor[];
  relevance: AdvancedRelevancePlan;
}): UnifiedStorySynthesisResult {
  const merged = mergeExistingStories(input.stories, input.relevance);
  const standalone = standaloneStories(input.relevance);
  const combined = [...merged.stories, ...standalone]
    .sort((a, b) => b.score - a.score || a.semanticKey.localeCompare(b.semanticKey));

  let strongTitleChangeCount = 0;
  let strongToneCount = 0;
  let predictiveLineCount = 0;
  const storyCandidates = combined.map((story) => {
    if (story.kind === "advanced-pattern") {
      strongTitleChangeCount += 1;
      strongToneCount += 1;
      predictiveLineCount += 1;
      return story;
    }
    const voiced = applyFinalVoice(story, input.relevance);
    if (voiced.titleChanged) strongTitleChangeCount += 1;
    if (voiced.strongTone) strongToneCount += 1;
    if (voiced.predictive) predictiveLineCount += 1;
    return voiced.story;
  });

  return {
    storyCandidates: storyCandidates.map(
      applyAdvancedBodyNarrativeSemanticsToStory,
    ),
    diagnostics: {
      version: UNIFIED_STORY_SYNTHESIS_VERSION,
      mergedExistingStoryCount: merged.mergedCount,
      standaloneAdvancedStoryCount: standalone.length,
      strongTitleChangeCount,
      strongToneCount,
      predictiveLineCount,
      corePlacementExpansion: false,
      weakAdvancedPromotion: false,
    },
  };
}
