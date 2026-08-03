"use client";

import type { RealSynastryReport, SynastryBiWheelPoint } from "@/types/synastry-engine";

import styles from "./comparison.module.css";

type ComparisonBiWheelProps = {
  report: RealSynastryReport;
};

const SIZE = 720;
const CENTER = SIZE / 2;
const INNER_RADIUS = 214;
const OUTER_RADIUS = 286;
const SIGN_RADIUS = 326;
const POINT_SYMBOLS: Record<string, string> = {
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
};
const SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export function ComparisonBiWheel({ report }: ComparisonBiWheelProps) {
  const innerById = new Map(
    report.biWheel.innerPoints.map((point) => [point.pointId, point]),
  );
  const outerById = new Map(
    report.biWheel.outerPoints.map((point) => [point.pointId, point]),
  );
  const aspectLines = report.biWheel.aspectLines.slice(0, 28);

  return (
    <section className={styles.wheelSection} aria-labelledby="comparison-wheel-title">
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>چرخ مقایسه</p>
        <h2 id="comparison-wheel-title">دو چارت در یک قاب</h2>
        <p>
          حلقهٔ داخلی چارت اول و حلقهٔ بیرونی چارت دوم است. خط‌ها فقط تماس‌های
          محاسبه‌شدهٔ برجسته را نشان می‌دهند.
        </p>
      </div>

      <div className={styles.wheelFrame}>
        <svg
          className={styles.wheelSvg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`چرخ مقایسه ${report.chartA.label} و ${report.chartB.label}`}
        >
          <circle className={styles.wheelBackground} cx={CENTER} cy={CENTER} r={346} />
          <circle className={styles.wheelRing} cx={CENTER} cy={CENTER} r={INNER_RADIUS} />
          <circle className={styles.wheelRing} cx={CENTER} cy={CENTER} r={OUTER_RADIUS} />
          <circle className={styles.wheelRingSoft} cx={CENTER} cy={CENTER} r={SIGN_RADIUS} />

          {Array.from({ length: 12 }, (_, index) => {
            const start = polarPoint(index * 30, INNER_RADIUS - 28);
            const end = polarPoint(index * 30, SIGN_RADIUS + 12);
            const label = polarPoint(index * 30 + 15, SIGN_RADIUS);

            return (
              <g key={`sector-${index}`}>
                <line
                  className={styles.wheelSector}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                />
                <text
                  className={styles.wheelSign}
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {SIGN_SYMBOLS[index]}
                </text>
              </g>
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
                className={styles.wheelAspect}
                data-polarity={line.polarity}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              />
            );
          })}

          {report.biWheel.innerPoints.map((point) => (
            <WheelPoint
              key={`a-${point.pointId}`}
              point={point}
              radius={INNER_RADIUS}
              side="a"
            />
          ))}
          {report.biWheel.outerPoints.map((point) => (
            <WheelPoint
              key={`b-${point.pointId}`}
              point={point}
              radius={OUTER_RADIUS}
              side="b"
            />
          ))}

          <text
            className={styles.wheelCenterTitle}
            x={CENTER}
            y={CENTER - 10}
            textAnchor="middle"
          >
            {report.chartA.label}
          </text>
          <text
            className={styles.wheelCenterSubtitle}
            x={CENTER}
            y={CENTER + 20}
            textAnchor="middle"
          >
            با {report.chartB.label}
          </text>
        </svg>

        <div className={styles.wheelLegend} aria-label="راهنمای چرخ مقایسه">
          <span><i data-tone="supportive" /> حمایت و همکاری</span>
          <span><i data-tone="tension" /> اصطکاک و فشار</span>
          <span><i data-tone="intense" /> تماس فشرده</span>
          <span><b>A</b> حلقه داخلی: {report.chartA.label}</span>
          <span><b>B</b> حلقه بیرونی: {report.chartB.label}</span>
        </div>
      </div>
    </section>
  );
}

function WheelPoint({
  point,
  radius,
  side,
}: {
  point: SynastryBiWheelPoint;
  radius: number;
  side: "a" | "b";
}) {
  const position = polarPoint(point.longitude, radius);
  const symbol = POINT_SYMBOLS[point.pointId] ?? point.label.slice(0, 2);

  return (
    <g
      className={styles.wheelPoint}
      data-side={side}
      aria-label={`${point.label} در ${point.longitude.toFixed(1)} درجه`}
    >
      <circle cx={position.x} cy={position.y} r={17} />
      <text
        x={position.x}
        y={position.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {symbol}
      </text>
    </g>
  );
}

function polarPoint(longitude: number, radius: number) {
  const radians = ((longitude - 90) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
}
