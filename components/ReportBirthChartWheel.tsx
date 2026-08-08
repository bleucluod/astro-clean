"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildReportBirthChartWheelData,
  REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES,
  REPORT_BIRTH_CHART_WHEEL_DATA_VERSION,
  type ReportBirthChartWheelData,
  type ReportBirthChartWheelPlanetId,
  type ReportBirthChartWheelPlacement,
} from "@/src/lib/report-output/report-birth-chart-wheel-data";
import type { RealEngineReportAspectKind } from "@/types/astro";
import type { ChartPattern } from "@/lib/astrology/chart-patterns";
import reportStyles from "@/components/report/human-first-report.module.css";
import type { AstrologyReport } from "@/types/astro";

type ReportBirthChartWheelProps = {
  report: AstrologyReport;
  patterns?: ChartPattern[];
};

type RendererState = "loading" | "ready" | "error";

const ASTROCHART_SIZE = 720;
const ASTROCHART_CENTER = ASTROCHART_SIZE / 2;
const ASTROCHART_RADIUS = ASTROCHART_CENTER - 48;
const ASTROCHART_CUSP_LABEL_RADIUS = ASTROCHART_RADIUS / 1.62;
const ASTROCHART_CUSP_LABEL_OFFSET = 19;
const ASTROCHART_RENDERER_VERSION = "@astrodraw/astrochart@3.0.2";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PERSIAN_CUSP_DEGREE_FORMATTER = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  useGrouping: false,
});

const ASPECT_COLORS: Record<RealEngineReportAspectKind, string> = {
  conjunction: "#7F8C9B",
  sextile: "#4C8B7B",
  square: "#C86565",
  trine: "#4C8B7B",
  opposition: "#C86565",
};

const WHEEL_SIGN_GUIDE = [
  { id: "aries", symbol: "♈", label: "حمل" },
  { id: "taurus", symbol: "♉", label: "ثور" },
  { id: "gemini", symbol: "♊", label: "جوزا" },
  { id: "cancer", symbol: "♋", label: "سرطان" },
  { id: "leo", symbol: "♌", label: "اسد" },
  { id: "virgo", symbol: "♍", label: "سنبله" },
  { id: "libra", symbol: "♎", label: "میزان" },
  { id: "scorpio", symbol: "♏", label: "عقرب" },
  { id: "sagittarius", symbol: "♐", label: "قوس" },
  { id: "capricorn", symbol: "♑", label: "جدی" },
  { id: "aquarius", symbol: "♒", label: "دلو" },
  { id: "pisces", symbol: "♓", label: "حوت" },
] as const;

const WHEEL_AXIS_GUIDE = [
  { abbreviation: "As", label: "رایزینگ" },
  { abbreviation: "Ds", label: "نقطهٔ روبه‌رو" },
  { abbreviation: "Mc", label: "میانهٔ آسمان" },
  { abbreviation: "Ic", label: "ریشهٔ آسمان" },
] as const;

