import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";
import type { ZodiacKey } from "@/types/astro";

export type RealChartWheelPlacement = {
  id: string;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: string;
};

type RealChartWheelProps = {
  placements: RealChartWheelPlacement[];
  ascendantLongitude: number;
};

const WHEEL_SIGNS: Array<{ id: ZodiacKey; glyph: string }> = [
  { id: "aries", glyph: "?" },
  { id: "taurus", glyph: "?" },
  { id: "gemini", glyph: "?" },
  { id: "cancer", glyph: "?" },
  { id: "leo", glyph: "?" },
  { id: "virgo", glyph: "?" },
  { id: "libra", glyph: "?" },
  { id: "scorpio", glyph: "?" },
  { id: "sagittarius", glyph: "?" },
  { id: "capricorn", glyph: "?" },
  { id: "aquarius", glyph: "?" },
  { id: "pisces", glyph: "?" },
];

const PLANET_GLYPHS: Record<string, string> = {
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
};

export function RealChartWheel({
  placements,
  ascendantLongitude,
}: RealChartWheelProps) {
  const ascStart = polarPoint(ascendantLongitude, 76);
  const ascEnd = polarPoint(ascendantLongitude, 178);

  return (
    <section className="rounded-[2rem] border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            Chart wheel
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
            چرخ چارت
          </h2>
        </div>
        <p className="text-sm leading-7 text-[#7A695A]">
          سیاره‌ها واقعی‌تر محاسبه شده‌اند؛ خانه‌ها فعلاً تقریبی‌اند.
        </p>
      </div>

      <div className="mt-5 flex justify-center">
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label="Real chart wheel with zodiac signs and planet placements"
          className="h-auto w-full max-w-[460px]"
        >
          <circle cx="200" cy="200" r="184" fill="#FFFDF8" stroke="#D8C2AA" strokeWidth="2" />
          <circle cx="200" cy="200" r="150" fill="#FFF9F2" stroke="#E8D8C6" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="112" fill="#FFFDF8" stroke="#EFE2D2" strokeWidth="1" />
          <circle cx="200" cy="200" r="68" fill="#F8EFE5" stroke="#EFE2D2" strokeWidth="1" />

          {WHEEL_SIGNS.map((sign, index) => {
            const longitude = index * 30;
            const lineStart = polarPoint(longitude, 112);
            const lineEnd = polarPoint(longitude, 184);
            const labelPoint = polarPoint(longitude + 15, 167);

            return (
              <g key={sign.id}>
                <line
                  x1={lineStart.x}
                  y1={lineStart.y}
                  x2={lineEnd.x}
                  y2={lineEnd.y}
                  stroke="#E4D2BE"
                  strokeWidth="1"
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#6A4B35] text-[17px] font-bold"
                >
                  {sign.glyph}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#8A6A51] text-[8px] font-semibold"
                >
                  {ZODIAC_LABELS[sign.id].faName}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 22}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#9A6B45] text-[6px] font-semibold"
                >
                  {ZODIAC_LABELS[sign.id].enName}
                </text>
              </g>
            );
          })}

          <line
            x1={ascStart.x}
            y1={ascStart.y}
            x2={ascEnd.x}
            y2={ascEnd.y}
            stroke="#6A4B35"
            strokeWidth="2.5"
          />
          <text
            x={ascEnd.x}
            y={ascEnd.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#3E2F25] text-[10px] font-bold"
          >
            ASC
          </text>

          {placements.map((placement, index) => {
            const marker = polarPoint(placement.longitude, 96 - (index % 3) * 10);
            const anchor = polarPoint(placement.longitude, 128);

            return (
              <g key={placement.id}>
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={marker.x}
                  y2={marker.y}
                  stroke="#C8A884"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="12"
                  fill="#3E2F25"
                  stroke="#D9B58C"
                  strokeWidth="1.5"
                />
                <text
                  x={marker.x}
                  y={marker.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#FFF9F2] text-[12px] font-bold"
                >
                  {PLANET_GLYPHS[placement.id] ?? placement.label.slice(0, 1)}
                </text>
              </g>
            );
          })}

          <text
            x="200"
            y="190"
            textAnchor="middle"
            className="fill-[#3E2F25] text-[13px] font-bold"
          >
            Halleus
          </text>
          <text
            x="200"
            y="210"
            textAnchor="middle"
            className="fill-[#8A6A51] text-[9px] font-semibold"
          >
            real chart workbench
          </text>
        </svg>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[#6B5A4C] md:grid-cols-2">
        <div className="rounded-2xl bg-white p-3">
          <span className="font-bold text-[#4A382C]">واقعی‌تر:</span>{" "}
          موقعیت سیاره‌ها با engine محاسبه می‌شود.
        </div>
        <div className="rounded-2xl bg-white p-3">
          <span className="font-bold text-[#4A382C]">مرحله بعد:</span>{" "}
          house system و ASC باید harden شود.
        </div>
      </div>
    </section>
  );
}

function polarPoint(longitude: number, radius: number): { x: number; y: number } {
  const angle = ((longitude - 90) * Math.PI) / 180;

  return {
    x: 200 + radius * Math.cos(angle),
    y: 200 + radius * Math.sin(angle),
  };
}
