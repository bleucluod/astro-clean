"use client";

import { useMemo, useState } from "react";
import type { RealEngineReportAspectKind, ZodiacKey } from "@/types/astro";
import type {
  SynastryBiWheelData,
  SynastryBiWheelPoint,
  SynastryHouseCusp,
} from "@/types/synastry-engine";
import styles from "./halleus-wheel-core.module.css";

export const HALLEUS_WHEEL_SYSTEM_VERSION = "halleus-wheel-shared-v1" as const;

export const HALLEUS_WHEEL_THEME = {
  background: "#0B0D11",
  point: "#F4F6F8",
  sign: "#E5EAF0",
  ring: "#4B535E",
  line: "#3A424C",
  muted: "#A9B2BD",
} as const;

export const HALLEUS_WHEEL_ASPECT_COLORS: Record<
  RealEngineReportAspectKind,
  string
> = {
  conjunction: "#78818C",
  sextile: "#6A8C7E",
  square: "#956A6A",
  trine: "#6A8C7E",
  opposition: "#956A6A",
};

export const HALLEUS_ZODIAC_GUIDE: ReadonlyArray<{
  id: ZodiacKey;
  symbol: string;
}> = [
  { id: "aries", symbol: "♈" },
  { id: "taurus", symbol: "♉" },
  { id: "gemini", symbol: "♊" },
  { id: "cancer", symbol: "♋" },
  { id: "leo", symbol: "♌" },
  { id: "virgo", symbol: "♍" },
  { id: "libra", symbol: "♎" },
  { id: "scorpio", symbol: "♏" },
  { id: "sagittarius", symbol: "♐" },
  { id: "capricorn", symbol: "♑" },
  { id: "aquarius", symbol: "♒" },
  { id: "pisces", symbol: "♓" },
] as const;

const SIZE = 720;
const CENTER = SIZE / 2;
const INNER_RADIUS = 214;
const OUTER_RADIUS = 286;
const SIGN_RADIUS = 326;
const IMPORTANT_ASPECT_LIMIT = 16;
const MIN_LABEL_SEPARATION = 8;

const CORE_SYMBOLS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  asc: "As",
  dsc: "Ds",
  mc: "Mc",
  ic: "Ic",
  "north-node": "☊",
  "south-node": "☋",
  "black-moon-lilith": "⚸",
  chiron: "⚷",
  "part-of-fortune": "⊗",
  vertex: "Vx",
  ceres: "⚳",
  pallas: "⚴",
  juno: "⚵",
  vesta: "⚶",
};

type WheelPointLayout = {
  point: SynastryBiWheelPoint;
  displayLongitude: number;
  labelRadius: number;
  collisionShifted: boolean;
};

type HalleusSynastryWheelProps = {
  data: SynastryBiWheelData;
  chartALabel: string;
  chartBLabel: string;
  chartAHouses?: readonly SynastryHouseCusp[];
  chartBHouses?: readonly SynastryHouseCusp[];
};

