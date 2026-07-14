"use client";

import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import type { AstrologyReport } from "@/types/astro";

type SpecialPointEngine = {
  lunarNodes?: {
    status?: string;
    nodeType?: string;
    northNode?: SpecialPointNode | null;
    southNode?: SpecialPointNode | null;
  } | null;
  lilith?: SpecialPointLilith | null;
} | null;

type SpecialPointReport = AstrologyReport & {
  realEngine?: SpecialPointEngine;
};

type SpecialPointNode = {
  id?: string;
  signId?: string;
  degreeInSign?: number;
  house?: number | null;
  longitude?: number;
};

type SpecialPointLilith = {
  id?: string;
  status?: string;
  lilithType?: string;
  signId?: string;
  degreeInSign?: number;
  house?: number | null;
  approvedForReportOutput?: boolean;
};

type NarrativeCard = {
  id: string;
  title: string;
  position: string;
  source: string;
  theme: string;
  helpful: string;
  growth: string;
  trust: string;
};

type LilithBoundaryCard = {
  id: string;
  title: string;
  position: string;
  source: string;
  status: string;
  boundary: string;
};

const SPECIAL_POINTS_DEEP_NARRATIVE_VERSION =
  "v0.1.262-report-special-points-deep-narrative" as const;

const SPECIAL_POINTS_FINAL_QA_VERSION =
  "v0.1.288-report-special-points-transit-final-qa" as const;

export function ReportSpecialPointsNarrativeSection({
  report,
}: {
  report: AstrologyReport;
}) {
  const engine = (report as SpecialPointReport).realEngine ?? null;
  const lunarNodeCards = buildLunarNodeCards(engine?.lunarNodes ?? null);
  const lilithNarrativeCard = buildLilithNarrativeCard(engine?.lilith ?? null);
  const lilithBoundaryCard = buildLilithBoundaryCard(engine?.lilith ?? null);
  if (lunarNodeCards.length === 0 && !lilithNarrativeCard && !lilithBoundaryCard) {
    return null;
  }

  return (
    <section
      className="report-section report-special-points-narrative-section"
      data-special-points-deep-narrative={SPECIAL_POINTS_DEEP_NARRATIVE_VERSION}
      data-special-points-final-qa={SPECIAL_POINTS_FINAL_QA_VERSION}
      aria-label="دست‌های ماه؛ الگوی آشنا و انتخاب تازه"
    >
      <div className="report-section-heading">
        <span className="report-kicker">محور رشد</span>
        <h2>دست‌های ماه — الگوی آشنا، انتخاب تازه</h2>
        <p data-report-narrative-quality-pass="special-points-bridge">این دو نقطه کنار جایگاه‌ها و رابطه‌های سیاره‌ای نشان می‌دهند کدام پاسخ آشناتر است و کدام انتخاب به تمرین تازه نیاز دارد.</p>
      </div>

      {lunarNodeCards.length > 0 ? (
        <div className="report-aspect-grid report-special-points-grid">
          {lunarNodeCards.map((card) => (
            <article className="report-aspect-card" key={card.id}>
              <h3>{card.title}</h3>
              <p className="report-muted-note">{card.position}</p>
              <p>{card.theme}</p>
              <ul>
                <li>
                  <strong>سمت کمک‌کننده:</strong> {card.helpful}
                </li>
                <li>
                  <strong>سمت رشدی:</strong> {card.growth}
                </li>
              </ul>
            </article>
          ))}
        </div>
      ) : null}

      {lilithNarrativeCard || lilithBoundaryCard ? (
        <details className="notice report-notice report-special-point-boundary-card">
          <summary>جزئیات فنی لیلیت</summary>
          {lilithNarrativeCard ? (
            <>
              <h3>{lilithNarrativeCard.title}</h3>
              <p>{lilithNarrativeCard.position}</p>
              <p>{lilithNarrativeCard.theme}</p>
              <p>{lilithNarrativeCard.trust}</p>
            </>
          ) : null}
          {lilithBoundaryCard ? (
            <>
              <h3>{lilithBoundaryCard.title}</h3>
              <p>{lilithBoundaryCard.position}</p>
              <p>{lilithBoundaryCard.status}</p>
              <p>{lilithBoundaryCard.boundary}</p>
            </>
          ) : null}
          <p className="report-muted-note">
            مدل‌ها در داده حفظ می‌شود؛ دست‌های ماه و لیلیت جدا نگه داشته می‌شوند و هیچ‌کدام بی‌اجازه جای دیگری را نمی‌گیرد.
          </p>
        </details>
      ) : null}
    </section>
  );
}

