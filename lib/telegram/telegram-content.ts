import type {
  SkyDailyMotionState,
  SkyDailySnapshot,
  SkyDailyZodiacSign,
} from "@/lib/sky-daily/sky-daily-contract";

export const TELEGRAM_CONTENT_CONTRACT_VERSION = "telegram-content-v1" as const;
export const TELEGRAM_PARSE_MODE = "HTML" as const;

export type TelegramContentClass =
  | "engine_backed"
  | "evergreen"
  | "shareable";

export type TelegramContentType =
  | "sky_moon_position"
  | "evergreen_taurus_boundary"
  | "shareable_virgo_start";

export type TelegramCtaTarget = "sky" | "chart";

export type TelegramCta = {
  label: string;
  target: TelegramCtaTarget;
};

export type TelegramEngineProvenance = {
  sourceType: "sky_daily_snapshot";
  snapshotId: string;
  snapshotLocalDate: string;
  calculationSource: string;
  calculationVersion: string;
  factType: "planetary_state";
  relatedBodies: ["moon"];
  generatedAt: string;
};

export type TelegramWriterInput = {
  contentType: TelegramContentType;
  sourceFacts: Record<string, string | number | boolean | null>;
  allowedClaims: string[];
  signTargets: string[];
  tone: "young_conversational";
  length: "short" | "medium";
  cta: TelegramCta | null;
  hashtags: string[];
  scheduledWindow: {
    startAt: string;
    endAt: string;
  };
};

export type TelegramRenderedPayload = {
  text: string;
  parseMode: typeof TELEGRAM_PARSE_MODE;
  disableWebPagePreview: true;
};

export type TelegramPlannedContent = {
  contractVersion: typeof TELEGRAM_CONTENT_CONTRACT_VERSION;
  contentKey: string;
  contentClass: TelegramContentClass;
  contentType: TelegramContentType;
  writerInput: TelegramWriterInput;
  provenance: TelegramEngineProvenance | null;
  cta: TelegramCta | null;
  scheduledFor: string;
  generatedAt: string;
  payload: TelegramRenderedPayload;
};

const SIGN_LABELS: Record<SkyDailyZodiacSign, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

const MOTION_LABELS: Record<SkyDailyMotionState, string> = {
  direct: "مستقیم",
  retrograde: "پس‌رو",
  stationing: "نزدیک ایست",
};

const MOON_PHASE_LABELS = {
  new: "ماه نو",
  waxing: "رو به افزایش",
  full: "ماه کامل",
  waning: "رو به کاهش",
} as const;

function addMinutes(iso: string, minutes: number) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Telegram scheduled time is invalid.");
  }
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeHashtag(value: string) {
  const normalized = value.trim();
  if (!/^#[\p{L}\p{N}_]+$/u.test(normalized)) {
    throw new Error(`Telegram hashtag is invalid: ${value}`);
  }
  return normalized;
}

function resolveCtaUrl(siteUrl: string, target: TelegramCtaTarget) {
  const route = target === "sky" ? "/sky" : "/chart";
  return new URL(route, siteUrl).toString();
}

export function writeTelegramPersianCopy(input: TelegramWriterInput) {
  if (input.contentType === "sky_moon_position") {
    const sign = String(input.sourceFacts.sign ?? "");
    const degree = Number(input.sourceFacts.degreeInSign);
    const motion = String(input.sourceFacts.motion ?? "");
    const moonPhase = String(input.sourceFacts.moonPhase ?? "");
    if (!sign || !Number.isFinite(degree) || !motion) {
      throw new Error("Engine-backed Telegram writer input is missing Moon facts.");
    }
    const degreeFa = new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: 1,
    }).format(degree);
    const phaseText = moonPhase ? `؛ فاز ماه هم «${moonPhase}» ثبت شده` : "";
    return `ماه در دادهٔ امروز هالیوس در ${sign}، حوالی ${degreeFa} درجه است و حرکتش ${motion} ثبت شده${phaseText}.`;
  }

  if (input.contentType === "evergreen_taurus_boundary") {
    return "ثور، امنیت فقط ماندن نیست؛ گاهی یعنی روشن بگی چه چیزی برات قابل‌قبوله و چه چیزی نه.";
  }

  return "سنبله، لازم نیست قبل از شروع جواب همهٔ سؤال‌ها رو پیدا کنی؛ یک قدم کوچک هم شروع حساب می‌شه.";
}

export function renderTelegramPayload(input: TelegramWriterInput, siteUrl: string) {
  const body = escapeTelegramHtml(writeTelegramPersianCopy(input));
  const parts = [body];

  if (input.cta) {
    const href = escapeTelegramHtml(resolveCtaUrl(siteUrl, input.cta.target));
    const label = escapeTelegramHtml(input.cta.label);
    parts.push(`<a href="${href}">${label}</a>`);
  }

  const hashtags = input.hashtags.map(normalizeHashtag);
  if (hashtags.length > 0) {
    parts.push(hashtags.join(" "));
  }

  const text = parts.join("\n\n");
  if (text.length > 4096) {
    throw new Error("Telegram message exceeds the sendMessage text limit.");
  }

  return {
    text,
    parseMode: TELEGRAM_PARSE_MODE,
    disableWebPagePreview: true as const,
  };
}

