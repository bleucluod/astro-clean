import { ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";
import type {
  RealEngineReportAngle,
  RealEngineReportAngles,
  RealEngineReportAspect,
  RealEngineReportHouse,
  ZodiacKey,
} from "@/types/astro";

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
  houses?: RealEngineReportHouse[];
  angles?: RealEngineReportAngles;
  aspects?: RealEngineReportAspect[];
  retrogradePlanetIds?: string[];
  houseSystem?: string;
};

type WheelAngle = {
  id: RealEngineReportAngle["id"];
  label: string;
  longitude: number;
  source: string;
  house?: number | null;
};

type WheelAspectLine = {
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const WHEEL_SIGNS: Array<{ id: ZodiacKey; glyph: string }> = [
  { id: "aries", glyph: "♈" },
  { id: "taurus", glyph: "♉" },
  { id: "gemini", glyph: "♊" },
  { id: "cancer", glyph: "♋" },
  { id: "leo", glyph: "♌" },
  { id: "virgo", glyph: "♍" },
  { id: "libra", glyph: "♎" },
  { id: "scorpio", glyph: "♏" },
  { id: "sagittarius", glyph: "♐" },
  { id: "capricorn", glyph: "♑" },
  { id: "aquarius", glyph: "♒" },
  { id: "pisces", glyph: "♓" },
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

const ANGLE_LABELS: Record<RealEngineReportAngle["id"], string> = {
  asc: "رایزینگ",
  dsc: "روبه‌رو",
  mc: "میانه آسمان",
  ic: "ریشه آسمان",
};

const HOUSE_SYSTEM_LABELS: Record<string, string> = {
  "whole-sign": "روش نشانه کامل",
  "equal-house": "روش خانه برابر",
  placidus: "پلاسیدوس",
  placeholder: "در حال تکمیل",
};

export function RealChartWheel({
  placements,
  ascendantLongitude,
  houses,
  angles,
  aspects,
  retrogradePlanetIds,
  houseSystem,
}: RealChartWheelProps) {
  const wheelHouses = buildWheelHouses(houses);
  const wheelAngles = buildWheelAngles(angles, ascendantLongitude);
  const aspectLines = buildAspectLines(placements, aspects ?? []).slice(0, 5);
  const retrogradeSet = new Set(retrogradePlanetIds ?? []);
  const houseSystemLabel = formatHouseSystemLabel(houseSystem);

  return (
    <section className="report-real-chart-wheel-structure rounded-[2rem] border border-[#BCCCDC] bg-[#F8FAFC] p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#64748B]">
            چارت محاسبه‌شده
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#243447]">
            چرخ چارت تولد
          </h2>
        </div>
        <p className="text-sm leading-7 text-[#64748B]">
          نمای فشرده‌ای از جایگاه‌ها، خانه‌ها، محورهای اصلی و چند رابطه برجسته.
        </p>
      </div>

      <div className="mt-5 flex justify-center">
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label="چرخ چارت تولد با نشان‌ها، خانه‌ها، محورهای اصلی، روابط سیاره‌ای و جایگاه سیاره‌ها"
          className="h-auto w-full max-w-[500px]"
        >
          <circle cx="200" cy="200" r="184" fill="#F8FAFC" stroke="#BCCCDC" strokeWidth="2" />
          <circle cx="200" cy="200" r="150" fill="#F8FAFC" stroke="#BCCCDC" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="112" fill="#F8FAFC" stroke="#D9EAFD" strokeWidth="1" />
          <circle cx="200" cy="200" r="68" fill="#D9EAFD" stroke="#D9EAFD" strokeWidth="1" />

          {wheelHouses.map((house) => {
            const cuspStart = polarPoint(house.cuspLongitude, 68);
            const cuspEnd = polarPoint(house.cuspLongitude, 184);
            const labelPoint = polarPoint(house.cuspLongitude + 15, 132);

            return (
              <g key={"wheel-house-" + house.number}>
                <line
                  x1={cuspStart.x}
                  y1={cuspStart.y}
                  x2={cuspEnd.x}
                  y2={cuspEnd.y}
                  stroke="#9AA6B2"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                  opacity="0.85"
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#3A4A5C] text-[5px] font-bold"
                >
                  {"H" + house.number}
                </text>
              </g>
            );
          })}

          {aspectLines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#9AA6B2"
              strokeWidth="1"
              opacity="0.35"
              aria-label={line.label}
            />
          ))}

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
                  stroke="#BCCCDC"
                  strokeWidth="1"
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#3A4A5C] text-[14px] font-bold"
                >
                  {sign.glyph}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#64748B] text-[5px] font-semibold"
                >
                  {ZODIAC_LABELS[sign.id].faName}
                </text>
              </g>
            );
          })}

          {wheelAngles.map((angle) => {
            const start = polarPoint(angle.longitude, 54);
            const end = polarPoint(angle.longitude, 190);
            const labelPoint = polarPoint(angle.longitude, 196);

            return (
              <g key={"wheel-angle-" + angle.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#243447"
                  strokeWidth={angle.id === "asc" || angle.id === "mc" ? "2.6" : "1.8"}
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#243447] text-[5px] font-bold"
                >
                  {angle.label}
                </text>
              </g>
            );
          })}

          {placements.map((placement, index) => {
            const marker = polarPoint(placement.longitude, 96 - (index % 3) * 10);
            const anchor = polarPoint(placement.longitude, 128);
            const isRetrograde = retrogradeSet.has(placement.id);

            return (
              <g key={placement.id}>
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={marker.x}
                  y2={marker.y}
                  stroke="#9AA6B2"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="12"
                  fill="#243447"
                  stroke="#9AA6B2"
                  strokeWidth="1.5"
                />
                <text
                  x={marker.x}
                  y={marker.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[#F8FAFC] text-[5px] font-bold"
                >
                  {PLANET_GLYPHS[placement.id] ?? placement.label.slice(0, 1)}
                </text>
                {isRetrograde ? (
                  <text
                    x={marker.x + 12}
                    y={marker.y - 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="retrograde-glyph fill-[#9AA6B2] text-[5px] font-black"
                  >
                    ↺
                  </text>
                ) : null}
              </g>
            );
          })}

          <text
            x="200"
            y="190"
            textAnchor="middle"
            className="fill-[#243447] text-[11px] font-bold"
          >
            Halleus
          </text>
          <text
            x="200"
            y="210"
            textAnchor="middle"
            className="fill-[#64748B] text-[5px] font-semibold"
          >
            داده ذخیره‌شده
          </text>
        </svg>
      </div>

      <p className="mt-4 rounded-2xl bg-white p-3 text-xs leading-6 text-[#64748B]">
        <span className="font-bold text-[#243447]">راهنما:</span>{" "}
        خانه‌ها با {houseSystemLabel} نمایش داده شده‌اند؛ علامت ↺ کنار سیاره یعنی حرکت برگشتی.
        جزئیات فنی کامل در پنل پشتوانه محاسبه آمده است.
      </p>
    </section>
  );
}

function buildWheelHouses(houses: RealEngineReportHouse[] | undefined): RealEngineReportHouse[] {
  if (!Array.isArray(houses) || houses.length !== 12) {
    return [];
  }

  const sortedHouses = [...houses].sort((first, second) => first.number - second.number);

  return sortedHouses.every(isValidWheelHouse) ? sortedHouses : [];
}

function buildWheelAngles(
  angles: RealEngineReportAngles | undefined,
  fallbackAscendantLongitude: number,
): WheelAngle[] {
  const rows: WheelAngle[] = [];

  const asc = angles?.asc;
  if (asc && isFiniteLongitude(asc.longitude)) {
    rows.push(toWheelAngle(asc));
  } else if (isFiniteLongitude(fallbackAscendantLongitude)) {
    rows.push({
      id: "asc",
      label: "رایزینگ",
      longitude: normalizeLongitude(fallbackAscendantLongitude),
      source: "ascendantLongitude",
      house: null,
    });
  }

  for (const id of ["dsc", "mc", "ic"] as const) {
    const angle = angles?.[id];
    if (angle && isFiniteLongitude(angle.longitude)) {
      rows.push(toWheelAngle(angle));
    }
  }

  return rows;
}

function toWheelAngle(angle: RealEngineReportAngle): WheelAngle {
  return {
    id: angle.id,
    label: ANGLE_LABELS[angle.id],
    longitude: normalizeLongitude(angle.longitude),
    source: angle.source,
    house: angle.house ?? null,
  };
}

function buildAspectLines(
  placements: RealChartWheelPlacement[],
  aspects: RealEngineReportAspect[],
): WheelAspectLine[] {
  const placementsById = new Map(placements.map((placement) => [placement.id, placement]));

  return aspects
    .map((aspect) => {
      const firstPlacement = placementsById.get(aspect.firstPlanetId);
      const secondPlacement = placementsById.get(aspect.secondPlanetId);

      if (!firstPlacement || !secondPlacement) {
        return null;
      }

      const firstPoint = polarPoint(firstPlacement.longitude, 58);
      const secondPoint = polarPoint(secondPlacement.longitude, 58);

      return {
        id: aspect.id,
        label: aspect.firstPlanetLabel + " " + aspect.aspectLabel + " " + aspect.secondPlanetLabel,
        x1: firstPoint.x,
        y1: firstPoint.y,
        x2: secondPoint.x,
        y2: secondPoint.y,
      };
    })
    .filter((line): line is WheelAspectLine => line !== null);
}

function isValidWheelHouse(house: RealEngineReportHouse): boolean {
  return (
    Number.isInteger(house.number) &&
    house.number >= 1 &&
    house.number <= 12 &&
    isFiniteLongitude(house.cuspLongitude) &&
    Number.isFinite(house.degreeInSign)
  );
}

function isFiniteLongitude(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function formatHouseSystemLabel(system: string | undefined): string {
  if (!system) {
    return "روش نشانه کامل";
  }

  return HOUSE_SYSTEM_LABELS[system] ?? system;
}

function polarPoint(longitude: number, radius: number): { x: number; y: number } {
  const angle = ((normalizeLongitude(longitude) - 90) * Math.PI) / 180;

  return {
    x: 200 + radius * Math.cos(angle),
    y: 200 + radius * Math.sin(angle),
  };
}
