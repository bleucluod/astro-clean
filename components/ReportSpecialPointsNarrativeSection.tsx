"use client";

import {
  buildLilithReportInterpretation,
  type LilithReportInterpretation,
} from "@/lib/astrology/lilith-report-interpretation";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import type {
  AstrologyReport,
  RealEngineReportCalculatedLilith,
  RealEngineReportPlacement,
} from "@/types/astro";

type SpecialPointEngine = {
  lunarNodes?: {
    status?: string;
    nodeType?: string;
    northNode?: SpecialPointNode | null;
    southNode?: SpecialPointNode | null;
  } | null;
  lilith?: SpecialPointLilith | null;
  placements?: RealEngineReportPlacement[];
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
  modelId?: string;
  lilithType?: string;
  longitude?: number;
  signId?: string;
  degreeInSign?: number;
  house?: number | null;
  approvedForReportOutput?: boolean;
  validationStatus?: string;
  validationReference?: string;
  validationToleranceDegrees?: number;
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
const VALIDATED_LILITH_REPORT_VERSION =
  "v0.1.370-validated-lilith-report-interpretation" as const;

export function ReportSpecialPointsNarrativeSection({
  report,
  showNodes = true,
}: {
  report: AstrologyReport;
  showNodes?: boolean;
}) {
  const engine = (report as SpecialPointReport).realEngine ?? null;
  const lunarNodeCards = showNodes
    ? buildLunarNodeCards(engine?.lunarNodes ?? null)
    : [];
  const lilith = engine?.lilith ?? null;
  const approvedLilith = isApprovedLilith(lilith) ? lilith : null;
  const lilithInterpretation = approvedLilith
    ? buildLilithReportInterpretation({
        lilith: approvedLilith,
        placements: engine?.placements ?? [],
      })
    : null;
  const lilithBoundaryCard = buildLilithBoundaryCard(lilith);

  if (
    lunarNodeCards.length === 0 &&
    !lilithInterpretation &&
    !lilithBoundaryCard
  ) {
    return null;
  }

  return (
    <section
      className="report-section report-special-points-narrative-section"
      data-special-points-deep-narrative={SPECIAL_POINTS_DEEP_NARRATIVE_VERSION}
      data-special-points-final-qa={SPECIAL_POINTS_FINAL_QA_VERSION}
      data-validated-lilith-report={VALIDATED_LILITH_REPORT_VERSION}
      aria-label="دست‌های ماه و لیلیت؛ الگوی آشنا، انتخاب تازه و مرزهای شخصی"
    >
      <div className="report-section-heading">
        <span className="report-kicker">محور رشد</span>
        <h2>دست‌های ماه — الگوی آشنا، انتخاب تازه</h2>
        <p data-report-narrative-quality-pass="special-points-bridge">
          دست‌های ماه مسیر میان پاسخ آشنا و تمرین تازه را نشان می‌دهند؛
          لیلیت، وقتی دادهٔ معتبر و مجوز روایت دارد، لایه‌ای محدود درباره مرز،
          حساسیت و صداقت با خواسته‌ها اضافه می‌کند.
        </p>
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

      {approvedLilith && lilithInterpretation ? (
        <LilithNarrativeCard
          interpretation={lilithInterpretation}
          lilith={approvedLilith}
        />
      ) : null}

      {lilithBoundaryCard ? (
        <details className="notice report-notice report-special-point-boundary-card">
          <summary>جزئیات فنی لیلیت</summary>
          <h3>{lilithBoundaryCard.title}</h3>
          <p>{lilithBoundaryCard.position}</p>
          <p>{lilithBoundaryCard.status}</p>
          <p>{lilithBoundaryCard.boundary}</p>
          <p className="report-muted-note">
            این جایگاه با تعریف مشخص خودش خوانده می‌شود؛ لیلیت میانگین، دارک‌مون/والدماث و سیارک ۱۱۸۱ تعریف‌های دیگری هستند و با آن یکی نیستند.
          </p>
        </details>
      ) : null}
    </section>
  );
}

function LilithNarrativeCard({
  interpretation,
  lilith,
}: {
  interpretation: LilithReportInterpretation;
  lilith: RealEngineReportCalculatedLilith;
}) {
  return (
    <article
      className="report-aspect-card report-special-points-lilith-card"
      data-lilith-interpretation-version={interpretation.version}
    >
      <span className="report-kicker">مرز و حساسیت</span>
      <h3>لیلیت: مرز، حساسیت و صداقت با خواسته‌ها</h3>
      <p className="report-muted-note">{formatPointPosition(lilith)}</p>
      <p>{interpretation.signText}</p>
      {interpretation.houseText ? <p>{interpretation.houseText}</p> : null}
      <ul>
        <li>
          <strong>بیان کمک‌کننده:</strong> {interpretation.helpfulText}
        </li>
        <li>
          <strong>نقطهٔ اصطکاک:</strong> {interpretation.growthText}
        </li>
      </ul>

      {interpretation.aspects.length > 0 ? (
        <div className="report-special-points-lilith-aspects">
          <h4>پیوندهای پررنگ لیلیت با چارت</h4>
          {interpretation.aspects.map((aspect) => (
            <div className="mini-card" key={aspect.id}>
              <strong>
                {aspect.aspectLabel} با {aspect.planetLabel}
              </strong>
              <p>{aspect.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="report-muted-note">
          در محدودهٔ محافظه‌کارانهٔ این گزارش، جنبهٔ اصلیِ نزدیکی برای لیلیت
          انتخاب نشد؛ این به معنی بی‌اهمیت‌بودن جایگاه نیست.
        </p>
      )}

      <p>
        <strong>آزمایش کوچک:</strong> {interpretation.practiceText}
      </p>
      <details className="report-special-points-lilith-trust">
        <summary>پشتوانه و محدودیت این خوانش</summary>
        <p>{interpretation.trustText}</p>
        <p>
          مرجع اعتبارسنجی: چند مرجع نجومی از پیش بررسی‌شده؛ حداکثر اختلاف مجاز
          {` ${formatPersianNumber(lilith.validationToleranceDegrees)} درجه`}.
        </p>
        <p>
          این توضیح فقط به گزارش تولد مربوط است و درباره وضعیت روز یا نمایش روی چرخ ادعای جداگانه‌ای ندارد.
        </p>
      </details>
    </article>
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
        "دست شمالی ماه در این مدل جهتی را نشان می‌دهد که ممکن است ابتدا ناآشنا باشد و با تجربهٔ تدریجی به یک مهارت تازه تبدیل شود.",
      helpful:
        "این نقطه را مثل مسیر تمرین بخوان: یک انتخاب کوچک، تکرارشونده و قابل مشاهده، نه تصویری کامل و بی‌نقص از آینده.",
      growth:
        "چالش طبیعی این است که بخش ناآشنا زود کنار گذاشته شود. رشد یعنی نزدیک‌شدن تدریجی به این جهت، بدون انکار توانایی‌های قبلی.",
      trust: `این کارت از ${source} استفاده می‌کند و مدل را جداگانه نگه می‌دارد تا محور میانگین و محور نوسانی/واقعی با هم قاطی نشوند.`,
    },
    {
      id: "south-node-deep-narrative",
      title: "دست جنوبی ماه: الگوی آشنا",
      position: formatPointPosition(lunarNodes.southNode),
      source: `${source}؛ نقطهٔ مقابل دست شمالی`,
      theme:
        "دست جنوبی ماه بیشتر از الگو، مهارت یا واکنشی می‌گوید که آشناتر است و در فشارها راحت‌تر به آن برمی‌گردی.",
      helpful:
        "این نقطه می‌تواند یک توانایی قدیمی باشد. لازم نیست حذف شود؛ بهتر است آگاهانه به کار گرفته شود و همهٔ تصمیم‌ها را به تنهایی هدایت نکند.",
      growth:
        "چالش وقتی شروع می‌شود که الگوی آشنا به تنها پناهگاه تبدیل شود. مسیر رشد احترام به گذشته است، بدون ماندن همیشگی در همان پاسخ.",
      trust:
        "دست جنوبی در این داده از محور مقابل دست شمالی به دست آمده و محاسبهٔ مستقل یا مدل مبهم دیگری نیست.",
    },
  ];
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
    source: "جایگاه ثبت‌شده؛ توضیح تفسیری ارائه نشده",
    status:
      "این گزارش جایگاه را حفظ کرده، اما برای توضیح تفسیری آن پشتوانه کافی همراه نسخه ذخیره‌شده نیست.",
    boundary:
      "برای حفظ صداقت، گزارش‌های قدیمی تا زمانی که دوباره ساخته نشوند با تفسیر تازه بازنویسی نمی‌شوند.",
  };
}

function isValidNode(
  node: SpecialPointNode | null | undefined,
): node is SpecialPointNode {
  return Boolean(
    node &&
      typeof node.signId === "string" &&
      typeof node.degreeInSign === "number" &&
      Number.isFinite(node.degreeInSign),
  );
}

function isCalculatedLilith(
  lilith: SpecialPointLilith | null,
): lilith is SpecialPointLilith {
  return Boolean(
    lilith &&
      lilith.status === "calculated" &&
      lilith.id === "black-moon-lilith" &&
      lilith.lilithType === "local-true-osculating-black-moon-lilith" &&
      typeof lilith.longitude === "number" &&
      Number.isFinite(lilith.longitude) &&
      typeof lilith.signId === "string" &&
      typeof lilith.degreeInSign === "number" &&
      Number.isFinite(lilith.degreeInSign),
  );
}

function isApprovedLilith(
  lilith: SpecialPointLilith | null,
): lilith is RealEngineReportCalculatedLilith {
  return Boolean(
    isCalculatedLilith(lilith) &&
      lilith.approvedForReportOutput === true &&
      lilith.validationStatus === "independent-reference-fixtures-passed" &&
      lilith.validationReference ===
        "swiss-ephemeris-2.10.03-offline-osculating-apogee" &&
      typeof lilith.validationToleranceDegrees === "number" &&
      Number.isFinite(lilith.validationToleranceDegrees),
  );
}

function formatPointPosition(
  point: SpecialPointNode | SpecialPointLilith,
): string {
  const signLabel = point.signId
    ? formatZodiacLabel(
        point.signId as Parameters<typeof formatZodiacLabel>[0],
      )
    : "نشان نامشخص";
  const degreeLabel =
    typeof point.degreeInSign === "number"
      ? `درجه ${formatPersianNumber(point.degreeInSign)}`
      : "درجه نامشخص";
  const houseLabel =
    typeof point.house === "number"
      ? `خانه ${formatPersianNumber(point.house)}`
      : null;
  return [signLabel, degreeLabel, houseLabel].filter(Boolean).join("، ");
}

function formatNodeSource(nodeType: string | undefined): string {
  if (nodeType === "local-true-osculating") {
    return "دست‌های ماه با مدل نوسانی/واقعی محلی";
  }
  if (nodeType === "mean") return "دست‌های ماه با مدل میانگین";
  return "دست‌های ماه با مدل ثبت‌شده در گزارش";
}

function formatPersianNumber(value: number): string {
  return value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}
