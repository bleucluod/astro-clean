import type { ZodiacKey } from "@/types/astro";
import { formatZodiacLabel, ZODIAC_LABELS } from "@/lib/astrology/zodiac-labels";

import {
  buildReportRealChartBridge,
  hasReportRealChartBridgeData,
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

  if (!hasData) {
    return (
      <article className="mini-card report-bridge-summary-card">
        <span className="section-label">پشتوانه محاسباتی</span>
        <h3>در حال تکمیل</h3>
        <p>
          هنوز جایگاه یا جنبه ذخیره‌شده‌ای برای این گزارش پیدا نشد. با تکمیل
          مسیر محاسبه، این بخش دقیق‌تر می‌شود.
        </p>
      </article>
    );
  }

  return (
    <>
      <BridgeList
        title="جایگاه‌های برجسته"
        description="خلاصه جایگاه‌ها و خانه‌هایی که خوانش از آن‌ها استفاده کرده است."
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
        description="روابط مهم سیاره‌ها که به گفت‌وگوی درونی چارت شکل می‌دهند."
        items={bridge.aspectHighlights.map((aspect) => {
          const orb =
            aspect.orb === null ? "" : `، اورب ${formatBridgeOrb(aspect.orb)}°`;

          return `${formatBridgePointLabel(aspect.pointA)} ${formatBridgeAspectLabel(
            aspect.id,
          )} ${formatBridgePointLabel(aspect.pointB)}${orb}`;
        })}
      />
    </>
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

function BridgeList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <article className="mini-card report-bridge-summary-card">
      <span className="section-label">پشتوانه محاسباتی</span>
      <h3>{title}</h3>
      <p>{description}</p>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#3A4A5C]">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-7 text-[#52657A]">
          هنوز داده‌ای برای این بخش ذخیره نشده.
        </p>
      )}
    </article>
  );
}
