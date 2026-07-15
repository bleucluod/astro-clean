"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  buildReportBirthChartWheelData,
  REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES,
  REPORT_BIRTH_CHART_WHEEL_DATA_VERSION,
  type ReportBirthChartWheelData,
  type ReportBirthChartWheelPlanetId,
  type ReportBirthChartWheelPlacement,
} from "@/src/lib/report-output/report-birth-chart-wheel-data";
import type { RealEngineReportAspectKind } from "@/types/astro";
import type { AstrologyReport } from "@/types/astro";

type ReportBirthChartWheelProps = {
  report: AstrologyReport;
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

  return <AstroChartRadix data={wheelResult.data} />;
}

function AstroChartRadix({ data }: { data: ReportBirthChartWheelData }) {
  const reactId = useId().replace(/:/g, "");
  const chartId = `halleus-report-astrochart-${reactId}`;
  const [rendererState, setRendererState] =
    useState<RendererState>("loading");
  const retrogradePlanetLabels = data.retrogradePlanetIds.map(
    (planetId) => WHEEL_PLANET_LABELS[planetId],
  );

  useEffect(() => {
    let cancelled = false;
    const host = document.getElementById(chartId);

    if (!host) {
      setRendererState("error");
      return undefined;
    }

    const chartHost = host;

    chartHost.replaceChildren();
    setRendererState("loading");

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
          styleStoredAspectLines(svg);
          appendStoredCuspLabels(svg, data);
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
      chartHost.replaceChildren();
    };
  }, [chartId, data]);

  return (
    <section
      className="report-astrochart-wheel"
      data-astrochart-aspect-mode="stored-report-only"
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

function styleStoredAspectLines(svg: SVGSVGElement) {
  const aspectLines = svg.querySelectorAll<SVGLineElement>(
    'line[data-precision]',
  );

  aspectLines.forEach((line) => {
    const orb = Number(line.dataset.precision);
    const isVeryTight = Number.isFinite(orb) && orb <= 1;
    const isTight = Number.isFinite(orb) && orb <= 2.5;

    line.setAttribute(
      "stroke-width",
      isVeryTight ? "2.4" : isTight ? "1.8" : "1.25",
    );
    line.setAttribute(
      "stroke-opacity",
      isVeryTight ? "0.92" : isTight ? "0.78" : "0.62",
    );
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute(
      "data-halleus-aspect-weight",
      isVeryTight ? "primary" : isTight ? "strong" : "supporting",
    );
  });
}

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