function buildLunarNodeCards(
  lunarNodes: NonNullable<SpecialPointEngine>["lunarNodes"],
): NarrativeCard[] {
  if (
    !lunarNodes ||
    lunarNodes.status !== "calculated" ||
    !isValidNode(lunarNodes.northNode) ||
    !isValidNode(lunarNodes.southNode)
  ) {
    return [];
  }

  const source = formatNodeSource(lunarNodes.nodeType);

  return [
    {
      id: "north-node-deep-narrative",
      title: "دست شمالی ماه: تمرین رشد",
      position: formatPointPosition(lunarNodes.northNode),
      source,
      theme:
        "دست شمالی ماه در این مدل جهتی را نشان می‌دهد که ممکن است ابتدا ناآشنا باشد و با تجربه‌ی تدریجی به یک مهارت تازه تبدیل شود.",
      helpful:
        "این نقطه را مثل مسیر تمرین بخوان: یک انتخاب کوچک، تکرارشونده و قابل مشاهده، نه تصویری کامل و بی‌نقص از آینده.",
      growth:
        "چالش طبیعی این است که بخش ناآشنا زود کنار گذاشته شود. رشد یعنی نزدیک شدن تدریجی به این جهت، بدون انکار توانایی‌های قبلی.",
      trust:
        `این کارت از ${source} استفاده می‌کند و مدل را جداگانه نگه می‌دارد تا محور میانگین و محور نوسانی/واقعی با هم قاطی نشوند.`,
    },
    {
      id: "south-node-deep-narrative",
      title: "دست جنوبی ماه: الگوی آشنا",
      position: formatPointPosition(lunarNodes.southNode),
      source: `${source}؛ نقطه‌ی مقابل دست شمالی`,
      theme:
        "دست جنوبی ماه بیشتر از الگو، مهارت یا واکنشی می‌گوید که آشناتر است و در فشارها راحت‌تر به آن برمی‌گردی.",
      helpful:
        "این نقطه می‌تواند یک توانایی قدیمی باشد. لازم نیست حذف شود؛ بهتر است آگاهانه به کار گرفته شود و همه‌ی تصمیم‌ها را به تنهایی هدایت نکند.",
      growth:
        "چالش وقتی شروع می‌شود که الگوی آشنا به تنها پناهگاه تبدیل شود. مسیر رشد احترام به گذشته است، بدون ماندن همیشگی در همان پاسخ.",
      trust:
        "دست جنوبی در این داده از محور مقابل دست شمالی به دست آمده و محاسبه‌ی مستقل یا مدل مبهم دیگری نیست.",
    },
  ];
}

function buildLilithNarrativeCard(
  lilith: SpecialPointLilith | null,
): NarrativeCard | null {
  if (!isCalculatedLilith(lilith) || lilith.approvedForReportOutput !== true) {
    return null;
  }

  return {
    id: "lilith-approved-narrative",
    title: "لیلیت: مرز و حساسیت",
    position: formatPointPosition(lilith),
    source: "لیلیت سیاه‌ماه با مدل نوسانی/واقعی محلی",
    theme:
      "وقتی مجوز خوانش فعال باشد، این نقطه فقط به‌عنوان یک لایه‌ی مکمل درباره مرز، حساسیت و میل خام خوانده می‌شود؛ نه هویت کامل یا حکم قطعی.",
    helpful:
      "از این نقطه برای دیدن موقعیت‌هایی استفاده کن که در آن‌ها مرز روشن‌تر یا صداقت بیشتری با خواسته‌ها لازم است.",
    growth:
      "چالش این است که حساسیت یا میل به برچسب ثابت تبدیل شود. خوانش سالم آن را در کنار کل چارت و تجربه‌ی واقعی نگه می‌دارد.",
    trust:
      "مجوز ورود این مدل به روایت در خود داده‌ی گزارش فعال است و مدل آن از لیلیت میانگین، سیارک ۱۱۸۱ و دارک‌مون/والدماث جدا نگه داشته می‌شود.",
  };
}

function buildLilithBoundaryCard(
  lilith: SpecialPointLilith | null,
): LilithBoundaryCard | null {
  if (!isCalculatedLilith(lilith) || lilith.approvedForReportOutput === true) {
    return null;
  }

  return {
    id: "lilith-technical-boundary",
    title: "لیلیت نوسانی/واقعی محلی",
    position: formatPointPosition(lilith),
    source: "جایگاه محاسبه‌شده؛ روایت غیرفعال",
    status: "جایگاه برای شفافیت فنی نمایش داده می‌شود، اما مجوز ورود به روایت تفسیری فعال نیست.",
    boundary:
      "این نقطه در جمع‌بندی شخصیت، رابطه، مسیر رشد یا تمرین‌های گزارش استفاده نمی‌شود. فعال‌شدن روایت به تصمیم و اعتبارسنجی جداگانه نیاز دارد.",
  };
}

function isValidNode(node: SpecialPointNode | null | undefined): node is SpecialPointNode {
  return Boolean(
    node &&
      typeof node.signId === "string" &&
      typeof node.degreeInSign === "number" &&
      Number.isFinite(node.degreeInSign),
  );
}

function isCalculatedLilith(lilith: SpecialPointLilith | null): lilith is SpecialPointLilith {
  return Boolean(
    lilith &&
      lilith.status === "calculated" &&
      lilith.id === "black-moon-lilith" &&
      lilith.lilithType === "local-true-osculating-black-moon-lilith" &&
      typeof lilith.signId === "string" &&
      typeof lilith.degreeInSign === "number" &&
      Number.isFinite(lilith.degreeInSign),
  );
}

function formatPointPosition(point: SpecialPointNode | SpecialPointLilith): string {
  const signLabel = point.signId
    ? formatZodiacLabel(point.signId as Parameters<typeof formatZodiacLabel>[0])
    : "نشان نامشخص";
  const degreeLabel =
    typeof point.degreeInSign === "number"
      ? `درجه ${formatPersianNumber(point.degreeInSign)}`
      : "درجه نامشخص";
  const houseLabel =
    typeof point.house === "number" ? `خانه ${formatPersianNumber(point.house)}` : null;

  return [signLabel, degreeLabel, houseLabel].filter(Boolean).join("، ");
}

function formatNodeSource(nodeType: string | undefined): string {
  if (nodeType === "local-true-osculating") {
    return "دست‌های ماه با مدل نوسانی/واقعی محلی";
  }

  if (nodeType === "mean") {
    return "دست‌های ماه با مدل میانگین";
  }

  return "دست‌های ماه با مدل ثبت‌شده در گزارش";
}

function formatPersianNumber(value: number): string {
  return value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}