function polarPoint(longitude: number, radius: number) {
  const radians = ((longitude - 90) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
}

function resolveLabelCollision(
  points: readonly SynastryBiWheelPoint[],
  radius: number,
): WheelPointLayout[] {
  const sorted = [...points].sort(
    (left, right) =>
      left.longitude - right.longitude ||
      left.pointId.localeCompare(right.pointId),
  );
  let previous = Number.NEGATIVE_INFINITY;
  return sorted.map((point, index) => {
    let displayLongitude = point.longitude;
    if (displayLongitude - previous < MIN_LABEL_SEPARATION) {
      displayLongitude = previous + MIN_LABEL_SEPARATION;
    }
    previous = displayLongitude;
    return {
      point,
      displayLongitude,
      labelRadius: radius + (index % 2 === 0 ? -12 : 12),
      collisionShifted: Math.abs(displayLongitude - point.longitude) > 0.35,
    };
  });
}

function pointSymbol(point: SynastryBiWheelPoint) {
  if (CORE_SYMBOLS[point.pointId]) return CORE_SYMBOLS[point.pointId];
  if (point.pointKind === "fixed-star") return "★";
  if (point.pointKind === "traditional-lot") return "Lot";
  if (point.pointKind === "advanced-body") return point.label.slice(0, 1);
  return point.label.slice(0, 2);
}

function isAdvanced(point: SynastryBiWheelPoint) {
  return (
    point.pointKind === "advanced-body" ||
    point.pointKind === "traditional-lot" ||
    point.pointKind === "fixed-star"
  );
}

function WheelPoint({
  layout,
  radius,
  side,
}: {
  layout: WheelPointLayout;
  radius: number;
  side: "a" | "b";
}) {
  const actual = polarPoint(layout.point.longitude, radius);
  const position = polarPoint(layout.displayLongitude, layout.labelRadius);
  const accessibleLabel = `${layout.point.label} در ${layout.point.longitude.toFixed(1)} درجه`;

  return (
    <g
      className={styles.point}
      data-side={side}
      data-point-kind={layout.point.pointKind}
      data-collision-shifted={layout.collisionShifted ? "true" : "false"}
      aria-label={accessibleLabel}
      role="img"
      tabIndex={0}
    >
      <title>{accessibleLabel}</title>
      {layout.collisionShifted ? (
        <line
          className={styles.leader}
          x1={actual.x}
          y1={actual.y}
          x2={position.x}
          y2={position.y}
        />
      ) : null}
      <circle cx={position.x} cy={position.y} r={17} />
      <text
        x={position.x}
        y={position.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {pointSymbol(layout.point)}
      </text>
    </g>
  );
}

export function HalleusSynastryWheel({
  data,
  chartALabel,
  chartBLabel,
  chartAHouses = [],
  chartBHouses = [],
}: HalleusSynastryWheelProps) {
  const [showAllAspects, setShowAllAspects] = useState(false);
  const [showAdvancedPoints, setShowAdvancedPoints] = useState(false);

  const fullInner = data.fullInnerPoints ?? data.innerPoints;
  const fullOuter = data.fullOuterPoints ?? data.outerPoints;
  const innerPoints = showAdvancedPoints
    ? fullInner
    : fullInner.filter((point) => !isAdvanced(point));
  const outerPoints = showAdvancedPoints
    ? fullOuter
    : fullOuter.filter((point) => !isAdvanced(point));

  const innerById = useMemo(
    () => new Map(fullInner.map((point) => [point.pointId, point])),
    [fullInner],
  );
  const outerById = useMemo(
    () => new Map(fullOuter.map((point) => [point.pointId, point])),
    [fullOuter],
  );
  const rankedAspectLines = useMemo(
    () =>
      [...data.aspectLines].sort(
        (left, right) =>
          right.relevanceScore - left.relevanceScore ||
          left.contactId.localeCompare(right.contactId),
      ),
    [data.aspectLines],
  );
  const aspectLines = showAllAspects
    ? rankedAspectLines
    : rankedAspectLines.slice(0, IMPORTANT_ASPECT_LIMIT);

  const innerLayout = resolveLabelCollision(innerPoints, INNER_RADIUS);
  const outerLayout = resolveLabelCollision(outerPoints, OUTER_RADIUS);
  const advancedCount =
    fullInner.filter(isAdvanced).length + fullOuter.filter(isAdvanced).length;

  const summary = `${chartALabel} در حلقه داخلی و ${chartBLabel} در حلقه بیرونی؛ ${fullInner.length + fullOuter.length} نقطه و ${rankedAspectLines.length} تماس بین دو چارت.`;

  return (
    <div
      className={styles.shell}
      data-halleus-wheel-system={HALLEUS_WHEEL_SYSTEM_VERSION}
      data-halleus-wheel-mode="synastry"
    >
      <p className={styles.srOnly}>{summary}</p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`چرخ مقایسه ${chartALabel} و ${chartBLabel}`}
      >
        <circle
          fill={HALLEUS_WHEEL_THEME.background}
          cx={CENTER}
          cy={CENTER}
          r={346}
        />
        <circle className={styles.ring} cx={CENTER} cy={CENTER} r={INNER_RADIUS} />
        <circle className={styles.ring} cx={CENTER} cy={CENTER} r={OUTER_RADIUS} />
        <circle className={styles.ringSoft} cx={CENTER} cy={CENTER} r={SIGN_RADIUS} />

        {HALLEUS_ZODIAC_GUIDE.map((sign, index) => {
          const start = polarPoint(index * 30, INNER_RADIUS - 30);
          const end = polarPoint(index * 30, SIGN_RADIUS + 12);
          const label = polarPoint(index * 30 + 15, SIGN_RADIUS);
          return (
            <g key={sign.id}>
              <line
                className={styles.sector}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
              <text
                className={styles.sign}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {sign.symbol}
              </text>
            </g>
          );
        })}

        {chartAHouses.map((house) => {
          const start = polarPoint(house.cuspLongitude, 74);
          const end = polarPoint(house.cuspLongitude, INNER_RADIUS - 28);
          return (
            <line
              className={styles.houseLine}
              data-side="a"
              key={`a-house-${house.number}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}
        {chartBHouses.map((house) => {
          const start = polarPoint(house.cuspLongitude, OUTER_RADIUS + 24);
          const end = polarPoint(house.cuspLongitude, SIGN_RADIUS - 22);
          return (
            <line
              className={styles.houseLine}
              data-side="b"
              key={`b-house-${house.number}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}

        {aspectLines.map((line) => {
          const fromPoint =
            line.fromChartSide === "a"
              ? innerById.get(line.fromPointId)
              : outerById.get(line.fromPointId);
          const toPoint =
            line.toChartSide === "a"
              ? innerById.get(line.toPointId)
              : outerById.get(line.toPointId);
          if (!fromPoint || !toPoint) return null;
          const from = polarPoint(
            fromPoint.longitude,
            line.fromChartSide === "a" ? INNER_RADIUS : OUTER_RADIUS,
          );
          const to = polarPoint(
            toPoint.longitude,
            line.toChartSide === "a" ? INNER_RADIUS : OUTER_RADIUS,
          );
          return (
            <line
              key={line.contactId}
              className={styles.aspect}
              data-polarity={line.polarity}
              stroke={HALLEUS_WHEEL_ASPECT_COLORS[line.aspectId]}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}

        {innerLayout.map((layout) => (
          <WheelPoint
            key={`a-${layout.point.pointId}`}
            layout={layout}
            radius={INNER_RADIUS}
            side="a"
          />
        ))}
        {outerLayout.map((layout) => (
          <WheelPoint
            key={`b-${layout.point.pointId}`}
            layout={layout}
            radius={OUTER_RADIUS}
            side="b"
          />
        ))}

        <text
          className={styles.centerTitle}
          x={CENTER}
          y={CENTER - 10}
          textAnchor="middle"
        >
          {chartALabel}
        </text>
        <text
          className={styles.centerSubtitle}
          x={CENTER}
          y={CENTER + 20}
          textAnchor="middle"
        >
          با {chartBLabel}
        </text>
      </svg>

      <div className={styles.legend} aria-label="راهنمای چرخ مقایسه">
        <span><i data-tone="supportive" /> هماهنگی و فرصت همکاری</span>
        <span><i data-tone="tension" /> اصطکاک و فشار</span>
        <span><i data-tone="conjunction" /> تمرکز و هم‌نشینی</span>
        <span><b>A</b> حلقه داخلی: {chartALabel}</span>
        <span><b>B</b> حلقه بیرونی: {chartBLabel}</span>
      </div>

      <div className={styles.controls}>
        {advancedCount > 0 ? (
          <button
            type="button"
            aria-pressed={showAdvancedPoints}
            onClick={() => setShowAdvancedPoints((value) => !value)}
          >
            {showAdvancedPoints
              ? "پنهان‌کردن نقاط پیشرفته"
              : `نمایش نقاط پیشرفته (${advancedCount.toLocaleString("fa-IR")})`}
          </button>
        ) : null}
        {rankedAspectLines.length > IMPORTANT_ASPECT_LIMIT ? (
          <button
            type="button"
            aria-pressed={showAllAspects}
            onClick={() => setShowAllAspects((value) => !value)}
          >
            {showAllAspects
              ? "فقط تماس‌های مهم روی چرخ"
              : "نمایش همهٔ تماس‌ها روی چرخ"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
