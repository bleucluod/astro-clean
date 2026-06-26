import type {
  RealEngineReportAspect,
  RealEngineReportAspectKind,
  RealEngineReportPlacement,
} from "@/types/astro";

type AspectDefinition = {
  id: RealEngineReportAspectKind;
  label: string;
  glyph: string;
  angle: number;
  orb: number;
  meaning: string;
  emphasis: string;
};

const MAJOR_ASPECTS: AspectDefinition[] = [
  {
    id: "conjunction",
    label: "هم‌نشینی",
    glyph: "☌",
    angle: 0,
    orb: 8,
    meaning:
      "دو نیروی چارت در یک نقطه جمع می‌شوند و صدای یکدیگر را پررنگ‌تر می‌کنند.",
    emphasis:
      "اینجا یک انرژی فشرده و قابل توجه وجود دارد؛ انگار دو بخش شخصیت با هم یک جمله مشترک می‌سازند.",
  },
  {
    id: "sextile",
    label: "فرصت نرم",
    glyph: "⚹",
    angle: 60,
    orb: 5,
    meaning:
      "بین دو بخش چارت مسیر همکاری، یادگیری و رشد آرام دیده می‌شود.",
    emphasis:
      "این رابطه معمولاً با فشار زیاد کار نمی‌کند؛ بیشتر شبیه فرصتی است که وقتی آگاهانه انتخابش کنی باز می‌شود.",
  },
  {
    id: "square",
    label: "چالش سازنده",
    glyph: "□",
    angle: 90,
    orb: 6,
    meaning:
      "بین دو نیاز یا ریتم درونی تنش فعال وجود دارد، اما همین تنش می‌تواند موتور رشد باشد.",
    emphasis:
      "اینجا ممکن است اول اصطکاک حس شود، ولی اگر به جای سرکوب، جهت داده شود به قدرت عملی تبدیل می‌شود.",
  },
  {
    id: "trine",
    label: "جریان هماهنگ",
    glyph: "△",
    angle: 120,
    orb: 6,
    meaning:
      "دو بخش چارت راحت‌تر با هم کار می‌کنند و حس روانی، استعداد طبیعی یا حمایت درونی می‌سازند.",
    emphasis:
      "این ارتباط می‌تواند مثل یک توانایی طبیعی عمل کند؛ چیزی که شاید برای خودت عادی باشد اما برای دیگران دیده می‌شود.",
  },
  {
    id: "opposition",
    label: "قطبیت آگاه‌کننده",
    glyph: "☍",
    angle: 180,
    orb: 8,
    meaning:
      "دو قطب روبه‌روی هم قرار می‌گیرند و نیاز به تعادل، گفت‌وگو و آگاهی دارند.",
    emphasis:
      "اینجا زندگی تو را دعوت می‌کند دو سر یک طیف را ببینی و هیچ‌کدام را کامل حذف نکنی.",
  },
];

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

export function calculateRealEngineAspects(
  placements: RealEngineReportPlacement[],
): RealEngineReportAspect[] {
  const results: RealEngineReportAspect[] = [];

  for (let firstIndex = 0; firstIndex < placements.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < placements.length;
      secondIndex += 1
    ) {
      const first = placements[firstIndex];
      const second = placements[secondIndex];
      const separation = calculateAngularSeparation(first.longitude, second.longitude);
      const match = findAspectMatch(separation);

      if (!match) {
        continue;
      }

      results.push({
        id: `${first.id}-${match.definition.id}-${second.id}`,
        firstPlanetId: first.id,
        firstPlanetLabel: getPlanetLabel(first),
        secondPlanetId: second.id,
        secondPlanetLabel: getPlanetLabel(second),
        aspectId: match.definition.id,
        aspectLabel: match.definition.label,
        glyph: match.definition.glyph,
        angle: match.definition.angle,
        separation,
        orb: match.orb,
        meaning: match.definition.meaning,
        narrative: buildAspectNarrative(first, second, match.definition, separation, match.orb),
      });
    }
  }

  return results.sort((a, b) => a.orb - b.orb);
}

export function calculateAngularSeparation(first: number, second: number): number {
  const raw = Math.abs(normalizeLongitude(first) - normalizeLongitude(second));

  return raw > 180 ? 360 - raw : raw;
}

export function formatAspectDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}

function findAspectMatch(separation: number): {
  definition: AspectDefinition;
  orb: number;
} | null {
  for (const definition of MAJOR_ASPECTS) {
    const orb = Math.abs(separation - definition.angle);

    if (orb <= definition.orb) {
      return { definition, orb };
    }
  }

  return null;
}

function buildAspectNarrative(
  first: RealEngineReportPlacement,
  second: RealEngineReportPlacement,
  definition: AspectDefinition,
  separation: number,
  orb: number,
): string {
  const firstLabel = getPlanetLabel(first);
  const secondLabel = getPlanetLabel(second);

  return `${firstLabel} و ${secondLabel} در الگوی ${definition.label} قرار گرفته‌اند. ${definition.meaning} زاویه واقعی این رابطه ${formatAspectDegree(
    separation,
  )} است و با فاصله ${formatAspectDegree(
    orb,
  )} از زاویه دقیق، جزو ارتباط‌های مهم این چارت دیده می‌شود. ${definition.emphasis}`;
}

function getPlanetLabel(placement: RealEngineReportPlacement): string {
  return PLANET_LABELS_FA[placement.id] ?? placement.label;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}
