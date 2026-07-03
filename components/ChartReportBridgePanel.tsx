import type { ZodiacKey } from "@/types/astro";
import { formatZodiacLabel, ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";

import {
  buildReportRealChartBridge,
  getReportRealChartBridgeDescription,
  getReportRealChartBridgeTitle,
  hasReportRealChartBridgeData,
  type ReportRealChartBridge,
} from "../src/lib/report-output/report-real-chart-bridge";

type ChartReportBridgePanelProps = {
  report: unknown;
};

const BRIDGE_POINT_LABELS_FA: Record<string, string> = {
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
  ascendant: "رایزینگ",
};

const BRIDGE_ASPECT_LABELS_FA: Record<string, string> = {
  conjunction: "هم‌نشینی",
  opposition: "مقابله",
  square: "چالش",
  trine: "هماهنگی",
  sextile: "فرصت",
};

export function ChartReportBridgePanel({ report }: ChartReportBridgePanelProps) {
  const bridge = buildReportRealChartBridge(report);
  const hasData = hasReportRealChartBridgeData(bridge);

  return (
    <section className="rounded-3xl border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            جایگاه‌ها و جنبه‌های چارت
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#3E2F25]">
            {getReportRealChartBridgeTitle(bridge)}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[#6B5A4C]">
            {getReportRealChartBridgeDescription(bridge)}
          </p>
        </div>

        <BridgeStatusPill bridge={bridge} />
      </div>

      {hasData ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <BridgeList
            title="جایگاه‌های برجسته"
            items={bridge.placementHighlights.map((placement) => {
              const sign = placement.signId
                ? formatBridgeZodiacLabel(placement.signId)
                : "نامشخص";
              const house = formatBridgeHouseLabel(placement.house);
              const label = formatBridgePointLabel(placement.label || placement.id);

              return `${label}: ${sign}، ${house}`;
            })}
          />
          <BridgeList
            title="جنبه‌های برجسته"
            items={bridge.aspectHighlights.map((aspect) => {
              const orb =
                aspect.orb === null ? "" : `، اورب ${formatBridgeOrb(aspect.orb)}°`;

              return `${formatBridgePointLabel(aspect.pointA)} ${formatBridgeAspectLabel(
                aspect.id,
              )} ${formatBridgePointLabel(aspect.pointB)}${orb}`;
            })}
          />
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-white/70 p-4 text-sm leading-7 text-[#7A695A]">
          هنوز placement یا aspect ذخیره‌شده‌ای برای این گزارش پیدا نشد. این برای
          گزارش‌های قدیمی طبیعی است و بعد از اتصال کامل فرم تولد به engine، این بخش
          پرتر می‌شود.
        </p>
      )}

      {bridge.limitations.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#ECDCCB] bg-white/70 p-4">
          <p className="text-sm font-semibold text-[#5B4636]">محدودیت فعلی</p>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm leading-7 text-[#7A695A]">
            {bridge.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function BridgeStatusPill({ bridge }: { bridge: ReportRealChartBridge }) {
  const label =
    bridge.status === "ready"
      ? "آماده"
      : bridge.status === "partial"
        ? "آزمایشی"
        : "در انتظار داده";

  return (
    <div className="rounded-full border border-[#D8C2AA] bg-white px-4 py-2 text-sm font-semibold text-[#6A4B35]">
      {label}
    </div>
  );
}

function formatBridgePointLabel(value: string): string {
  const key = value.trim().toLowerCase();

  return BRIDGE_POINT_LABELS_FA[key] ?? value;
}

function formatBridgeAspectLabel(value: string): string {
  const key = value.trim().toLowerCase();

  return BRIDGE_ASPECT_LABELS_FA[key] ?? value;
}

function formatBridgeHouseLabel(house: number | null): string {
  return house === null ? "خانه نامشخص" : `خانه ${house.toLocaleString("fa-IR")}`;
}

function formatBridgeOrb(value: number): string {
  return value.toLocaleString("fa-IR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function formatBridgeZodiacLabel(signId: string): string {
  return signId in ZODIAC_LABELS
    ? formatZodiacLabel(signId as ZodiacKey)
    : signId;
}

function BridgeList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white/75 p-4">
      <p className="font-semibold text-[#4A382C]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#6B5A4C]">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-7 text-[#8A7767]">
          هنوز داده‌ای برای این بخش ذخیره نشده.
        </p>
      )}
    </div>
  );
}
