"use client";

import type { AstrologyReport } from "@/types/astro";
import { formatZodiacLabel, zodiacSignFromLongitude } from "@/lib/astrology/zodiac-labels";

type ReportPlanetPlacementSectionsProps = {
  report: AstrologyReport;
};

type PlanetPlacement = {
  id?: string | null;
  label?: string | null;
  signId?: string | null;
  sign?: string | null;
  zodiacSign?: string | null;
  longitude?: number | null;
  degreeInSign?: number | null;
  degree?: number | null;
  house?: number | null;
  houseNumber?: number | null;
};

type PlanetCopy = {
  theme: string;
  bright: string[];
  shadow: string[];
  interests: string[];
  example: string;
  bodySymbol: string;
};

type SignCopy = {
  tone: string;
  style: string;
};

const PLANET_ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const PLANET_LABELS_FA: Record<string, string> = {
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
};

const PLANET_COPY: Record<string, PlanetCopy> = {
  sun: {
    theme: "هویت، اراده، اعتمادبه‌نفس و شیوه‌ای که فرد می‌خواهد دیده شود",
    bright: ["وضوح در هدف", "توان رهبری", "میل به ساختن هویت مستقل"],
    shadow: ["اصرار بیش از حد روی تصویر خود", "سختی در پذیرش نقد", "نیاز زیاد به تأیید"],
    interests: ["خودبیانگری", "ساختن مسیر شخصی", "کارهایی که دیده می‌شوند"],
    example: "ممکن است وقتی کاری با امضای شخصی تو جلو می‌رود، انرژی و تمرکزت بیشتر شود.",
    bodySymbol: "در زبان نمادین، خورشید با نیروی حیاتی، قلب و مرکز بدن تداعی می‌شود.",
  },
  moon: {
    theme: "احساسات، نیازهای امن، حافظه عاطفی و واکنش‌های ناخودآگاه",
    bright: ["همدلی", "حس مراقبت", "توان دریافت حال‌وهوای محیط"],
    shadow: ["تغییرپذیری احساسی", "واکنش دفاعی", "وابستگی به امنیت آشنا"],
    interests: ["خانه و صمیمیت", "ریتم‌های شخصی", "فضاهای آرام و قابل اعتماد"],
    example: "وقتی محیط امن و قابل پیش‌بینی باشد، تصمیم‌های احساسی‌ات روشن‌تر می‌شوند.",
    bodySymbol: "در زبان نمادین، ماه با معده، مایعات بدن، خواب و ریتم‌های مراقبتی تداعی می‌شود.",
  },
  mercury: {
    theme: "فکر، زبان، یادگیری، تصمیم‌گیری و شیوه ارتباط ذهنی",
    bright: ["کنجکاوی", "یادگیری سریع", "توان توضیح دادن"],
    shadow: ["پراکنده‌فکری", "زیاد تحلیل کردن", "بی‌قراری ذهنی"],
    interests: ["گفت‌وگو", "نوشتن", "یادگیری مهارت‌های تازه"],
    example: "ممکن است وقتی بتوانی موضوع را با کلمات مرتب کنی، خودِ مسئله هم ساده‌تر شود.",
    bodySymbol: "در زبان نمادین، عطارد با سیستم عصبی، دست‌ها، تنفس و سرعت واکنش ذهنی تداعی می‌شود.",
  },
  venus: {
    theme: "رابطه، سلیقه، زیبایی، ارزش‌گذاری و شیوه جذب و لذت بردن",
    bright: ["ذوق زیبایی", "دیپلماسی", "توان ساختن صمیمیت"],
    shadow: ["وابستگی به تأیید", "فرار از تعارض", "ارزش‌گذاری بیش از حد از بیرون"],
    interests: ["هنر و زیبایی", "رابطه‌های خوش‌آهنگ", "انتخاب‌های لذت‌بخش"],
    example: "ممکن است کیفیت فضا، صدا، رنگ یا رفتار دیگران روی حس خوبت اثر زیادی بگذارد.",
    bodySymbol: "در زبان نمادین، زهره با پوست، گلو، کلیه‌ها و حس تعادل/لذت تداعی می‌شود.",
  },
  mars: {
    theme: "انگیزه، عمل، خشم، جرئت و شیوه شروع کردن",
    bright: ["قدرت اقدام", "شجاعت", "توان دفاع از مرزها"],
    shadow: ["عجله", "برخورد تند", "فرسودگی از فشار زیاد"],
    interests: ["رقابت سالم", "حرکت بدنی", "پروژه‌های فوری و چالشی"],
    example: "وقتی هدف روشن باشد، ممکن است سریع‌تر از دیگران وارد عمل شوی و مسیر را باز کنی.",
    bodySymbol: "در زبان نمادین، مریخ با عضله، خون، التهاب و انرژی حرکتی تداعی می‌شود.",
  },
  jupiter: {
    theme: "رشد، معنا، امید، یادگیری بزرگ‌تر و افق‌های زندگی",
    bright: ["اعتماد", "بخشندگی", "توان دیدن تصویر بزرگ"],
    shadow: ["بزرگ‌نمایی", "قول بیش از توان", "نادیده گرفتن جزئیات"],
    interests: ["سفر", "آموزش", "فلسفه و تجربه‌های گسترش‌دهنده"],
    example: "ممکن است وقتی حس کنی یک تجربه تو را بزرگ‌تر می‌کند، با اشتیاق بیشتری جلو بروی.",
    bodySymbol: "در زبان نمادین، مشتری با کبد، رشد، متابولیسم و گسترش بدن/ذهن تداعی می‌شود.",
  },
  saturn: {
    theme: "مرز، مسئولیت، زمان، بلوغ و جایی که باید مهارت ساخته شود",
    bright: ["انضباط", "پایداری", "توان ساختار دادن"],
    shadow: ["ترس از شکست", "سخت‌گیری", "احساس دیر رسیدن"],
    interests: ["ساختن پایه‌های محکم", "کار بلندمدت", "مسیرهای قابل اندازه‌گیری"],
    example: "ممکن است در این حوزه دیرتر راه بیفتی، اما وقتی راه بیفتی جدی‌تر و ماندگارتر بسازی.",
    bodySymbol: "در زبان نمادین، زحل با استخوان، دندان، پوست و ساختارهای نگهدارنده بدن تداعی می‌شود.",
  },
  uranus: {
    theme: "آزادی، تفاوت، شوک‌های بیدارکننده و تغییر الگوهای قدیمی",
    bright: ["نوآوری", "استقلال", "دید متفاوت"],
    shadow: ["بی‌قراری", "قطع ناگهانی", "مقاومت در برابر محدودیت"],
    interests: ["تکنولوژی", "ایده‌های نو", "جمع‌های متفاوت و آینده‌نگر"],
    example: "ممکن است جایی که همه دنبال راه معمول‌اند، تو ناگهان یک راه متفاوت ببینی.",
    bodySymbol: "در زبان نمادین، اورانوس با سیستم عصبی، ریتم‌های ناگهانی و واکنش‌های غیرمنتظره تداعی می‌شود.",
  },
  neptune: {
    theme: "خیال، شهود، رؤیا، معنویت و مرزهای نرم روان",
    bright: ["همدلی عمیق", "الهام", "تصویرسازی و لطافت"],
    shadow: ["ابهام", "فرار از واقعیت", "مرزهای ضعیف"],
    interests: ["موسیقی", "هنر", "معنا، مراقبه و فضاهای شاعرانه"],
    example: "ممکن است قبل از اینکه دلیل چیزی را بفهمی، حال‌وهوای آن را حس کنی.",
    bodySymbol: "در زبان نمادین، نپتون با حساسیت، خواب، مایعات و حالت‌های مبهم بدن/روان تداعی می‌شود.",
  },
  pluto: {
    theme: "دگرگونی، قدرت پنهان، بحران‌های رشد و لایه‌های عمیق روان",
    bright: ["عمق", "تاب‌آوری", "توان بازسازی بعد از بحران"],
    shadow: ["کنترل‌گری", "وسواس", "ترس از آسیب‌پذیری"],
    interests: ["روان‌شناسی", "رازها", "تحقیق عمیق و تغییر ریشه‌ای"],
    example: "ممکن است وقتی چیزی سطحی توضیح داده می‌شود، ناخودآگاه دنبال ریشه پنهانش بروی.",
    bodySymbol: "در زبان نمادین، پلوتو با پاکسازی، بازسازی، سیستم دفع و فرایندهای عمیق بدن تداعی می‌شود.",
  },
};

