export type RealChartAspectPlacement = {
  id: string;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: string;
};

type RealChartAspectPanelProps = {
  placements: RealChartAspectPlacement[];
};

type RealChartAspectDefinition = {
  id: string;
  label: string;
  glyph: string;
  angle: number;
  orb: number;
  meaning: string;
};

type RealChartCalculatedAspect = {
  id: string;
  first: RealChartAspectPlacement;
  second: RealChartAspectPlacement;
  aspect: RealChartAspectDefinition;
  separation: number;
  orb: number;
};

const MAJOR_ASPECTS: RealChartAspectDefinition[] = [
  {
    id: "conjunction",
    label: "هم‌نشینی",
    glyph: "☌",
    angle: 0,
    orb: 8,
    meaning: "دو نیرو در یک نقطه متمرکز می‌شوند و صدای هم را تقویت می‌کنند.",
  },
  {
    id: "sextile",
    label: "فرصت نرم",
    glyph: "⚹",
    angle: 60,
    orb: 5,
    meaning: "یک مسیر همکاری و رشد آرام بین دو بخش چارت دیده می‌شود.",
  },
  {
    id: "square",
    label: "چالش سازنده",
    glyph: "□",
    angle: 90,
    orb: 6,
    meaning: "تنش فعال وجود دارد؛ اما همین تنش می‌تواند موتور رشد باشد.",
  },
  {
    id: "trine",
    label: "جریان هماهنگ",
    glyph: "△",
    angle: 120,
    orb: 6,
    meaning: "دو بخش چارت راحت‌تر با هم کار می‌کنند و حس روانی ایجاد می‌شود.",
  },
  {
    id: "opposition",
    label: "قطبیت آگاه‌کننده",
    glyph: "☍",
    angle: 180,
    orb: 8,
    meaning: "دو قطب روبه‌روی هم قرار می‌گیرند و نیاز به تعادل و آگاهی دارند.",
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

export function RealChartAspectPanel({ placements }: RealChartAspectPanelProps) {
  const aspects = calculateMajorAspects(placements);
  const strongestAspects = aspects.slice(0, 8);

  return (
    <section className="rounded-[2rem] border border-[#E7D8C7] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            Major aspects
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
            روابط اصلی سیاره‌ها
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
            این بخش زاویه‌های اصلی بین سیاره‌ها را از روی longitude واقعی‌تر
            محاسبه می‌کند. هدفش این است که چارت از جدول ساده به یک گزارش
            قابل خواندن نزدیک‌تر شود.
          </p>
        </div>

        <div className="rounded-full border border-[#D8C2AA] bg-[#FFF9F2] px-4 py-2 text-sm font-bold text-[#6A4B35]">
          {aspects.length} aspect
        </div>
      </div>

      {strongestAspects.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {strongestAspects.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.5rem] border border-[#EFE2D2] bg-[#FFF9F2] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6B45]">
                    {item.aspect.label}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#3E2F25]">
                    {getPlacementLabel(item.first)}{" "}
                    <span className="text-[#9A6B45]">{item.aspect.glyph}</span>{" "}
                    {getPlacementLabel(item.second)}
                  </h3>
                </div>
                <span className="rounded-full border border-[#D8C2AA] bg-white px-3 py-1 text-xs font-bold text-[#6A4B35]">
                  orb {formatAspectDegree(item.orb)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-8 text-[#6B5A4C]">
                {item.aspect.meaning}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[#8A6A51]">زاویه واقعی</p>
                  <p className="mt-1 font-bold text-[#3E2F25]">
                    {formatAspectDegree(item.separation)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[#8A6A51]">زاویه aspect</p>
                  <p className="mt-1 font-bold text-[#3E2F25]">
                    {formatAspectDegree(item.aspect.angle)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4 text-sm leading-8 text-[#6B5A4C]">
          با orbهای فعلی aspect اصلی پیدا نشد. در نسخه‌های بعدی می‌توانیم orb
          قابل تنظیم و minor aspects اضافه کنیم.
        </div>
      )}

      <details className="mt-5 rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4">
        <summary className="cursor-pointer text-sm font-bold text-[#4A382C]">
          تعریف aspectها و orb
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {MAJOR_ASPECTS.map((aspect) => (
            <div key={aspect.id} className="rounded-2xl bg-white p-4 text-sm">
              <p className="font-bold text-[#3E2F25]">
                {aspect.glyph} {aspect.label}
              </p>
              <p className="mt-1 text-xs text-[#8A6A51]">
                زاویه {formatAspectDegree(aspect.angle)} — orb{" "}
                {formatAspectDegree(aspect.orb)}
              </p>
              <p className="mt-2 leading-7 text-[#6B5A4C]">{aspect.meaning}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

export function calculateMajorAspects(
  placements: RealChartAspectPlacement[],
): RealChartCalculatedAspect[] {
  const results: RealChartCalculatedAspect[] = [];

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

      if (match) {
        results.push({
          id: `${first.id}-${match.aspect.id}-${second.id}`,
          first,
          second,
          aspect: match.aspect,
          separation,
          orb: match.orb,
        });
      }
    }
  }

  return results.sort((a, b) => a.orb - b.orb);
}

export function calculateAngularSeparation(first: number, second: number): number {
  const raw = Math.abs(normalizeLongitude(first) - normalizeLongitude(second));

  return raw > 180 ? 360 - raw : raw;
}

function findAspectMatch(separation: number): {
  aspect: RealChartAspectDefinition;
  orb: number;
} | null {
  for (const aspect of MAJOR_ASPECTS) {
    const orb = Math.abs(separation - aspect.angle);

    if (orb <= aspect.orb) {
      return { aspect, orb };
    }
  }

  return null;
}

function getPlacementLabel(placement: RealChartAspectPlacement): string {
  return PLANET_LABELS_FA[placement.id] ?? placement.label;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function formatAspectDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}
