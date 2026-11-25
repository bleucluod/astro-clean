"use client";

import { useState } from "react";
import { VedicD1GuestForm } from "./VedicD1GuestForm";
import { VedicD1GuestResult } from "./VedicD1GuestResult";
import { useVedicD1GuestSession } from "./VedicD1GuestSession";
import chartStyles from "@/app/chart/chart-shell.module.css";
import styles from "./vedic-d1-guest.module.css";

/** Keep both screens on /vedic. Only ephemeral React state holds birth data. */
export function VedicD1Screen() {
  const { result, setResult } = useVedicD1GuestSession();
  const [showReport, setShowReport] = useState(false);

  function openReport() {
    setShowReport(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function editBirth() {
    setResult(current => current?.kind === "timed" ? { ...current, localPreview: null } : current);
    setShowReport(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (showReport && result) return <VedicD1GuestResult onEdit={editBirth} />;

  return (
    <div className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <VedicD1GuestForm onComplete={openReport} />
        </div>
      </section>
    </div>
  );
}
