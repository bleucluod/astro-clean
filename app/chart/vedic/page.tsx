import type { Metadata } from "next";
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
      <header className={chartStyles.hero + " " + styles.vedicHero}>
        <div className={chartStyles.heroCopy}>
          <h1 className={chartStyles.heroTitle}>چارت تولد ودیک</h1>
        </div>
      </header>
      <section className={chartStyles.workspace + " " + styles.vedicWorkspace} aria-label="فرم چارت تولد ودیک">
        <div className={chartStyles.formPanel}>
          <VedicD1GuestForm />
        </div>
      </section>
    </main>
  );
}