const WHEEL_PLANET_LABELS: Record<ReportBirthChartWheelPlanetId, string> = {
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

const WHEEL_PLANET_GUIDE: ReadonlyArray<{
  id: ReportBirthChartWheelPlanetId;
  symbol: string;
}> = [
  { id: "sun", symbol: "☉" },
  { id: "moon", symbol: "☽" },
  { id: "mercury", symbol: "☿" },
  { id: "venus", symbol: "♀" },
  { id: "mars", symbol: "♂" },
  { id: "jupiter", symbol: "♃" },
  { id: "saturn", symbol: "♄" },
  { id: "uranus", symbol: "♅" },
  { id: "neptune", symbol: "♆" },
  { id: "pluto", symbol: "♇" },
];

const WHEEL_ASPECT_GUIDE = [
  {
    tone: "harmonious",
    label: "سبز",
    glyphs: "△ / ⚹",
    meaning: "تثلیث و تسدیس؛ جریان هماهنگ و فرصت همکاری",
  },
  {
    tone: "dynamic",
    label: "قرمز",
    glyphs: "□ / ☍",
    meaning: "مربع و مقابله؛ تنش فعال و نیاز به آگاهی",
  },
  {
    tone: "conjunction",
    label: "خاکستری",
    glyphs: "☌",
    meaning: "مقارنه؛ تمرکز دو نیروی سیاره‌ای در یک نقطه",
  },
] as const;

export function ReportBirthChartWheel({
  report,
  patterns = [],
}: ReportBirthChartWheelProps) {
  const wheelResult = useMemo(
    () => buildReportBirthChartWheelData(report),
    [report],
  );

  if (wheelResult.status !== "ready") {
    return (
      <div
        className="report-detail-chart-placeholder"
        data-report-birth-chart-wheel={REPORT_BIRTH_CHART_WHEEL_DATA_VERSION}
        data-report-birth-chart-wheel-status={wheelResult.status}
        role="note"
      >
        <strong>چرخ چارت تولد</strong>
        <p>
          داده‌های ذخیره‌شده این گزارش برای نمایش دقیق چرخ چارت کافی نیست؛
          گزارش متنی همچنان کامل و قابل خواندن است.
        </p>
      </div>
    );
  }

  return (
    <AstroChartRadix
      data={wheelResult.data}
      patterns={patterns}
      reportId={report.id}
    />
  );
}

function AstroChartRadix({
  data,
  patterns,
  reportId,
}: {
  data: ReportBirthChartWheelData;
  patterns: ChartPattern[];
  reportId: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const chartId = `halleus-report-astrochart-${reactId}`;
  const [rendererState, setRendererState] =
    useState<RendererState>("loading");
  const [activePatternId, setActivePatternId] = useState<string | null>(null);
  const [readingFocus, setReadingFocus] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(`halleus:report-reading-focus:${reportId}`);
    } catch {
      return null;
    }
  });
  const introPlayedRef = useRef(false);
  const retrogradePlanetLabels = data.retrogradePlanetIds.map(
    (planetId) => WHEEL_PLANET_LABELS[planetId],
  );
  const visiblePatterns = patterns.slice(0, 6);
  const activePattern =
    visiblePatterns.find((pattern) => pattern.id === activePatternId) ?? null;
  const readingWheelFocus = resolveReadingWheelFocus(
    readingFocus,
    patterns,
    data,
  );

  useEffect(() => {
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ reportId?: string; focus?: string }>).detail;
      if (detail?.reportId !== reportId || typeof detail.focus !== "string") return;
      setReadingFocus(detail.focus);
    };
    window.addEventListener("halleus:report-reading-focus", onFocus);
    return () => window.removeEventListener("halleus:report-reading-focus", onFocus);
  }, [reportId]);

  useEffect(() => {
    let cancelled = false;
    let introObserver: IntersectionObserver | null = null;
    const host = document.getElementById(chartId);

    if (!host) {
      return undefined;
    }

    const chartHost = host;

    chartHost.replaceChildren();
    queueMicrotask(() => {
      if (!cancelled) setRendererState("loading");
    });

    async function renderRadix() {
      try {
        const { Chart } = await import("@astrodraw/astrochart");

        if (cancelled) return;

        const chart = new Chart(chartId, ASTROCHART_SIZE, ASTROCHART_SIZE, {
          SYMBOL_SCALE: 1.12,
          COLOR_BACKGROUND: "#F8FAFC",
          POINTS_COLOR: "#243447",
          SIGNS_COLOR: "#243447",
          CIRCLE_COLOR: "#7F8C9B",
          LINE_COLOR: "#7F8C9B",
          CUSPS_FONT_COLOR: "#3A4A5C",
          SYMBOL_AXIS_FONT_COLOR: "#243447",
          COLORS_SIGNS: [
            "#F5DDD8",
            "#F3E8CE",
            "#DCEAF8",
            "#DDEFE6",
            "#F5DDD8",
            "#F3E8CE",
            "#DCEAF8",
            "#DDEFE6",
            "#F5DDD8",
            "#F3E8CE",
            "#DCEAF8",
            "#DDEFE6",
          ],
          MARGIN: 48,
          PADDING: 22,
          COLLISION_RADIUS: 12,
          SHOW_DIGNITIES_TEXT: false,
          ADD_CLICK_AREA: false,
          ASPECTS: {},
        });
        const radix = chart.radix({
          planets: data.planets,
          cusps: data.cusps,
        });
        const storedAspects = buildStoredAstroChartAspects(data);

        if (storedAspects.length > 0) {
          radix.aspects(storedAspects);
        }

        const svg = chartHost.querySelector("svg");
        if (svg) {
          styleStoredAspectLines(svg, data, activePattern);
          appendStoredCuspLabels(svg, data);
          appendPatternPlanetHighlights(svg, data, activePattern);
          if (!introPlayedRef.current) {
            const playIntroWhenVisible = () => {
              if (cancelled || introPlayedRef.current) return;
              appendIntroMotionOverlay(svg, data);
              introPlayedRef.current = true;
              chartHost.setAttribute("data-report-wheel-intro-visible", "true");
            };

            if (typeof IntersectionObserver === "undefined") {
              playIntroWhenVisible();
            } else {
              introObserver = new IntersectionObserver(
                (entries) => {
                  const visible = entries.some(
                    (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.32,
                  );
                  if (!visible) return;
                  introObserver?.disconnect();
                  introObserver = null;
                  playIntroWhenVisible();
                },
                { threshold: [0.32, 0.58] },
              );
              introObserver.observe(chartHost);
            }
          }
          svg.setAttribute("role", "img");
          svg.setAttribute(
            "aria-label",
            "چرخ چارت تولد همراه با درجه آغاز خانه‌ها، بر پایه داده‌های ذخیره‌شده در گزارش هالیوس",
          );
        }
        setRendererState("ready");
      } catch {
        if (!cancelled) {
          chartHost.replaceChildren();
          setRendererState("error");
        }
      }
    }

    void renderRadix();

    return () => {
      cancelled = true;
      introObserver?.disconnect();
      chartHost.replaceChildren();
    };
  }, [activePattern, chartId, data]);

  useEffect(() => {
    if (rendererState !== "ready") return;
    const host = document.getElementById(chartId);
    const svg = host?.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    applyReadingWheelFocus(svg, data, readingWheelFocus, activePattern);
  }, [activePattern, chartId, data, readingWheelFocus, rendererState]);

  return (
    <section
      className="report-astrochart-wheel"
      data-active-chart-pattern={activePattern?.id ?? readingWheelFocus.pattern?.id ?? "all"}
      data-astrochart-aspect-mode="stored-report-only"
      data-report-reading-focus={readingFocus ?? "none"}
      data-report-wheel-motion="batch8"
      data-report-wheel-visibility-trigger="batch2"
      data-report-birth-chart-aspect-count={data.aspects.length}
      data-report-birth-chart-renderer={ASTROCHART_RENDERER_VERSION}
      data-report-birth-chart-wheel={REPORT_BIRTH_CHART_WHEEL_DATA_VERSION}
      data-report-birth-chart-wheel-source="stored-report-engine-data"
      data-report-birth-chart-wheel-status={rendererState}
    >
      <header className="report-astrochart-wheel-header">
        <div>
          <p className="section-label">چارت دایره‌ای</p>
        </div>
      </header>

      {visiblePatterns.length > 0 ? (
        <div
          aria-label="نمایش الگوهای چارت"
          className={reportStyles.patternWheelControls}
        >
          <p>برجسته‌سازی الگو روی چارت</p>
          <button
            className={reportStyles.patternWheelButton}
            data-active={activePattern === null}
            onClick={() => setActivePatternId(null)}
            type="button"
          >
            همهٔ چارت
          </button>
          {visiblePatterns.map((pattern) => (
            <button
              className={reportStyles.patternWheelButton}
              data-active={activePattern?.id === pattern.id}
              key={pattern.id}
              onClick={() => setActivePatternId(pattern.id)}
              type="button"
            >
              {pattern.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="report-astrochart-wheel-body">
        <div
          className="report-astrochart-wheel-canvas"
          id={chartId}
          aria-busy={rendererState === "loading"}
        />

        <aside
          className="report-astrochart-wheel-legend"
          data-report-birth-chart-retrograde-source="stored-report-only"
          data-report-birth-chart-wheel-guide="persian"
          aria-label="راهنمای فارسی چرخ چارت تولد"
        >
          <div className="report-astrochart-wheel-legend-heading">
            <p className="section-label">راهنمای خواندن</p>
          </div>

          <div>
            <p className="report-astrochart-wheel-legend-label">
              نماد سیاره‌ها
            </p>
            <ul className="report-astrochart-wheel-planets" role="list">
              {WHEEL_PLANET_GUIDE.map((planet) => (
                <li key={planet.id}>
                  <span aria-hidden="true">{planet.symbol}</span>
                  {WHEEL_PLANET_LABELS[planet.id]}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="report-astrochart-wheel-legend-label">
              رنگ رابطه‌های زاویه‌ای
            </p>
            <ul className="report-astrochart-wheel-aspects" role="list">
              {WHEEL_ASPECT_GUIDE.map((aspect) => (
                <li key={aspect.tone}>
                  <span
                    className="report-astrochart-wheel-aspect-swatch"
                    data-aspect-tone={aspect.tone}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{aspect.label}</strong>
                    {` · ${aspect.glyphs} · ${aspect.meaning}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="report-astrochart-wheel-aspect-note">
              تعداد و ضخامت خط‌ها با توجه به رابطه‌های برجسته و دقیقِ ذخیره‌شده
              در همین گزارش تغییر می‌کند.
            </p>
          </div>

          <div>
            <p className="report-astrochart-wheel-legend-label">
              نشانه‌های دوازده‌گانه
            </p>
            <ul className="report-astrochart-wheel-signs" role="list">
              {WHEEL_SIGN_GUIDE.map((sign) => (
                <li key={sign.label}>
                  <span aria-hidden="true">{sign.symbol}</span>
                  {sign.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="report-astrochart-wheel-legend-label">
              محورهای اصلی
            </p>
            <dl className="report-astrochart-wheel-axes">
              {WHEEL_AXIS_GUIDE.map((axis) => (
                <div key={axis.abbreviation}>
                  <dt dir="ltr">{axis.abbreviation}</dt>
                  <dd>{axis.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="report-astrochart-wheel-legend-label">
              نشانه‌های تکمیلی
            </p>
            <dl className="report-astrochart-wheel-notations">
              <div>
                <dt dir="ltr">H1–H12</dt>
                <dd>دوازده خانهٔ چارت</dd>
              </div>
              <div>
                <dt dir="ltr">R</dt>
                <dd>حرکت برگشتی</dd>
              </div>
            </dl>
          </div>

          {retrogradePlanetLabels.length > 0 ? (
            <div className="report-astrochart-wheel-retrograde-section">
              <p className="report-astrochart-wheel-legend-label">
                برگشتی در این چارت
              </p>
              <p className="report-astrochart-wheel-retrogrades">
                {retrogradePlanetLabels.join("، ")}
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {rendererState === "loading" ? (
        <p className="report-astrochart-wheel-state" role="status">
          چرخ چارت در حال آماده‌شدن است…
        </p>
      ) : null}

      {rendererState === "error" ? (
        <div className="report-detail-chart-placeholder" role="note">
          نمایش تصویری چارت در این مرورگر آماده نشد؛ گزارش متنی و داده‌های
          محاسبه‌شده همچنان در دسترس‌اند.
        </div>
      ) : null}

    </section>
  );
}

function buildStoredAstroChartAspects(data: ReportBirthChartWheelData) {
  const placementById = new Map<string, ReportBirthChartWheelPlacement>(
    data.placements.map((placement) => [placement.id, placement]),
  );

  return data.aspects.flatMap((aspect) => {
    const firstPlacement = placementById.get(aspect.firstPlanetId);
    const secondPlacement = placementById.get(aspect.secondPlanetId);

    if (!firstPlacement || !secondPlacement) return [];

    return [
      {
        aspect: {
          name: aspect.aspectId,
          degree: aspect.angle,
          orbit: aspect.orb,
          color: ASPECT_COLORS[aspect.aspectId],
        },
        point: {
          name: REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES[firstPlacement.id],
          position: firstPlacement.longitude,
        },
        toPoint: {
          name: REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES[secondPlacement.id],
          position: secondPlacement.longitude,
        },
        precision: aspect.orb.toFixed(2),
      },
    ];
  });
}

function styleStoredAspectLines(
  svg: SVGSVGElement,
  data: ReportBirthChartWheelData,
  activePattern: ChartPattern | null,
) {
  const aspectLines = svg.querySelectorAll<SVGLineElement>(
    'line[data-precision]',
  );
  const activeAspectIds = new Set(activePattern?.aspectIds ?? []);

  aspectLines.forEach((line, index) => {
    const orb = Number(line.dataset.precision);
    const isVeryTight = Number.isFinite(orb) && orb <= 1;
    const isTight = Number.isFinite(orb) && orb <= 2.5;
    const aspect = data.aspects[index];
    const belongsToPattern = Boolean(
      activePattern && aspect && activeAspectIds.has(aspect.id),
    );
    const isDimmed = Boolean(activePattern && !belongsToPattern);

    if (aspect) line.setAttribute("data-halleus-aspect-id", aspect.id);
    line.setAttribute(
      "stroke-width",
      belongsToPattern ? "3" : isVeryTight ? "2.4" : isTight ? "1.8" : "1.25",
    );
    line.setAttribute(
      "stroke-opacity",
      isDimmed
        ? "0.12"
        : belongsToPattern
          ? "0.98"
          : isVeryTight
            ? "0.92"
            : isTight
              ? "0.78"
              : "0.62",
    );
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute(
      "data-halleus-aspect-weight",
      belongsToPattern
        ? "pattern"
        : isVeryTight
          ? "primary"
          : isTight
            ? "strong"
            : "supporting",
    );
  });
}

function appendPatternPlanetHighlights(
  svg: SVGSVGElement,
  data: ReportBirthChartWheelData,
  activePattern: ChartPattern | null,
) {
  svg.querySelector('[data-halleus-pattern-highlights]')?.remove();
  if (!activePattern) return;

  const placements = data.placements.filter((placement) =>
    activePattern.participantIds.includes(placement.id),
  );
  if (placements.length === 0) return;

  const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
  const shift = 360 - data.cusps[0];
  const radius = ASTROCHART_RADIUS / 1.34;
  wrapper.setAttribute("data-halleus-pattern-highlights", activePattern.id);
  wrapper.setAttribute("aria-hidden", "true");

  placements.forEach((placement) => {
    const angleInRadians =
      (180 - (placement.longitude + shift)) * (Math.PI / 180);
    const x = ASTROCHART_CENTER + radius * Math.cos(angleInRadians);
    const y = ASTROCHART_CENTER + radius * Math.sin(angleInRadians);
    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    const title = document.createElementNS(SVG_NAMESPACE, "title");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", "17");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#1E40AF");
    circle.setAttribute("stroke-width", "2.4");
    circle.setAttribute("stroke-opacity", "0.9");
    circle.setAttribute("data-pattern-planet-id", placement.id);
    title.textContent = activePattern.title + ": " + WHEEL_PLANET_LABELS[placement.id];
    circle.appendChild(title);
    wrapper.appendChild(circle);
  });

  svg.appendChild(wrapper);
}

type ReadingWheelFocus = {
  planetIds: ReportBirthChartWheelPlanetId[];
  aspectIds: string[];
  includeAscendant: boolean;
  house: number | null;
  pattern: ChartPattern | null;
};

function resolveReadingWheelFocus(
  focus: string | null,
  patterns: ChartPattern[],
  data: ReportBirthChartWheelData,
): ReadingWheelFocus {
  const empty: ReadingWheelFocus = {
    planetIds: [],
    aspectIds: [],
    includeAscendant: false,
    house: null,
    pattern: null,
  };
  if (!focus || focus === "overview") return empty;

  const pattern = patterns.find(
    (item) => focus === item.id || focus === `dynamic-${item.id}`,
  ) ?? null;
  if (pattern) {
    return {
      ...empty,
      planetIds: pattern.participantIds.filter(
        (id): id is ReportBirthChartWheelPlanetId => id in WHEEL_PLANET_LABELS,
      ),
      aspectIds: pattern.aspectIds,
      pattern,
    };
  }

  if (focus === "sun-moon-rising") {
    return { ...empty, planetIds: ["sun", "moon"], includeAscendant: true };
  }
  if (focus === "rising-ruler" || focus === "chart-ruler-story") {
    return { ...empty, includeAscendant: true };
  }
  if (
    focus === "sun" ||
    focus === "moon" ||
    focus === "mercury" ||
    focus === "venus" ||
    focus === "mars" ||
    focus === "jupiter" ||
    focus === "saturn"
  ) {
    return { ...empty, planetIds: [focus] };
  }
  const dynamicPlanet = /^dynamic-(?:angular|outer)-(uranus|neptune|pluto|sun|moon|mercury|venus|mars|jupiter|saturn)$/u.exec(focus)?.[1];
  if (dynamicPlanet && dynamicPlanet in WHEEL_PLANET_LABELS) {
    return { ...empty, planetIds: [dynamicPlanet as ReportBirthChartWheelPlanetId] };
  }
  if (focus.startsWith("dynamic-aspect-")) {
    const aspectId = focus.slice("dynamic-aspect-".length);
    const aspect = data.aspects.find((item) => item.id === aspectId);
    if (aspect) {
      return {
        ...empty,
        aspectIds: [aspect.id],
        planetIds: [aspect.firstPlanetId, aspect.secondPlanetId].filter(
          (id): id is ReportBirthChartWheelPlanetId => id in WHEEL_PLANET_LABELS,
        ),
      };
    }
  }
  const houseMatch = /^dynamic-house-(\d{1,2})$/u.exec(focus);
  const house = houseMatch ? Number(houseMatch[1]) : null;
  if (house && house >= 1 && house <= 12) return { ...empty, house };
  return empty;
}

function applyReadingWheelFocus(
  svg: SVGSVGElement,
  data: ReportBirthChartWheelData,
  focus: ReadingWheelFocus,
  manualPattern: ChartPattern | null,
) {
  svg.querySelector('[data-halleus-reading-focus]')?.remove();
  const effectivePattern = manualPattern ?? focus.pattern;
  const planetIds = new Set<string>([
    ...focus.planetIds,
    ...(effectivePattern?.participantIds ?? []),
  ]);
  const aspectIds = new Set<string>([
    ...focus.aspectIds,
    ...(effectivePattern?.aspectIds ?? []),
  ]);
  const hasFocus =
    planetIds.size > 0 ||
    aspectIds.size > 0 ||
    focus.includeAscendant ||
    focus.house !== null;

  const aspectLines = svg.querySelectorAll<SVGLineElement>('line[data-precision]');
  aspectLines.forEach((line, index) => {
    const aspect = data.aspects[index];
    if (!aspect) return;
    const matches =
      aspectIds.has(aspect.id) ||
      planetIds.has(aspect.firstPlanetId) ||
      planetIds.has(aspect.secondPlanetId);
    if (hasFocus && matches) {
      line.setAttribute("stroke-opacity", "0.98");
      line.setAttribute("stroke-width", "2.8");
      line.setAttribute("data-report-reading-aspect-focus", "true");
    } else {
      line.removeAttribute("data-report-reading-aspect-focus");
      if (hasFocus) line.setAttribute("stroke-opacity", "0.16");
    }
  });

  if (!hasFocus) {
    styleStoredAspectLines(svg, data, manualPattern);
    return;
  }

  const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
  wrapper.setAttribute("data-halleus-reading-focus", "true");
  wrapper.setAttribute("aria-hidden", "true");

  for (const placement of data.placements) {
    if (!planetIds.has(placement.id)) continue;
    const point = getWheelPoint(placement.longitude, data, ASTROCHART_RADIUS / 1.34);
    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    circle.setAttribute("cx", point.x.toString());
    circle.setAttribute("cy", point.y.toString());
    circle.setAttribute("r", placement.id === "sun" || placement.id === "moon" ? "20" : "17");
    circle.setAttribute("fill", "#F8FAFC");
    circle.setAttribute("fill-opacity", "0.18");
    circle.setAttribute("stroke", "#1E40AF");
    circle.setAttribute("stroke-width", "2.6");
    circle.setAttribute("data-report-reading-planet-focus", placement.id);
    wrapper.appendChild(circle);
  }

  if (focus.includeAscendant) {
    const point = getWheelPoint(data.ascendantLongitude, data, ASTROCHART_RADIUS - 8);
    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    circle.setAttribute("cx", point.x.toString());
    circle.setAttribute("cy", point.y.toString());
    circle.setAttribute("r", "12");
    circle.setAttribute("fill", "#D9EAFD");
    circle.setAttribute("stroke", "#1E40AF");
    circle.setAttribute("stroke-width", "2.4");
    circle.setAttribute("data-report-reading-asc-focus", "true");
    wrapper.appendChild(circle);
  }

  if (focus.house !== null && data.cusps.length === 12) {
    const cusp = data.cusps[focus.house - 1];
    const point = getWheelPoint(cusp, data, ASTROCHART_RADIUS - 14);
    const line = document.createElementNS(SVG_NAMESPACE, "line");
    line.setAttribute("x1", ASTROCHART_CENTER.toString());
    line.setAttribute("y1", ASTROCHART_CENTER.toString());
    line.setAttribute("x2", point.x.toString());
    line.setAttribute("y2", point.y.toString());
    line.setAttribute("stroke", "#1E40AF");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("data-report-reading-house-focus", String(focus.house));
    wrapper.appendChild(line);
  }
  svg.appendChild(wrapper);
}

function appendIntroMotionOverlay(
  svg: SVGSVGElement,
  data: ReportBirthChartWheelData,
) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  svg.querySelector('[data-halleus-intro-motion]')?.remove();
  const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
  wrapper.setAttribute("data-halleus-intro-motion", "true");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.setAttribute("style", "pointer-events:none");

  const ring = document.createElementNS(SVG_NAMESPACE, "circle");
  ring.setAttribute("cx", ASTROCHART_CENTER.toString());
  ring.setAttribute("cy", ASTROCHART_CENTER.toString());
  ring.setAttribute("r", (ASTROCHART_RADIUS - 3).toString());
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "#52657A");
  ring.setAttribute("stroke-width", "1.4");
  ring.setAttribute("data-report-wheel-intro-ring", "true");
  wrapper.appendChild(ring);

  data.cusps.forEach((cusp, index) => {
    const point = getWheelPoint(cusp, data, ASTROCHART_RADIUS - 10);
    const line = document.createElementNS(SVG_NAMESPACE, "line");
    line.setAttribute("x1", ASTROCHART_CENTER.toString());
    line.setAttribute("y1", ASTROCHART_CENTER.toString());
    line.setAttribute("x2", point.x.toString());
    line.setAttribute("y2", point.y.toString());
    line.setAttribute("stroke", "#9AA6B2");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("data-report-wheel-intro-house", String(index + 1));
    line.style.setProperty("--report-motion-index", String(index));
    wrapper.appendChild(line);
  });

  data.placements.forEach((placement, index) => {
    const point = getWheelPoint(placement.longitude, data, ASTROCHART_RADIUS / 1.34);
    const circle = document.createElementNS(SVG_NAMESPACE, "circle");
    circle.setAttribute("cx", point.x.toString());
    circle.setAttribute("cy", point.y.toString());
    circle.setAttribute("r", placement.id === "sun" || placement.id === "moon" ? "7" : "5");
    circle.setAttribute("fill", placement.id === "sun" || placement.id === "moon" ? "#1E40AF" : "#52657A");
    circle.setAttribute("data-report-wheel-intro-planet", placement.id);
    if (placement.id === "sun" || placement.id === "moon") {
      circle.setAttribute("data-report-wheel-intro-luminary", "true");
    }
    circle.style.setProperty("--report-motion-index", String(index));
    wrapper.appendChild(circle);
  });

  const ascPoint = getWheelPoint(data.ascendantLongitude, data, ASTROCHART_RADIUS - 5);
  const asc = document.createElementNS(SVG_NAMESPACE, "circle");
  asc.setAttribute("cx", ascPoint.x.toString());
  asc.setAttribute("cy", ascPoint.y.toString());
  asc.setAttribute("r", "8");
  asc.setAttribute("fill", "#D9EAFD");
  asc.setAttribute("stroke", "#1E40AF");
  asc.setAttribute("stroke-width", "2");
  asc.setAttribute("data-report-wheel-intro-asc", "true");
  wrapper.appendChild(asc);

  data.aspects.slice(0, 6).forEach((aspect, index) => {
    const first = data.placements.find((item) => item.id === aspect.firstPlanetId);
    const second = data.placements.find((item) => item.id === aspect.secondPlanetId);
    if (!first || !second) return;
    const firstPoint = getWheelPoint(first.longitude, data, ASTROCHART_RADIUS / 2.1);
    const secondPoint = getWheelPoint(second.longitude, data, ASTROCHART_RADIUS / 2.1);
    const line = document.createElementNS(SVG_NAMESPACE, "line");
    line.setAttribute("x1", firstPoint.x.toString());
    line.setAttribute("y1", firstPoint.y.toString());
    line.setAttribute("x2", secondPoint.x.toString());
    line.setAttribute("y2", secondPoint.y.toString());
    line.setAttribute("stroke", ASPECT_COLORS[aspect.aspectId]);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("data-report-wheel-intro-aspect", aspect.id);
    line.style.setProperty("--report-motion-index", String(index));
    wrapper.appendChild(line);
  });

  svg.appendChild(wrapper);
}

function getWheelPoint(
  longitude: number,
  data: ReportBirthChartWheelData,
  radius: number,
) {
  const shift = data.cusps.length > 0 ? 360 - data.cusps[0] : 0;
  const angle = (180 - (longitude + shift)) * (Math.PI / 180);
  return {
    x: ASTROCHART_CENTER + radius * Math.cos(angle),
    y: ASTROCHART_CENTER + radius * Math.sin(angle),
  };
}

// HALLEUS_REPORT_WHEEL_MOTION_BATCH8_20260807

function appendStoredCuspLabels(
  svg: SVGSVGElement,
  data: ReportBirthChartWheelData,
) {
  const existing = svg.querySelector('[data-halleus-stored-cusp-labels]');
  existing?.remove();

  if (data.houses.length !== 12 || data.cusps.length !== 12) return;

  const wrapper = document.createElementNS(SVG_NAMESPACE, "g");
  const shift = 360 - data.cusps[0];

  wrapper.setAttribute("class", "report-astrochart-cusp-labels");
  wrapper.setAttribute("data-halleus-stored-cusp-labels", "true");
  wrapper.setAttribute("data-cusp-label-source", "stored-report-houses");
  wrapper.setAttribute("aria-hidden", "true");

  data.houses.forEach((house) => {
    const sign = WHEEL_SIGN_GUIDE.find(
      (candidate) => candidate.id === house.signId,
    );
    if (!sign) return;

    const displayRadius =
      ASTROCHART_CUSP_LABEL_RADIUS +
      (house.number % 2 === 0 ? ASTROCHART_CUSP_LABEL_OFFSET : 0);
    const angleInRadians =
      (180 - (house.cuspLongitude + shift)) * (Math.PI / 180);
    const x = ASTROCHART_CENTER + displayRadius * Math.cos(angleInRadians);
    const y = ASTROCHART_CENTER + displayRadius * Math.sin(angleInRadians);
    const degreeLabel = PERSIAN_CUSP_DEGREE_FORMATTER.format(
      house.degreeInSign,
    );
    const label = `${degreeLabel}°`;
    const labelWidth = Math.max(34, degreeLabel.length * 7 + 14);
    const labelGroup = document.createElementNS(SVG_NAMESPACE, "g");
    const background = document.createElementNS(SVG_NAMESPACE, "rect");
    const text = document.createElementNS(SVG_NAMESPACE, "text");
    const title = document.createElementNS(SVG_NAMESPACE, "title");

    labelGroup.setAttribute("class", "report-astrochart-cusp-label");
    labelGroup.setAttribute("data-house", house.number.toString());
    labelGroup.setAttribute(
      "data-stored-cusp-longitude",
      house.cuspLongitude.toString(),
    );
    labelGroup.setAttribute("transform", `translate(${x} ${y})`);
    background.setAttribute("x", (-labelWidth / 2).toString());
    background.setAttribute("y", "-10");
    background.setAttribute("width", labelWidth.toString());
    background.setAttribute("height", "20");
    background.setAttribute("rx", "8");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("direction", "ltr");
    text.textContent = label;
    title.textContent = `آغاز خانه ${house.number}: درجه ${degreeLabel} ${sign.label}`;
    labelGroup.append(background, text, title);
    wrapper.appendChild(labelGroup);
  });

  svg.appendChild(wrapper);
}
