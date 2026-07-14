import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type { AstrologyReport } from "@/types/astro";
import type { ReportOutputSection } from "@/types/report-output";

export const LIVE_REPORT_READING_CONTRACT_VERSION =
  "v0.1.320-live-report-reading-contract" as const;

export type LiveReportReadingContract = {
  summarySentences: string[];
  guide: string;
  reflectionQuestions: string[];
  chartRulerParagraphs: string[];
  activeHouseParagraphs: string[];
  nodeAxisParagraphs: string[];
  balanceParagraphs: string[];
  weeklyPractices: string[];
  readingMinutes: number;
};

const SECTION_IDS = {
  summary: "real-engine-first-synthesis",
  core: "real-engine-core-pattern",
  chartRuler: "real-engine-chart-ruler",
  houses: "real-engine-active-houses",
  nodes: "real-engine-node-axis",
  balance: "real-engine-balance",
  practices: "real-engine-personal-summary",
} as const;

const FALLBACK_SUMMARY_SENTENCES = [
  "این گزارش چند الگوی اصلی چارت را کنار هم می‌گذارد تا تصویر کلی روشن‌تر شود.",
  "هر بخش را بهتر است در کنار تجربه واقعی زندگی بخوانی، نه به‌عنوان یک برچسب ثابت.",
  "جایگاه‌ها نشان می‌دهند هر نیرو کجا بیشتر دیده می‌شود و رابطه‌ها نحوه همکاری یا اصطکاک آن‌ها را روشن می‌کنند.",
  "خانه‌های مهم، دست‌های ماه و ترکیب انرژی‌ها کمک می‌کنند این تصویر به موقعیت‌های واقعی وصل شود.",
  "در پایان فقط یک کار کوچک و قابل مشاهده را برای این هفته انتخاب کن.",
];

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200c\u200f\u202a-\u202e]/gu, "")
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/[.،؛:!?؟«»()\[\]{}\-–—]/gu, "")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

function splitParagraphs(body: string) {
  return body
    .replace(/\s+(چطور بخوانی:)/gu, "\n\n$1")
    .replace(/\s+(خلاصه فصل:)/gu, "\n\n$1")
    .replace(/\s+(برای تأمل:)/gu, "\n\n$1")
    .split(/\n{2,}/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanInterpretiveParagraph(paragraph: string) {
  return paragraph
    .replace(
      /(?:ادامهٔ?\s+)?(?:کشمکش اصلی|منبع همراه|ترجمهٔ روزمره|تمرین این هفته):\s*/gu,
      "",
    )
    .trim();
}

function isReaderCue(paragraph: string) {
  return /^(چطور بخوانی:|خلاصه فصل:)/u.test(paragraph);
}

function isReflection(paragraph: string) {
  return /^برای تأمل:/u.test(paragraph);
}

function stripReflectionPrefix(paragraph: string) {
  return paragraph.replace(/^برای تأمل:\s*/u, "").trim();
}

function splitSentences(text: string) {
  const matches = text.match(/[^.!؟]+[.!؟]?/gu) ?? [];
  return matches
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .map((sentence) => (/[.!؟]$/u.test(sentence) ? sentence : `${sentence}.`));
}

function getSection(
  sections: ReportOutputSection[],
  id: string,
): ReportOutputSection | undefined {
  return sections.find((section) => section.id === id);
}

function getInterpretiveParagraphs(section: ReportOutputSection | undefined) {
  if (!section) {
    return [];
  }

  const seen = new Set<string>();
  const output: string[] = [];

  for (const paragraph of splitParagraphs(section.body)) {
    if (isReaderCue(paragraph) || isReflection(paragraph)) {
      continue;
    }

    const cleaned = cleanInterpretiveParagraph(paragraph);
    const normalized = normalizeText(cleaned);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(cleaned);
  }

  return output;
}

function getReflectionQuestions(sections: ReportOutputSection[]) {
  const preferredIds = [
    SECTION_IDS.summary,
    SECTION_IDS.chartRuler,
    SECTION_IDS.houses,
    SECTION_IDS.nodes,
    SECTION_IDS.balance,
    SECTION_IDS.practices,
  ];
  const seen = new Set<string>();
  const questions: string[] = [];

  for (const id of preferredIds) {
    const section = getSection(sections, id);
    if (!section) {
      continue;
    }

    for (const paragraph of splitParagraphs(section.body)) {
      if (!isReflection(paragraph)) {
        continue;
      }

      const question = stripReflectionPrefix(paragraph);
      const normalized = normalizeText(question);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      questions.push(question);

      if (questions.length === 2) {
        return questions;
      }
    }
  }

  return questions;
}

function getWeeklyPractices(section: ReportOutputSection | undefined) {
  if (!section) {
    return [];
  }

  const match = section.body.match(
    /سه تمرین کوچک این چارت:\s*۱\)\s*(.*?)؛\s*۲\)\s*(.*?)؛\s*۳\)\s*(.*?)(?:\.|\n|$)/u,
  );

  if (!match) {
    return [];
  }

  return match
    .slice(1, 4)
    .map((practice) => practice.trim())
    .filter(Boolean);
}

