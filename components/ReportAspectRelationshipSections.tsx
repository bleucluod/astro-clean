"use client";

import type { AstrologyReport } from "@/types/astro";

type ReportAspectRelationshipSectionsProps = {
  report: AstrologyReport;
};

type AspectLike = Record<string, unknown>;

type AspectMeta = {
  kind: "conjunction" | "sextile" | "square" | "trine" | "opposition" | "other";
  titleFragment: string;
  simpleTone: string;
  helpfulSide: string;
  growthSide: string;
};

const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const ASPECT_META_BY_KIND: Record<AspectMeta["kind"], AspectMeta> = {
  conjunction: {
    kind: "conjunction",
    titleFragment: "هم‌نشینی ۰ درجه",
    simpleTone: "دو نیرو در یک نقطه جمع می‌شوند و صدای یکدیگر را بلندتر می‌کنند.",
    helpfulSide: "وقتی آگاهانه زندگی شود، تمرکز، شدت و یکپارچگی می‌آورد.",
    growthSide: "اگر ناآگاهانه بماند، ممکن است یک نیاز آن‌قدر پررنگ شود که صدای بقیه بخش‌ها را بپوشاند.",
  },
  sextile: {
    kind: "sextile",
    titleFragment: "زاویه‌ی ۶۰ درجه",
    simpleTone: "دو بخش چارت می‌توانند با کمی انتخاب و تمرین به هم کمک کنند.",
    helpfulSide: "سمت مثبتش فرصت، یادگیری و همکاری نرم بین دو موضوع است.",
    growthSide: "چالش اصلی این است که این استعداد خودبه‌خود کامل نمی‌شود و باید فعالش کنی.",
  },
  square: {
    kind: "square",
    titleFragment: "زاویه‌ی ۹۰ درجه",
    simpleTone: "دو نیاز با هم اصطکاک دارند و آدم را مجبور به حرکت و تصمیم می‌کنند.",
    helpfulSide: "اگر درست فهمیده شود، انرژی عمل، جدیت و رشد واقعی می‌دهد.",
    growthSide: "اگر ناآگاهانه بماند، می‌تواند به عجله، مقاومت یا تکرار یک الگوی تنش تبدیل شود.",
  },
  trine: {
    kind: "trine",
    titleFragment: "زاویه‌ی ۱۲۰ درجه",
    simpleTone: "دو نیرو راحت‌تر با هم جریان پیدا می‌کنند و حس طبیعی بودن می‌دهند.",
    helpfulSide: "سمت مثبتش استعداد، روانی و اعتماد درونی است.",
    growthSide: "چالش آن این است که چون راحت است، ممکن است کمتر به رشد فعال تبدیل شود.",
  },
  opposition: {
    kind: "opposition",
    titleFragment: "روبه‌رویی ۱۸۰ درجه",
    simpleTone: "دو قطب روبه‌روی هم قرار می‌گیرند و موضوع تعادل، رابطه و آینه شدن را فعال می‌کنند.",
    helpfulSide: "وقتی بالغ شود، توان دیدن دو طرف ماجرا و ساختن تعادل را زیاد می‌کند.",
    growthSide: "اگر ناآگاهانه بماند، ممکن است به کشمکش بین من و دیگری یا افراط و تفریط تبدیل شود.",
  },
  other: {
    kind: "other",
    titleFragment: "یک رابطه‌ی محاسبه‌شده",
    simpleTone: "این دو بخش چارت در محاسبه به هم مرتبط شده‌اند و باید در کنار زمینه کلی چارت خوانده شوند.",
    helpfulSide: "سمت مثبتش این است که یک پیوند ظریف‌تر را در نقشه نشان می‌دهد.",
    growthSide: "برای خواندن دقیق‌ترش باید سیاره‌ها، خانه‌ها، نشان‌ها و اورب را با هم دید.",
  },
};

