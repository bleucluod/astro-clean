"use client";

import { useState, type ReactNode } from "react";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import {
  buildTechnicalAspectRows,
  type LiveReportReadingContract,
} from "@/lib/report-output/live-report-reading-contract";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportPlacement,
} from "@/types/astro";

type TechnicalTab = "placements" | "houses" | "aspects" | "axes" | "method";

const TECHNICAL_TABS: Array<{ id: TechnicalTab; label: string }> = [
  { id: "placements", label: "جایگاه‌ها" },
  { id: "houses", label: "خانه‌ها" },
  { id: "aspects", label: "جنبه‌ها" },
  { id: "axes", label: "محورها" },
  { id: "method", label: "روش محاسبه" },
];

const HOUSE_FIELD_LABELS: Record<number, string> = {
  1: "بدن، تصویر بیرونی و شروع",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی و اثر بیرونی",
  11: "دوستی‌ها، جمع‌ها و آینده",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const ANGLE_LABELS: Record<string, string> = {
  asc: "ASC / رایزینگ",
  dsc: "DSC / نقطهٔ روبه‌رو",
  mc: "MC / میانهٔ آسمان",
  ic: "IC / ریشهٔ آسمان",
};

export function ReportTechnicalAppendix({
  report,
  contract,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
}) {
  const [activeTab, setActiveTab] = useState<TechnicalTab>("placements");
  const snapshot = report.realEngine;
  const placements = snapshot?.placements ?? [];
  const houses = snapshot?.houses ?? [];
  const aspects = snapshot?.aspects ?? [];
  const angles = snapshot?.angles ? Object.values(snapshot.angles) : [];

  return (
    <section
      className="report-product-technical-appendix"
      data-report-technical-appendix="placements-houses-aspects-axes-method"
      aria-labelledby="report-technical-title"
    >
      <details>
        <summary className="report-product-technical-heading">
          <div>
            <span className="section-label">ضمیمهٔ فنی</span>
            <h2 id="report-technical-title">داده‌ها بدون سنگین‌کردن مسیر اصلی</h2>
            <p>
              این بخش اختیاری است و حدود {contract.readingTime.technicalMinutes.toLocaleString("fa-IR")} دقیقه زمان می‌گیرد.
            </p>
          </div>
          <span className="report-product-technical-count">
            {placements.length.toLocaleString("fa-IR")} جایگاه · {aspects.length.toLocaleString("fa-IR")} جنبه
          </span>
        </summary>

        <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
          <div className="report-product-technical-tabs" role="tablist" aria-label="داده‌های فنی چارت">
            {TECHNICAL_TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="report-product-technical-panel" role="tabpanel">
            {activeTab === "placements" ? (
              <PlacementTable placements={placements} />
            ) : null}
            {activeTab === "houses" ? (
              <HouseTable
                hasReliableBirthTime={contract.hasReliableBirthTime}
                houses={houses}
                houseSystem={snapshot?.houseSystem}
                houseAvailability={snapshot?.houseContext?.availability}
              />
            ) : null}
            {activeTab === "aspects" ? <AspectTable aspects={aspects} /> : null}
            {activeTab === "axes" ? (
              <AxisTable
                angles={angles}
                hasReliableBirthTime={contract.hasReliableBirthTime}
              />
            ) : null}
            {activeTab === "method" ? (
              <MethodPanel report={report} contract={contract} />
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}

function PlacementTable({ placements }: { placements: RealEngineReportPlacement[] }) {
  if (placements.length === 0) {
    return <EmptyTechnicalState>جایگاه محاسبه‌شده‌ای در نسخهٔ ذخیره‌شده وجود ندارد.</EmptyTechnicalState>;
  }

  return (
    <div className="report-product-data-table" data-technical-table="placements">
      <div className="report-product-data-head">
        <span>سیاره</span><span>نشان و درجه</span><span>خانه</span>
      </div>
      {placements.map((placement) => (
        <div className="report-product-data-row" key={placement.id}>
          <strong>{placement.label}</strong>
          <span>{formatZodiacLabel(placement.signId)}، {formatDegree(placement.degreeInSign)}</span>
          <span>{typeof placement.house === "number" ? `خانه ${formatPersianNumber(placement.house)}` : "ثبت نشده"}</span>
        </div>
      ))}
    </div>
  );
}

function HouseTable({
  houses,
  hasReliableBirthTime,
  houseSystem,
  houseAvailability,
}: {
  houses: RealEngineReportHouse[];
  hasReliableBirthTime: boolean;
  houseSystem?: string;
  houseAvailability?: "ready" | "unavailable";
}) {
  if (!hasReliableBirthTime) {
    return (
      <EmptyTechnicalState>
        چون ساعت تولد دقیق در دسترس نیست، خانه‌ها و محورهای وابسته به زمان در این گزارش تفسیر نمی‌شوند.
      </EmptyTechnicalState>
    );
  }

  if (houses.length !== 12) {
    return (
      <EmptyTechnicalState>
        {houseSystem === "placidus" && houseAvailability === "unavailable"
          ? "خانه‌های پلاسیدوس برای این چارت قابل محاسبه نبوده‌اند و روش جایگزین پنهانی اعمال نشده است."
          : "جدول کامل دوازده خانه در نسخهٔ ذخیره‌شده موجود نیست."}
      </EmptyTechnicalState>
    );
  }

  return (
    <div className="report-product-data-table" data-technical-table="houses">
      <div className="report-product-data-head">
        <span>خانه</span><span>شروع خانه</span><span>میدان زندگی</span>
      </div>
      {houses.map((house) => (
        <div className="report-product-data-row" key={house.number}>
          <strong>خانه {formatPersianNumber(house.number)}</strong>
          <span>{formatZodiacLabel(house.signId)}، {formatDegree(house.degreeInSign)}</span>
          <span>{HOUSE_FIELD_LABELS[house.number] ?? "میدان ثبت‌شدهٔ چارت"}</span>
        </div>
      ))}
    </div>
  );
}

function AspectTable({ aspects }: { aspects: RealEngineReportAspect[] }) {
  const rows = buildTechnicalAspectRows(aspects);

  if (rows.length === 0) {
    return <EmptyTechnicalState>جنبهٔ اصلی محاسبه‌شده‌ای برای نمایش وجود ندارد.</EmptyTechnicalState>;
  }

  return (
    <div className="report-product-data-table" data-technical-table="aspects" data-aspect-table-mode="technical-only">
      <div className="report-product-data-head report-product-aspect-head">
        <span>سیاره‌ها</span><span>نوع</span><span>زاویه واقعی</span><span>اورب</span>
      </div>
      {rows.map((row) => (
        <div className="report-product-data-row report-product-aspect-row" key={row.id}>
          <strong>{row.planets}</strong>
          <span>{row.type} ({formatDegree(row.exactAngle)})</span>
          <span>{formatDegree(row.separation)}</span>
          <span>{formatDegree(row.orb)}</span>
        </div>
      ))}
    </div>
  );
}

function AxisTable({
  angles,
  hasReliableBirthTime,
}: {
  angles: RealEngineReportAngle[];
  hasReliableBirthTime: boolean;
}) {
  if (!hasReliableBirthTime || angles.length === 0) {
    return (
      <EmptyTechnicalState>
        محورهای اصلی بدون ساعت تولد معتبر نمایش داده نمی‌شوند؛ جایگاه‌های سیاره‌ای مستقل همچنان قابل استفاده‌اند.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className="report-product-data-table" data-technical-table="axes">
      <div className="report-product-data-head">
        <span>محور</span><span>نشان و درجه</span><span>خانه</span>
      </div>
      {angles.map((angle) => (
        <div className="report-product-data-row" key={angle.id}>
          <strong>{ANGLE_LABELS[angle.id] ?? angle.label}</strong>
          <span>{formatZodiacLabel(angle.signId)}، {formatDegree(angle.degreeInSign)}</span>
          <span>{typeof angle.house === "number" ? `خانه ${formatPersianNumber(angle.house)}` : "ثبت نشده"}</span>
        </div>
      ))}
    </div>
  );
}

function MethodPanel({
  report,
  contract,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
}) {
  const snapshot = report.realEngine;

  return (
    <div className="report-product-method-panel">
      <details>
        <summary>اطلاعات تولد و مبنای محاسبه</summary>
        <dl>
          <div><dt>نام انتخابی</dt><dd>{report.input.name?.trim() || "ثبت نشده"}</dd></div>
          <div><dt>تاریخ تولد</dt><dd>{report.input.birthDate || "ثبت نشده"}</dd></div>
          <div><dt>ساعت تولد</dt><dd>{contract.hasReliableBirthTime ? report.input.birthTime : "نامشخص"}</dd></div>
          <div><dt>محل تولد</dt><dd>{[report.input.birthCity, report.input.birthCountry].filter(Boolean).join("، ") || "ثبت نشده"}</dd></div>
          <div><dt>منطقه زمانی</dt><dd>{report.input.birthTimezone || "در نسخهٔ ذخیره‌شده ثبت نشده"}</dd></div>
        </dl>
      </details>

      <dl className="report-product-method-facts">
        <div><dt>نسخه داده</dt><dd>{snapshot?.version ?? "legacy/fallback"}</dd></div>
        <div><dt>روش خانه‌ها</dt><dd>{formatHouseSystem(snapshot?.houseSystem)}</dd></div>
        <div><dt>زمان مرجع ذخیره‌شده</dt><dd>{snapshot?.utcIso || "ثبت نشده"}</dd></div>
        <div><dt>وضعیت محاسبه</dt><dd>{snapshot?.calculationQuality?.status ?? "نسخهٔ قدیمی"}</dd></div>
      </dl>

      <div className="report-product-evidence-list">
        <h3>پشتوانهٔ خروجی‌های اصلی</h3>
        {contract.evidenceReferences.map((evidence) => (
          <div key={evidence.id}>
            <strong>{evidence.label}</strong>
            <span>{evidence.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTechnicalState({ children }: { children: ReactNode }) {
  return <div className="report-product-empty-technical" role="note">{children}</div>;
}

function formatDegree(value: number): string {
  return `${formatPersianNumber(value)}°`;
}

function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
}

function formatHouseSystem(system: string | undefined): string {
  if (system === "placidus") return "پلاسیدوس";
  if (system === "whole-sign") return "نشانهٔ کامل (نسخهٔ قدیمی)";
  if (system === "equal-house") return "خانه‌های مساوی (نسخهٔ قدیمی)";
  return "در نسخهٔ ذخیره‌شده مشخص نیست";
}