function getAudienceGuide(report: AstrologyReport) {
  const mode = report.realEngine?.behavioralAudienceMode ?? "adult";

  if (mode === "caregiver") {
    return "این خلاصه برای همراه بزرگسال نوشته شده است؛ آن را با زبان ساده و بدون برچسب‌زدن به کودک بخوان.";
  }

  if (mode === "youth") {
    return "این خلاصه را مثل چند نشانه برای شناخت بهتر خودت بخوان؛ لازم نیست هیچ جمله‌ای را تعریف ثابت خودت بدانی.";
  }

  return "این خلاصه را یک‌بار بخوان و بعد فقط سراغ بخشی برو که به تجربه این روزهایت نزدیک‌تر است.";
}

function buildSummarySentences(
  report: AstrologyReport,
  sections: ReportOutputSection[],
) {
  const candidates = getInterpretiveParagraphs(
    getSection(sections, SECTION_IDS.summary),
  ).flatMap(splitSentences);
  const seen = new Set<string>();
  const output: string[] = [];

  for (const sentence of candidates) {
    const normalized = normalizeText(sentence);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(sentence);

    if (output.length === 5) {
      return output;
    }
  }

  for (const sentence of FALLBACK_SUMMARY_SENTENCES) {
    const normalized = normalizeText(sentence);
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(sentence);

    if (output.length === 5) {
      break;
    }
  }

  return output.slice(0, 5);
}

function takeUniquePrimaryParagraphs(
  seen: Set<string>,
  paragraphs: string[],
  limit: number,
) {
  const output: string[] = [];

  for (const paragraph of paragraphs) {
    const normalized = normalizeText(paragraph);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(paragraph);

    if (output.length === limit) {
      break;
    }
  }

  return output;
}

export function buildLiveReportReadingContract(
  report: AstrologyReport,
): LiveReportReadingContract {
  const enhanced = enhanceReportOutputV3(
    report as unknown as Record<string, unknown>,
  );
  const sections = enhanced.reportV3Sections;
  const parsedPractices = getWeeklyPractices(
    getSection(sections, SECTION_IDS.practices),
  );
  const fallbackPractices = [
    "یک الگوی تکرارشونده را در یک موقعیت واقعی ثبت کن.",
    "پیش از واکنش، یک مکث کوتاه و قابل اندازه‌گیری بساز.",
    "در پایان هفته بنویس کدام انتخاب کوچک بیشتر به تو کمک کرد.",
  ];
  const summarySentences = buildSummarySentences(report, sections);
  const primaryParagraphHashes = new Set(
    summarySentences.map(normalizeText),
  );
  const chartRulerParagraphs = takeUniquePrimaryParagraphs(
    primaryParagraphHashes,
    getInterpretiveParagraphs(getSection(sections, SECTION_IDS.chartRuler)),
    2,
  );
  const activeHouseParagraphs = takeUniquePrimaryParagraphs(
    primaryParagraphHashes,
    getInterpretiveParagraphs(getSection(sections, SECTION_IDS.houses)),
    2,
  );
  const nodeAxisParagraphs = takeUniquePrimaryParagraphs(
    primaryParagraphHashes,
    getInterpretiveParagraphs(getSection(sections, SECTION_IDS.nodes)),
    2,
  );
  const balanceParagraphs = takeUniquePrimaryParagraphs(
    primaryParagraphHashes,
    getInterpretiveParagraphs(getSection(sections, SECTION_IDS.balance)),
    3,
  );
  const weeklyPractices = takeUniquePrimaryParagraphs(
    primaryParagraphHashes,
    parsedPractices.length === 3 ? parsedPractices : fallbackPractices,
    3,
  );

  return {
    summarySentences,
    guide: getAudienceGuide(report),
    reflectionQuestions: getReflectionQuestions(sections).slice(0, 2),
    chartRulerParagraphs,
    activeHouseParagraphs,
    nodeAxisParagraphs,
    balanceParagraphs,
    weeklyPractices,
    readingMinutes: Math.min(
      13,
      Math.max(10, enhanced.reportV3Summary.readingMinutes),
    ),
  };
}