export function ReportAspectRelationshipSections({ report }: ReportAspectRelationshipSectionsProps) {
  const aspects = ((report.realEngine?.aspects ?? []) as unknown[]) as AspectLike[];
  const shownAspects = aspects.slice(0, 8);
  const hiddenAspectCount = Math.max(0, aspects.length - shownAspects.length);

  if (shownAspects.length === 0) {
    return null;
  }

  return (
    <section className="report-section report-aspect-relationship-sections" data-report-aspect-relationship-sections="true">
      <div className="report-section-heading">
        <span className="report-eyebrow">رابطه سیاره‌ها</span>
        <h3>ارتباط سیاره‌ها به زبان ساده</h3>
        <p>
          بعد از جایگاه‌های تکی، این بخش نشان می‌دهد همان نیروها چگونه با هم
          حرف می‌زنند: بعضی رابطه‌ها روان‌ترند، بعضی اصطکاک می‌سازند، و بعضی
          موضوع را پررنگ‌تر می‌کنند. اورب فقط نشانه نزدیکی تماس است؛ متن‌ها
          قرار نیست حکم قطعی بسازند.
        </p>
        <p className="report-muted-note" data-report-narrative-quality-pass="aspect-bridge">
          اگر placementها «واژه‌های» چارت باشند، aspectها «دستور زبان» آن هستند:
          اینجا می‌فهمی چرا دو ویژگی ممکن است همدیگر را تقویت کنند یا از تو
          انتخاب آگاهانه بخواهند.
        </p>
      </div>

      <div className="report-grid report-placement-section-grid">
        {shownAspects.map((aspect, index) => {
          const firstPlanet = getPlanetLabel(aspect, "first");
          const secondPlanet = getPlanetLabel(aspect, "second");
          const meta = getAspectMeta(aspect);
          const heading = buildAspectHeading(firstPlanet, secondPlanet, meta);
          const narrative = getText(aspect.narrative) || buildFallbackNarrative(firstPlanet, secondPlanet, meta);
          const orbLabel = formatOrbLabel(aspect);

          return (
            <article className="report-card report-aspect-relationship-card" key={getAspectKey(aspect, index)}>
              <span className="report-eyebrow">رابطه {formatPersianNumber(index + 1)}</span>
              <h4>{heading}</h4>
              <p>{narrative}</p>
              <ul className="report-detail-list">
                <li>
                  <strong>خلاصه ساده:</strong> {meta.simpleTone}
                </li>
                <li>
                  <strong>سمت کمک‌کننده:</strong> {meta.helpfulSide}
                </li>
                <li>
                  <strong>سمت رشدی:</strong> {meta.growthSide}
                </li>
                <li>
                  <strong>اورب و اعتماد خوانش:</strong> {orbLabel}
                </li>
              </ul>
            </article>
          );
        })}
      </div>

      {hiddenAspectCount > 0 ? (
        <p className="report-muted">
          {formatPersianNumber(hiddenAspectCount)} رابطه‌ی دیگر هم در داده محاسبه شده، اما برای خوانایی صفحه فقط رابطه‌های اولویت‌دار اینجا باز شده‌اند؛ هدف این بخش عمق خواندن است، نه طولانی کردن فهرست.
        </p>
      ) : null}
    </section>
  );
}

function getAspectKey(aspect: AspectLike, index: number) {
  const id = getText(aspect.id) || getText(aspect.aspectId);
  if (id) {
    return id;
  }

  return `aspect-relationship-${index}`;
}

function getPlanetLabel(aspect: AspectLike, side: "first" | "second") {
  const keys = side === "first"
    ? ["firstPlanetLabel", "planetALabel", "planet1Label", "firstLabel", "sourceLabel", "firstPlanet", "planetA", "planet1"]
    : ["secondPlanetLabel", "planetBLabel", "planet2Label", "secondLabel", "targetLabel", "secondPlanet", "planetB", "planet2"];

  return getFirstText(aspect, keys) || (side === "first" ? "سیاره اول" : "سیاره دوم");
}

function buildAspectHeading(firstPlanet: string, secondPlanet: string, meta: AspectMeta) {
  return `${firstPlanet} در ${meta.titleFragment} با ${secondPlanet}`;
}

function getAspectMeta(aspect: AspectLike) {
  const raw = [
    getText(aspect.type),
    getText(aspect.aspectType),
    getText(aspect.aspectName),
    getText(aspect.name),
    getText(aspect.label),
    getText(aspect.id),
  ].join(" ").toLowerCase();
  const glyph = getText(aspect.glyph);

  if (raw.includes("conjunction") || raw.includes("conj") || glyph === "☌") {
    return ASPECT_META_BY_KIND.conjunction;
  }
  if (raw.includes("sextile") || glyph === "⚹" || glyph === "✶") {
    return ASPECT_META_BY_KIND.sextile;
  }
  if (raw.includes("square") || glyph === "□" || glyph === "▢") {
    return ASPECT_META_BY_KIND.square;
  }
  if (raw.includes("trine") || glyph === "△" || glyph === "▲") {
    return ASPECT_META_BY_KIND.trine;
  }
  if (raw.includes("opposition") || raw.includes("opp") || glyph === "☍") {
    return ASPECT_META_BY_KIND.opposition;
  }

  return ASPECT_META_BY_KIND.other;
}

function buildFallbackNarrative(firstPlanet: string, secondPlanet: string, meta: AspectMeta) {
  return `این رابطه نشان می‌دهد که ${firstPlanet} و ${secondPlanet} باید در کنار هم خوانده شوند. ${meta.simpleTone}`;
}

function formatOrbLabel(aspect: AspectLike) {
  const orb = getFirstNumber(aspect, ["orbDegrees", "orb", "orbDegree", "orbDeg"]);

  if (orb === null) {
    return "اورب در داده محاسبه شده اولویت‌بندی شده، اما برای این کارت عدد جداگانه‌ای نمایش داده نشده است.";
  }

  return `حدود ${formatPersianNumber(orb)} درجه؛ هرچه اورب کوچک‌تر باشد، این رابطه در خوانش چارت پررنگ‌تر حساب می‌شود.`;
}

function getFirstText(source: AspectLike, keys: string[]) {
  for (const key of keys) {
    const value = getText(source[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function getFirstNumber(source: AspectLike, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatPersianNumber(value: number) {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}