function createEngineMoonItem(input: {
  snapshot: SkyDailySnapshot;
  siteUrl: string;
  scheduledFor: string;
  generatedAt: string;
}): TelegramPlannedContent | null {
  if (input.snapshot.errors.length > 0) return null;
  const moon = input.snapshot.planetaryStates.find((state) => state.body === "moon");
  if (!moon) return null;

  const moonPhase = input.snapshot.moonPhase?.phase
    ? MOON_PHASE_LABELS[input.snapshot.moonPhase.phase]
    : null;
  const writerInput: TelegramWriterInput = {
    contentType: "sky_moon_position",
    sourceFacts: {
      body: "moon",
      sign: SIGN_LABELS[moon.sign],
      degreeInSign: moon.degreeInSign,
      motion: MOTION_LABELS[moon.motion],
      moonPhase,
      apparentSpeedDegreesPerDay: moon.apparentSpeedDegreesPerDay,
    },
    allowedClaims: [
      "moon.sign",
      "moon.degreeInSign",
      "moon.motion",
      "moon.phase",
    ],
    signTargets: [moon.sign],
    tone: "young_conversational",
    length: "medium",
    cta: { label: "آسمون امروز رو ببین", target: "sky" },
    hashtags: ["#ماه", "#هالیوس_امروز"],
    scheduledWindow: {
      startAt: input.scheduledFor,
      endAt: addMinutes(input.scheduledFor, 15),
    },
  };
  const provenance: TelegramEngineProvenance = {
    sourceType: "sky_daily_snapshot",
    snapshotId: input.snapshot.id,
    snapshotLocalDate: input.snapshot.input.localDate,
    calculationSource: input.snapshot.source,
    calculationVersion: input.snapshot.calculationVersion,
    factType: "planetary_state",
    relatedBodies: ["moon"],
    generatedAt: input.snapshot.generatedAt,
  };

  return {
    contractVersion: TELEGRAM_CONTENT_CONTRACT_VERSION,
    contentKey: `sky:${input.snapshot.id}:moon-position`,
    contentClass: "engine_backed",
    contentType: "sky_moon_position",
    writerInput,
    provenance,
    cta: writerInput.cta,
    scheduledFor: input.scheduledFor,
    generatedAt: input.generatedAt,
    payload: renderTelegramPayload(writerInput, input.siteUrl),
  };
}

function createEvergreenItem(input: {
  localDate: string;
  siteUrl: string;
  scheduledFor: string;
  generatedAt: string;
}): TelegramPlannedContent {
  const writerInput: TelegramWriterInput = {
    contentType: "evergreen_taurus_boundary",
    sourceFacts: {},
    allowedClaims: ["evergreen.sign_archetype_only"],
    signTargets: ["taurus"],
    tone: "young_conversational",
    length: "short",
    cta: { label: "چارت تولدت رو بساز", target: "chart" },
    hashtags: ["#ثور", "#آسترولوژی"],
    scheduledWindow: {
      startAt: input.scheduledFor,
      endAt: addMinutes(input.scheduledFor, 20),
    },
  };
  return {
    contractVersion: TELEGRAM_CONTENT_CONTRACT_VERSION,
    contentKey: `evergreen:${input.localDate}:taurus-boundary-v1`,
    contentClass: "evergreen",
    contentType: "evergreen_taurus_boundary",
    writerInput,
    provenance: null,
    cta: writerInput.cta,
    scheduledFor: input.scheduledFor,
    generatedAt: input.generatedAt,
    payload: renderTelegramPayload(writerInput, input.siteUrl),
  };
}

function createShareableFallback(input: {
  localDate: string;
  siteUrl: string;
  scheduledFor: string;
  generatedAt: string;
}): TelegramPlannedContent {
  const writerInput: TelegramWriterInput = {
    contentType: "shareable_virgo_start",
    sourceFacts: {},
    allowedClaims: ["evergreen.reflection_only"],
    signTargets: ["virgo"],
    tone: "young_conversational",
    length: "short",
    cta: null,
    hashtags: ["#سنبله"],
    scheduledWindow: {
      startAt: input.scheduledFor,
      endAt: addMinutes(input.scheduledFor, 20),
    },
  };
  return {
    contractVersion: TELEGRAM_CONTENT_CONTRACT_VERSION,
    contentKey: `shareable:${input.localDate}:virgo-start-v1`,
    contentClass: "shareable",
    contentType: "shareable_virgo_start",
    writerInput,
    provenance: null,
    cta: null,
    scheduledFor: input.scheduledFor,
    generatedAt: input.generatedAt,
    payload: renderTelegramPayload(writerInput, input.siteUrl),
  };
}

export function createTelegramMvpContentPlan(input: {
  snapshot: SkyDailySnapshot | null;
  siteUrl: string;
  localDate: string;
  now: Date;
}) {
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("Telegram planning time is invalid.");
  }
  const generatedAt = input.now.toISOString();
  const engineItem = input.snapshot
    ? createEngineMoonItem({
        snapshot: input.snapshot,
        siteUrl: input.siteUrl,
        scheduledFor: generatedAt,
        generatedAt,
      })
    : null;
  const evergreen = createEvergreenItem({
    localDate: input.localDate,
    siteUrl: input.siteUrl,
    scheduledFor: addMinutes(generatedAt, engineItem ? 4 : 0),
    generatedAt,
  });

  if (engineItem) return [engineItem, evergreen];

  return [
    evergreen,
    createShareableFallback({
      localDate: input.localDate,
      siteUrl: input.siteUrl,
      scheduledFor: addMinutes(generatedAt, 4),
      generatedAt,
    }),
  ];
}