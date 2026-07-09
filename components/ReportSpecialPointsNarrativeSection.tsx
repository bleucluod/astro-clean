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

const SPECIAL_POINTS_DEEP_NARRATIVE_VERSION =
  "v0.1.262-report-special-points-deep-narrative" as const;

export function ReportSpecialPointsNarrativeSection({
  report,
}: {
  report: AstrologyReport;
}) {
  const engine = (report as SpecialPointReport).realEngine ?? null;
  const lunarNodeCards = buildLunarNodeCards(engine?.lunarNodes ?? null);
  const lilithCard = buildLilithCard(engine?.lilith ?? null);
  const cards = [...lunarNodeCards, ...(lilithCard ? [lilithCard] : [])];

  if (cards.length === 0) {
    return null;
  }

  return (
    <section
      className="report-section report-special-points-narrative-section"
      data-special-points-deep-narrative={SPECIAL_POINTS_DEEP_NARRATIVE_VERSION}
      aria-label="روایت لیلیت و دست‌های ماه"
    >
      <div className="report-section-heading">
        <span className="report-kicker">لیلیت و دست‌های ماه</span>
        <h2>نقاط حساس چارت، بدون اغراق و بدون ترس‌سازی</h2>
        <p>
          این بخش لیلیت و دست‌های ماه را به زبان روان‌شناختی می‌خواند: نه حکم
          قطعی، نه پیش‌گویی، نه برچسب‌زدن. هدف این است که ببینی کدام الگوهای
          رشد، عادت، مرز و حساسیت در چارت تولد پررنگ‌تر می‌شوند.
        </p>
      </div>

      <div className="report-aspect-grid report-special-points-grid">
        {cards.map((card) => (
          <article className="report-aspect-card" key={card.id}>
            <span className="report-kicker">{card.source}</span>
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
              <li>
                <strong>اعتماد و مرز خوانش:</strong> {card.trust}
              </li>
            </ul>
          </article>
        ))}
      </div>

      <p className="report-muted-note">
        برای دست‌های ماه، اگر مدل True/Osculating فعال باشد با مدل Mean قاطی
        نمی‌شود. برای لیلیت هم منظور همین مدل محلی Black Moon Lilith
        نوسانی/واقعی است؛ نه لیلیت میانگین، نه سیارک ۱۱۸۱، و نه دارک‌مون/والدماث.
      </p>
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
        "دست شمالی ماه معمولاً جایی را نشان می‌دهد که زندگی از تو تمرین تازه می‌خواهد؛ جایی که شاید اولش غریبه باشد، اما با تکرار، حس رشد می‌سازد.",
      helpful:
        "به جای اینکه دنبال نسخه کامل و بی‌نقص خودت باشی، این نقطه را مثل مسیر تمرین بخوان: قدم‌های کوچک، انتخاب‌های تکرارشونده و جرئت تجربه کردن.",
      growth:
        "چالش این نقطه معمولاً این است که چون تازه و ناآشناست، آدم ممکن است عقب بکشد. رشد از جایی شروع می‌شود که آرام‌آرام به این جهت نزدیک می‌شوی.",
      trust:
        "این یک محور نمادین رشد است، نه حکم قطعی درباره سرنوشت. مدل محاسبه در همین کارت جداگانه برچسب خورده تا Mean و True/Osculating با هم قاطی نشوند.",
    },
    {
      id: "south-node-deep-narrative",
      title: "دست جنوبی ماه: الگوی آشنا",
      position: formatPointPosition(lunarNodes.southNode),
      source: source + "؛ نقطه مقابل دست شمالی",
      theme:
        "دست جنوبی ماه بیشتر از عادتی حرف می‌زند که بلدش هستی؛ بخشی از تو که راحت‌تر به آن برمی‌گردد، حتی وقتی دیگر همه جواب‌ها آنجا نیست.",
      helpful:
        "این نقطه می‌تواند مهارت قدیمی و حافظه روانی تو باشد. لازم نیست حذف شود؛ بهتر است آگاهانه استفاده شود، نه اینکه فرمان اصلی زندگی را بگیرد.",
      growth:
        "چالش وقتی شروع می‌شود که الگوی آشنا تبدیل به پناهگاه همیشگی شود. اینجا رشد یعنی احترام به گذشته، بدون گیر کردن در گذشته.",
      trust:
        "دست جنوبی از محور ماه خوانده می‌شود و در این گزارش به‌عنوان نقطه مقابل دست شمالی توضیح داده می‌شود، نه به‌عنوان یک محاسبه جدا و مبهم.",
    },
  ];
}

function buildLilithCard(lilith: SpecialPointLilith | null): NarrativeCard | null {
  if (!isCalculatedLilith(lilith)) {
    return null;
  }

  return {
    id: "lilith-deep-narrative",
    title: "لیلیت: مرز، سایه و میل خام",
    position: formatPointPosition(lilith),
    source: "Black Moon Lilith نوسانی/واقعی محلی",
    theme:
      "لیلیت در این خوانش جایی را نشان می‌دهد که حساسیت به کنترل، شرم، طردشدن یا میل خام می‌تواند پررنگ‌تر باشد. این نقطه برای ترساندن نیست؛ برای دیدن مرزهای روانی و صدای سرکوب‌شده است.",
    helpful:
      "وقتی آگاهانه خوانده شود، لیلیت می‌تواند به تو کمک کند بفهمی کجا لازم است مرز روشن‌تر، صداقت بیشتر یا رابطه سالم‌تری با خشم و میل داشته باشی.",
    growth:
      "چالش لیلیت این است که آدم یا آن را پنهان می‌کند، یا اغراق‌آمیز زندگی‌اش می‌کند. خوانش سالم یعنی دیدن سایه بدون تبدیل آن به هویت کامل.",
    trust: lilith.approvedForReportOutput
      ? "این نقطه با مدل محلی True/Osculating Black Moon Lilith وارد گزارش شده است؛ نه لیلیت میانگین، نه سیارک ۱۱۸۱، نه دارک‌مون/والدماث. متن آن نمادین است و حکم قطعی روان‌شناختی یا پزشکی نمی‌دهد."
      : "محاسبه لیلیت موجود است، اما اگر gate گزارش محدود باشد، این متن باید فقط در حد داده و اعتماد محاسباتی خوانده شود؛ نه نتیجه قطعی.",
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
      ? "درجه " + formatPersianNumber(point.degreeInSign)
      : "درجه نامشخص";
  const houseLabel =
    typeof point.house === "number" ? "خانه " + formatPersianNumber(point.house) : null;

  return [signLabel, degreeLabel, houseLabel].filter(Boolean).join("، ");
}

function formatNodeSource(nodeType: string | undefined): string {
  if (nodeType === "local-true-osculating") {
    return "دست‌های ماه با مدل True/Osculating محلی";
  }

  if (nodeType === "mean") {
    return "دست‌های ماه با مدل Mean";
  }

  return "دست‌های ماه با مدل مشخص‌شده در موتور گزارش";
}

function formatPersianNumber(value: number): string {
  return value.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}
