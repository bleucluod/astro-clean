"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ComparisonBiWheel } from "@/components/comparison/ComparisonBiWheel";
import { rebuildPrivateComparison } from "@/lib/comparison/comparison-product-service";
import {
  deletePrivateComparison,
  getPrivateComparison,
  savePrivateComparison,
  subscribeToPrivateComparisons,
} from "@/lib/comparison/comparison-storage";
import { loadReports } from "@/lib/storage/reports-storage";
import type { ComparisonRecord } from "@/types/comparison-product";
import type { SynastryRelationshipContext } from "@/types/synastry-engine";

import styles from "./comparison.module.css";

type ComparisonReportProps = {
  comparisonId: string;
};

export function ComparisonReport({ comparisonId }: ComparisonReportProps) {
  const router = useRouter();
  const [record, setRecord] = useState<ComparisonRecord | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const loadRecord = useCallback(() => {
    setRecord(getPrivateComparison(comparisonId));
    setIsReady(true);
  }, [comparisonId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(loadRecord);
    const unsubscribe = subscribeToPrivateComparisons(loadRecord);

    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [loadRecord]);

  const topContacts = useMemo(
    () => record?.report.contacts.slice(0, 8) ?? [],
    [record],
  );
  const topOverlays = useMemo(
    () => record?.report.houseOverlays.slice(0, 6) ?? [],
    [record],
  );

  function regenerate() {
    if (!record) return;

    setIsWorking(true);
    setMessage("");

    const reports = loadReports();
    const chartA = reports.find((report) => report.id === record.chartAId);
    const chartB = reports.find((report) => report.id === record.chartBId);

    if (!chartA || !chartB) {
      setIsWorking(false);
      setMessage(
        "یکی از چارت‌های اصلی دیگر روی این دستگاه پیدا نمی‌شود؛ برای بازسازی، دوباره آن چارت را بساز.",
      );
      return;
    }

    const rebuilt = rebuildPrivateComparison(record, chartA, chartB);
    if (!rebuilt.ok) {
      setIsWorking(false);
      setMessage(rebuilt.message);
      return;
    }

    const saved = savePrivateComparison(rebuilt.record);
    if (!saved.ok) {
      setIsWorking(false);
      setMessage(saved.message);
      return;
    }

    setRecord(rebuilt.record);
    setIsWorking(false);
    setMessage("گزارش با داده‌های فعلی دو چارت دوباره ساخته شد.");
  }

  function remove() {
    const result = deletePrivateComparison(comparisonId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.push("/compare");
  }

  if (!isReady) {
    return (
      <main className={styles.product}>
        <div className={styles.emptyState} role="status">
          <strong>در حال باز کردن مقایسه…</strong>
        </div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className={styles.product}>
        <div className={styles.emptyState}>
          <strong>این مقایسه روی این دستگاه پیدا نشد.</strong>
          <p>ممکن است پاک شده باشد یا در مرورگر دیگری ساخته شده باشد.</p>
          <Link className={styles.primaryButton} href="/compare">
            برگشت به مقایسه‌ها
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.product}>
      <section className={styles.reportHero}>
        <div>
          <p className={styles.eyebrow}>{formatRelationshipContext(record.relationshipContext)}</p>
          <h1>{record.report.synthesis.titleFa}</h1>
          <p>{record.report.synthesis.openingFa}</p>
        </div>
        <div className={styles.reportMeta}>
          <span>خصوصی</span>
          <span>noindex</span>
          <span>{record.report.quality.status === "complete" ? "داده کامل" : "داده محدود"}</span>
        </div>
      </section>

      <section className={styles.privacyPanel}>
        <strong>این مقایسه فقط روی همین دستگاه ذخیره شده است.</strong>
        <p>
          تاریخ، ساعت و شهر خام نفر دوم در رکورد مقایسه ذخیره نشده و این صفحه لینک
          عمومی، sitemap یا ارسال Analytics ندارد.
        </p>
      </section>

      <section className={styles.narrativeCard}>
        <p className={styles.eyebrow}>تصویر کلی رابطه</p>
        <h2>وقتی این دو چارت کنار هم قرار می‌گیرند</h2>
        <p>{record.report.synthesis.wholePairFa}</p>
      </section>

      <section className={styles.patternSection} aria-labelledby="primary-patterns-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>سه الگوی اصلی</p>
          <h2 id="primary-patterns-title">الگوهایی که بیشتر تکرار می‌شوند</h2>
        </div>
        <div className={styles.patternGrid}>
          {record.reading.primaryPatterns.map((pattern, index) => (
            <article
              className={styles.patternCard}
              data-kind={pattern.kind}
              key={pattern.id}
            >
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <h3>{pattern.titleFa}</h3>
              <p>{pattern.summaryFa}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.twoColumnSection}>
        <article className={styles.supportCard}>
          <p className={styles.eyebrow}>حمایت</p>
          <h2>کجا رابطه راحت‌تر نفس می‌کشد</h2>
          <p>{record.reading.supportiveFa}</p>
        </article>
        <article className={styles.frictionCard}>
          <p className={styles.eyebrow}>اصطکاک</p>
          <h2>کجا تفاوت‌ها نیاز به کار دارند</h2>
          <p>{record.reading.frictionFa}</p>
        </article>
      </section>

      <section className={styles.dynamicsGrid}>
        <ReadingCard
          label="گفت‌وگو"
          title="چطور حرف هم را بهتر می‌شنوید"
          body={record.reading.communicationFa}
        />
        <ReadingCard
          label="امنیت عاطفی"
          title="چه چیزی حس امن‌بودن را بیشتر می‌کند"
          body={record.reading.emotionalSecurityFa}
        />
        <ReadingCard
          label="نزدیکی و استقلال"
          title="فاصله سالم و صمیمیت"
          body={record.reading.closenessIndependenceFa}
        />
        <ReadingCard
          label="مرز و ترمیم"
          title="بعد از اصطکاک چطور برگردید"
          body={record.reading.boundariesRepairFa}
        />
      </section>

      <ComparisonBiWheel report={record.report} />

      <section className={styles.contactsSection} aria-labelledby="contacts-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>تماس‌های برجسته</p>
          <h2 id="contacts-title">شواهدی که این خوانش بر آن‌ها تکیه دارد</h2>
        </div>
        <div className={styles.contactList}>
          {topContacts.map((contact) => (
            <article className={styles.contactCard} data-polarity={contact.polarity} key={contact.id}>
              <div>
                <span>{contact.aspectLabel}</span>
                <strong>{contact.titleFa}</strong>
              </div>
              <p>{contact.readingFa}</p>
              <small>اورب {contact.orb.toFixed(2)}° · {contact.growthFa}</small>
            </article>
          ))}
        </div>
      </section>

      {topOverlays.length > 0 ? (
        <section className={styles.overlaySection} aria-labelledby="overlays-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>هم‌پوشانی خانه‌ها</p>
            <h2 id="overlays-title">هر نفر کدام میدان زندگی دیگری را فعال می‌کند</h2>
          </div>
          <div className={styles.overlayGrid}>
            {topOverlays.map((overlay) => (
              <article className={styles.overlayCard} key={overlay.id}>
                <strong>
                  {overlay.sourcePointLabel} در خانه {overlay.targetHouse.toLocaleString("fa-IR")}
                </strong>
                <p>{overlay.readingFa}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.limitationsCard}>
        <p className={styles.eyebrow}>حدود خوانش</p>
        <h2>چیزی که باید درباره دقت این مقایسه بدانی</h2>
        <p>{record.report.synthesis.limitationFa}</p>
        {record.report.quality.limitations.length > 0 ? (
          <ul>
            {record.report.quality.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {message ? <p className={styles.statusMessage} role="status">{message}</p> : null}

      <section className={styles.reportActions} aria-label="مدیریت مقایسه">
        <Link className={styles.secondaryButton} href="/compare">
          برگشت به تاریخچه
        </Link>
        <button className={styles.secondaryButton} type="button" disabled={isWorking} onClick={regenerate}>
          {isWorking ? "در حال بازسازی…" : "تلاش دوباره و بازسازی"}
        </button>
        <button className={styles.dangerButton} type="button" onClick={remove}>
          حذف این مقایسه
        </button>
      </section>
    </main>
  );
}

function ReadingCard({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <article className={styles.readingCard}>
      <p className={styles.eyebrow}>{label}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  );
}

function formatRelationshipContext(context: SynastryRelationshipContext) {
  const labels: Record<SynastryRelationshipContext, string> = {
    romantic: "رابطه عاطفی",
    friendship: "رابطه دوستی",
    family: "رابطه خانوادگی",
    work: "رابطه کاری",
    general: "مقایسه عمومی",
  };

  return labels[context];
}
