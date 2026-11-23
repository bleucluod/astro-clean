import type { Metadata } from "next";
import Link from "next/link";
import { VedicD1GuestForm } from "@/components/vedic/VedicD1GuestForm";
import chartStyles from "../chart-shell.module.css";
import styles from "@/components/vedic/vedic-d1-guest.module.css";

// Keep the experimental guest route noindex until combined-app/browser acceptance.
export const metadata: Metadata = {
  title: "چارت تولد ودیک | هالیوس",
  description: "محاسبهٔ چارت تولد ودیک با مبنای لاهیری و اطلاعات واقعی تولد.",
  robots: { index: false, follow: false },
};

export default function VedicD1Page() {
  return (
    <main className={chartStyles.page + " " + styles.vedicPage} dir="rtl">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/chart">چارت تولد غربی</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">چارت ودیک</span>
      </nav>
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <span className={chartStyles.heroKicker}>چارت ودیک · راشی D1</span>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
          <p className={chartStyles.heroLead}>چارت تولد بر پایهٔ روش سایدرئالِ لاهیری.</p>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <div className={chartStyles.formPanelHeading}>
            <span className={chartStyles.panelStep} aria-hidden="true">۰۱</span>
            <div>
              <h2>اطلاعات تولد</h2>
            </div>
          </div>
          <VedicD1GuestForm />
        </div>
      </section>
    </main>
  );
}
