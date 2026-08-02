"use client";

import type {
  LiveReportReadingContract,
  ReportReadingNavigationId,
} from "@/lib/report-output/live-report-reading-contract";

export function ReportReadingNavigation({
  contract,
  activeSection,
  onNavigate,
}: {
  contract: LiveReportReadingContract;
  activeSection: ReportReadingNavigationId;
  onNavigate: (sectionId: ReportReadingNavigationId) => void;
}) {
  return (
    <aside className="report-product-navigation" aria-label="فهرست اصلی گزارش">
      <div className="report-product-navigation-desktop">
        <span>در این گزارش</span>
        <nav>
          {contract.navigation.map((item, index) => (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="report-product-navigation-time">
          <strong>{contract.readingTime.natalMinutes.toLocaleString("fa-IR")} دقیقه</strong>
          <small>مسیر اصلی تولد</small>
        </div>
      </div>

      <label className="report-product-navigation-mobile">
        <span>رفتن به بخش</span>
        <select
          onChange={(event: { target: { value: string } }) =>
            onNavigate(event.target.value as ReportReadingNavigationId)
          }
          value={activeSection}
        >
          {contract.navigation.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