const SIGN_COPY: Record<string, SignCopy> = {
  aries: { tone: "مستقیم، آغازگر و پرانرژی", style: "با عمل سریع و تجربه کردن یاد می‌گیرد" },
  taurus: { tone: "ثابت، حسی و آرام‌ساز", style: "با لمس، زمان و امنیت بهتر رشد می‌کند" },
  gemini: { tone: "ذهنی، گفت‌وگویی و چندمسیره", style: "با سؤال، ارتباط و تغییر زاویه دید زنده می‌شود" },
  cancer: { tone: "محافظ، عاطفی و خاطره‌محور", style: "با امنیت احساسی و تعلق بهتر شکوفا می‌شود" },
  leo: { tone: "بیانگر، گرم و خلاق", style: "وقتی دیده و شنیده شود، روشن‌تر عمل می‌کند" },
  virgo: { tone: "دقیق، کاربردی و اصلاح‌گر", style: "با نظم، مهارت و جزئیات قابل اعتماد جلو می‌رود" },
  libra: { tone: "رابطه‌محور، زیباشناس و متعادل‌کننده", style: "با گفت‌وگو، انصاف و هماهنگی بهتر تصمیم می‌گیرد" },
  scorpio: { tone: "عمیق، متمرکز و دگرگون‌کننده", style: "با اعتماد، صداقت و روبه‌رو شدن با لایه‌های پنهان رشد می‌کند" },
  sagittarius: { tone: "معناجو، آزاد و افق‌گستر", style: "با سفر، یادگیری و تجربه‌های بزرگ‌تر زنده می‌شود" },
  capricorn: { tone: "مسئول، هدف‌مند و ساختارساز", style: "با زمان، تعهد و نتیجه قابل سنجش اعتماد می‌سازد" },
  aquarius: { tone: "آینده‌نگر، مستقل و متفاوت", style: "با ایده‌های نو و فضای آزاد ذهنی بهتر عمل می‌کند" },
  pisces: { tone: "خیال‌پرداز، همدل و مرزناپذیر", style: "با هنر، شهود و فضای نرم روانی بهتر جریان پیدا می‌کند" },
};

