"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumanFirstNavigationItem } from "@/types/human-first-reading";
import type { ReportReadingSectionId } from "@/lib/storage/report-journey-client";
import styles from "./human-first-report.module.css";

export type ReportReaderMode = "natal" | "transit" | "technical";

export function ReportReadingNavigation({
  navigation,
  activeSection,
  mode,
  hasTransit,
  showDesktop = false,
  onModeChange,
  onNavigate,
}: {
  navigation: readonly HumanFirstNavigationItem[];
  activeSection: ReportReadingSectionId;
  mode: ReportReaderMode;
  hasTransit: boolean;
  showDesktop?: boolean;
  onModeChange: (mode: ReportReaderMode) => void;
  onNavigate: (sectionId: ReportReadingSectionId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeItem = useMemo(
    () => navigation.find((item) => item.id === activeSection) ?? navigation[0],
    [activeSection, navigation],
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function selectMode(nextMode: ReportReaderMode) {
    if (nextMode === "transit" && !hasTransit) return;
    onModeChange(nextMode);
    if (nextMode !== "natal") setIsOpen(false);
  }

  function selectSection(sectionId: ReportReadingSectionId) {
    onModeChange("natal");
    onNavigate(sectionId);
    setIsOpen(false);
  }

  return (
    <>
      {showDesktop ? (
        <aside className={styles.navigation} aria-label="فصل‌های گزارش">
          <div className={styles.desktopNavigation}>
            <span>فصل‌های گزارش</span>
            <nav>
              {navigation.map((item, index) => (
                <button
                  data-active={activeSection === item.id}
                  key={item.id}
                  onClick={() => selectSection(item.id)}
                  type="button"
                >
                  <span>{(index + 1).toLocaleString("fa-IR")}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}

      <div className={styles.mobileReadingControls}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={styles.floatingSectionsButton}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <span aria-hidden="true">☰</span>
          بخش‌های گزارش
        </button>

        {isOpen ? (
          <div
            className={styles.bottomSheetBackdrop}
            onClick={() => setIsOpen(false)}
            role="presentation"
          >
            <section
              aria-label="بخش‌های گزارش"
              aria-modal="true"
              className={styles.bottomSheet}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <header>
                <div>
                  <small>در حال خواندن</small>
                  <strong>
                    {mode === "natal"
                      ? activeItem?.label ?? "داستان کلی"
                      : mode === "transit"
                        ? "آسمان و تو"
                        : "چارت و جزئیات"}
                  </strong>
                </div>
                <button onClick={() => setIsOpen(false)} type="button">
                  بستن
                </button>
              </header>

              <div className={styles.sheetGroup}>
                <span>نوع خوانش</span>
                <div className={styles.sheetModeList}>
                  <button
                    data-active={mode === "natal"}
                    onClick={() => selectMode("natal")}
                    type="button"
                  >
                    گزارش تولد
                  </button>
                  <button
                    data-active={mode === "transit"}
                    disabled={!hasTransit}
                    onClick={() => selectMode("transit")}
                    type="button"
                  >
                    آسمان و تو
                  </button>
                  <button
                    data-active={mode === "technical"}
                    onClick={() => selectMode("technical")}
                    type="button"
                  >
                    چارت و جزئیات
                  </button>
                </div>
              </div>

              {mode === "natal" ? (
                <div className={styles.sheetGroup}>
                  <span>فصل‌های گزارش تولد</span>
                  <nav className={styles.sheetChapterList}>
                    {navigation.map((item, index) => (
                      <button
                        data-active={activeSection === item.id}
                        key={item.id}
                        onClick={() => selectSection(item.id)}
                        type="button"
                      >
                        <b>{(index + 1).toLocaleString("fa-IR")}</b>
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
