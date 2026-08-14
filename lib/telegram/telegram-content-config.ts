import {
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";

export type TelegramAiContentSettings = {
  messagesPerDayMin: number;
  messagesPerDayMax: number;
  tone: string;
  messageLength: "short" | "mixed" | "medium";
  emojiPolicy: string;
  ctaStyle: string;
  contentMix: string;
  repetitionRule: string;
  messageTypes: string[];
};

export type TelegramAiContentConfig = {
  version: number;
  rawPrompt: string;
  settings: TelegramAiContentSettings;
  updatedAt: string | null;
  updatedBy: string | null;
  persisted: boolean;
};

export const DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS: TelegramAiContentSettings = {
  messagesPerDayMin: 50,
  messagesPerDayMax: 100,
  tone:
    "فارسی محاوره‌ای، جوان، زنده و shareable؛ شوخی و toxic-lite فقط وقتی واضحاً شوخی است و آزاردهنده نیست.",
  messageLength: "mixed",
  emojiPolicy:
    "ایموجی و :) :( :(( :)) xd طبیعی و متنوع باشد؛ نه در همه پیام‌ها و نه با الگوی تکراری.",
  ctaStyle:
    "اکثریت پیام‌ها بدون CTA؛ CTA فقط وقتی ادامهٔ طبیعی همان پیام است و label فارسی غیرتبلیغاتی دارد.",
  contentMix:
    "ترکیب خبر رویداد، آموزش کوتاه، کوئیز/میم، sign-impact و recap؛ filler نامرتبط برای پرکردن تعداد ممنوع.",
  repetitionRule:
    "opening، ریتم، سناریو، CTA و wikiSlugها تکراری نشوند؛ اگر فقط اسم ساین عوض شده متن بازنویسی شود.",
  messageTypes: [
    "event_news",
    "same_day_education",
    "quiz_or_meme",
    "sign_impact",
    "natal_spotlight",
    "recap",
    "future_teaser",
  ],
};

export const DEFAULT_TELEGRAM_AI_RAW_PROMPT = `برای دادهٔ موتور هالیوس، پیام‌های تلگرام فارسی بساز.

لحن و شکل پیام:
- محاوره‌ای، جوان، زنده و قابل فوروارد.
- متن‌ها قالب یکسان نداشته باشند.
- از filler عمومی که به دادهٔ همان روز وصل نیست استفاده نکن.
- تعداد و mix پیام‌ها را از تنظیمات محتوایی همین بسته رعایت کن.
- CTA فقط وقتی طبیعی است اضافه شود.

این دستور فقط لحن، تنوع، تعداد و فرم محتوا را کنترل می‌کند.
هیچ دادهٔ نجومی، زمان event، sourceRef، provenance، safety rule یا محدودیت فنی موتور را تغییر نده و چیزی خارج از facts بسته اختراع نکن.`;

function normalizeSettings(value: unknown): TelegramAiContentSettings {
  const record = asRecord(value);
  const messagesPerDayMin = Math.trunc(asNumber(record.messagesPerDayMin));
  const messagesPerDayMax = Math.trunc(asNumber(record.messagesPerDayMax));
  const messageLength = asString(record.messageLength);
  const rawTypes = Array.isArray(record.messageTypes)
    ? record.messageTypes
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 30)
    : [];

  if (
    messagesPerDayMin < 1 ||
    messagesPerDayMin > 120 ||
    messagesPerDayMax < messagesPerDayMin ||
    messagesPerDayMax > 120
  ) {
    throw new Error("Telegram AI messages/day must be between 1 and 120.");
  }
  if (!["short", "mixed", "medium"].includes(messageLength)) {
    throw new Error("Telegram AI messageLength is invalid.");
  }

  const readText = (key: string, fallback: string, max: number) => {
    const text = asString(record[key]).trim();
    if (!text) return fallback;
    if (text.length > max) {
      throw new Error(`Telegram AI ${key} is too long.`);
    }
    return text;
  };

  return {
    messagesPerDayMin,
    messagesPerDayMax,
    tone: readText("tone", DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.tone, 700),
    messageLength:
      messageLength as TelegramAiContentSettings["messageLength"],
    emojiPolicy: readText(
      "emojiPolicy",
      DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.emojiPolicy,
      700,
    ),
    ctaStyle: readText(
      "ctaStyle",
      DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.ctaStyle,
      700,
    ),
    contentMix: readText(
      "contentMix",
      DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.contentMix,
      1200,
    ),
    repetitionRule: readText(
      "repetitionRule",
      DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.repetitionRule,
      900,
    ),
    messageTypes: rawTypes.length
      ? rawTypes
      : DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS.messageTypes,
  };
}

function fallbackConfig(): TelegramAiContentConfig {
  return {
    version: 1,
    rawPrompt: DEFAULT_TELEGRAM_AI_RAW_PROMPT,
    settings: DEFAULT_TELEGRAM_AI_CONTENT_SETTINGS,
    updatedAt: null,
    updatedBy: null,
    persisted: false,
  };
}

// HALLEUS_TELEGRAM_AI_CONTENT_CONFIG_R1
export async function getTelegramAiContentConfig(): Promise<TelegramAiContentConfig> {
  const sql = getAdminDatabase();
  try {
    const rows = await sql`
      select
        config_version,
        raw_prompt,
        settings,
        updated_at::text as updated_at,
        updated_by::text as updated_by
      from halleus_private.telegram_ai_content_config
      where singleton = true
      limit 1
    `;
    if (!rows[0]) return fallbackConfig();
    const row = asRecord(rows[0]);
    return {
      version: Math.max(1, Math.trunc(asNumber(row.config_version))),
      rawPrompt: asString(row.raw_prompt) || DEFAULT_TELEGRAM_AI_RAW_PROMPT,
      settings: normalizeSettings(row.settings),
      updatedAt: asString(row.updated_at) || null,
      updatedBy: asString(row.updated_by) || null,
      persisted: true,
    };
  } catch {
    // The unreleased migration may not exist in the current local/prod DB yet.
    // Transit-pack generation must remain usable with safe immutable defaults.
    return fallbackConfig();
  }
}

export async function updateTelegramAiContentConfig(input: {
  rawPrompt: string;
  settings: unknown;
  actorUserId: string;
}) {
  const rawPrompt = input.rawPrompt.trim();
  if (rawPrompt.length < 40 || rawPrompt.length > 12_000) {
    throw new Error(
      "Telegram AI raw prompt must contain between 40 and 12,000 characters.",
    );
  }
  const settings = normalizeSettings(input.settings);
  const sql = getAdminDatabase();
  const rows = await sql`
    update halleus_private.telegram_ai_content_config
    set config_version = config_version + 1,
        raw_prompt = ${rawPrompt},
        settings = ${sql.json(settings)},
        updated_by = ${input.actorUserId}::uuid,
        updated_at = now()
    where singleton = true
    returning
      config_version,
      raw_prompt,
      settings,
      updated_at::text as updated_at,
      updated_by::text as updated_by
  `;
  if (!rows[0]) {
    throw new Error(
      "Telegram AI content config row is missing. Apply the pending Telegram admin migration before saving.",
    );
  }
  const row = asRecord(rows[0]);
  return {
    version: Math.max(1, Math.trunc(asNumber(row.config_version))),
    rawPrompt: asString(row.raw_prompt),
    settings: normalizeSettings(row.settings),
    updatedAt: asString(row.updated_at),
    updatedBy: asString(row.updated_by),
    persisted: true,
  } satisfies TelegramAiContentConfig;
}