export function ReportPlanetPlacementSections({ report }: ReportPlanetPlacementSectionsProps) {
  const placements = getPlanetPlacements(report);

  if (placements.length === 0) {
    return null;
  }

  return (
    <section
      className="report-section report-planet-placement-section"
      data-halleus-report-planet-placement-sections="v0.1.259"
    >
      <div className="report-section-heading">
        <span className="section-label">موقعیت‌های سیاره‌ها</span>
        <h3>هر سیاره، جدا از رابطه‌هایش</h3>
        <p>
          این بخش عمداً قبل از رابطه سیاره‌ها می‌آید: اول هر سیاره را جدا
          می‌خوانیم تا بفهمیم هر بخش از شخصیت چه زبان و نیازی دارد، بعد در
          بخش بعدی می‌بینیم این بخش‌ها چطور با هم حرف می‌زنند. متن‌ها ساده و توصیفی‌اند تا هر جایگاه راحت‌تر و انسانی‌تر خوانده شود.
        </p>
        <p className="report-muted-note" data-report-narrative-quality-pass="placement-bridge for-dummies">
          برای خواندن سریع‌تر، هر کارت را مثل یک جمله‌ی پایه ببین: «این نیرو در
          این نشان این‌طور خودش را نشان می‌دهد». سپس aspectها توضیح می‌دهند این
          جمله‌ها کجا با هم هماهنگ یا پرتنش می‌شوند.
        </p>
      </div>

      <div className="report-placement-grid">
        {placements.map((placement) => {
          const copy = PLANET_COPY[placement.id] ?? getFallbackPlanetCopy(placement.label);
          const signCopy = placement.signId ? SIGN_COPY[placement.signId] : null;
          const title = `${placement.label} در ${placement.signLabel}`;

          return (
            <article className="mini-card report-planet-placement-card" key={placement.id}>
              <strong>{title}</strong>
              <span>{placement.houseLabel}</span>
              <p>
                {placement.label} در {placement.signLabel} یعنی موضوعِ {copy.theme} با لحنی {signCopy?.tone ?? "شخصی و قابل مشاهده"} بیان می‌شود. {signCopy?.style ?? "برای فهم بهترش باید به خانه و رابطه‌های بعدی هم نگاه کرد."}
              </p>
              <ul className="report-compact-list">
                <li>
                  <strong>ویژگی‌های روشن:</strong> {joinPersian(copy.bright)}
                </li>
                <li>
                  <strong>چالش‌ها:</strong> {joinPersian(copy.shadow)}
                </li>
                <li>
                  <strong>علایق و کشش‌ها:</strong> {joinPersian(copy.interests)}
                </li>
                <li>
                  <strong>مثال ساده:</strong> {copy.example}
                </li>
                <li>
                  <strong>آناتومی نمادین:</strong> {copy.bodySymbol} این جمله تشخیص پزشکی نیست و فقط برای زبان استعاری گزارش آمده است.
                </li>
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getPlanetPlacements(report: AstrologyReport) {
  const placements = (report.realEngine?.placements ?? []) as PlanetPlacement[];

  return placements
    .filter((placement) => placement.id && PLANET_ORDER.includes(placement.id))
    .map((placement) => toPlanetPlacementView(placement))
    .filter((placement): placement is NonNullable<ReturnType<typeof toPlanetPlacementView>> => placement !== null)
    .sort((a, b) => PLANET_ORDER.indexOf(a.id) - PLANET_ORDER.indexOf(b.id));
}

function toPlanetPlacementView(placement: PlanetPlacement) {
  if (!placement.id) {
    return null;
  }

  const signId = getSignId(placement);
  const signLabel = signId ? formatZodiacLabel(signId as Parameters<typeof formatZodiacLabel>[0]) : "نشان نامشخص";
  const label = PLANET_LABELS_FA[placement.id] ?? placement.label ?? placement.id;
  const houseNumber = getHouseNumber(placement);

  return {
    id: placement.id,
    label,
    signId,
    signLabel,
    houseLabel: houseNumber ? `خانه ${formatPersianNumber(houseNumber)}` : "خانه ثبت نشده",
  };
}

function getSignId(placement: PlanetPlacement) {
  if (typeof placement.signId === "string" && placement.signId.length > 0) {
    return placement.signId;
  }

  if (typeof placement.zodiacSign === "string" && placement.zodiacSign.length > 0) {
    return placement.zodiacSign;
  }

  if (typeof placement.sign === "string" && placement.sign.length > 0) {
    return placement.sign;
  }

  if (typeof placement.longitude === "number" && Number.isFinite(placement.longitude)) {
    return zodiacSignFromLongitude(placement.longitude);
  }

  return null;
}

function getHouseNumber(placement: PlanetPlacement) {
  if (typeof placement.houseNumber === "number" && Number.isFinite(placement.houseNumber)) {
    return placement.houseNumber;
  }

  if (typeof placement.house === "number" && Number.isFinite(placement.house)) {
    return placement.house;
  }

  return null;
}

function getFallbackPlanetCopy(label: string): PlanetCopy {
  return {
    theme: `${label} در چارت تولد`,
    bright: ["کیفیت قابل مشاهده", "ظرفیت رشد", "نقطه توجه در روایت چارت"],
    shadow: ["نیاز به آگاهی", "زیاده‌روی احتمالی", "الگوی تکرارشونده"],
    interests: ["شناخت بهتر خود", "دیدن الگوها", "کار با تجربه‌های روزمره"],
    example: "وقتی این کیفیت فعال می‌شود، معمولاً در رفتارهای کوچک روزمره هم خودش را نشان می‌دهد.",
    bodySymbol: "در زبان نمادین، این جایگاه فقط به‌عنوان یک استعاره بدنی/روانی خوانده می‌شود.",
  };
}

function joinPersian(items: string[]) {
  return items.join("، ");
}

function formatPersianNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
