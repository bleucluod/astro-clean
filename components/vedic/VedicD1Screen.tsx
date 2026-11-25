"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import reportStyles from "@/components/report/human-first-report.module.css";
import { VedicD1GuestForm } from "./VedicD1GuestForm";
import { VedicD1GuestResult } from "./VedicD1GuestResult";
import { useVedicD1GuestSession } from "./VedicD1GuestSession";
import chartStyles from "@/app/chart/chart-shell.module.css";
import styles from "./vedic-d1-guest.module.css";

const LazySupabaseAuthPanel = dynamic(() => import("@/components/SupabaseAuthPanel").then(m => m.SupabaseAuthPanel), { ssr: false });

/** Keep both screens on /vedic. Only ephemeral React state holds birth data. */
export function VedicD1Screen({storageEnabled=false,checkoutEnabled=false}:{storageEnabled?:boolean;checkoutEnabled?:boolean}) {
  const { result, setResult } = useVedicD1GuestSession();
  const [showReport, setShowReport] = useState(false);
  const [showAccountPanel, setShowAccountPanel] = useState(false);

  function openReport() {
    setShowReport(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function editBirth() {
    setResult(current => current?.kind === "timed" ? { ...current, localPreview: null } : current);
    setShowReport(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (showReport && result) return <VedicD1GuestResult onEdit={editBirth} storageEnabled={storageEnabled} checkoutEnabled={checkoutEnabled} />;

  return (
    <div className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <VedicD1GuestForm onComplete={openReport} storageEnabled={storageEnabled} />
          {storageEnabled && <div className={"chart-account-option " + styles.entryAccount}>
            <label className="chart-account-option-toggle">
              <input type="checkbox" checked={showAccountPanel} onChange={event => setShowAccountPanel(event.target.checked)} />
              <span className="chart-account-option-copy"><strong>ورود یا ثبت‌نام در حساب هالیوس</strong></span>
            </label>
            {showAccountPanel && <div className={reportStyles.reportAccountAuthDialog + " " + styles.accountSurface}><LazySupabaseAuthPanel compact reconcileReports={false} /></div>}
          </div>}
        </div>
      </section>
    </div>
  );
}
