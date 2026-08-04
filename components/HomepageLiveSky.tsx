import Link from "next/link";

import type { SkyDailyTimelineEvent } from "@/lib/sky-daily/sky-daily-contract";
import { resolveHomepageSkyState } from "@/lib/homepage/homepage-live-sky-state";
import type { SkyPublicDeliveryResult } from "@/lib/sky-public/sky-public-delivery";
import {
  SKY_ASPECT_LABELS,
  SKY_BODY_LABELS,
  SKY_SIGN_LABELS,
} from "@/lib/sky-public/sky-public-labels";

import styles from "@/app/home.module.css";

function formatPersianDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone,
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatTime(value: string | undefined, timezone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function timelineLabel(event: SkyDailyTimelineEvent) {
  if (event.type === "ingress") {
    return `${SKY_BODY_LABELS[event.body]} وارد ${SKY_SIGN_LABELS[event.toSign]} می‌شود`;
  }
  if (event.type === "station") {
    return `${SKY_BODY_LABELS[event.body]} تغییر جهت می‌دهد`;
  }
  return `${SKY_BODY_LABELS[event.aspect.leftBody]} و ${SKY_BODY_LABELS[event.aspect.rightBody]}؛ ${SKY_ASPECT_LABELS[event.aspect.kind]}`;
}

export function HomepageLiveSky({ result }: { result: SkyPublicDeliveryResult | null }) {
  const state = resolveHomepageSkyState(result);

  if (state.status === "unavailable") {
    return (
      <section className={styles.liveSkyState} data-sky-state="unavailable" aria-labelledby="home-live-sky-title">
        <div>
          <span className={styles.stateBadge}>فعلاً در دسترس نیست</span>
          <h2 id="home-live-sky-title">دادهٔ زندهٔ آسمان نمایش داده نشد</h2>
          <p>{state.message} هالیوس برای پرکردن این بخش دادهٔ ساختگی یا دادهٔ روز دیگری را جایگزین نمی‌کند.</p>
        </div>
        <Link className={styles.secondaryButton} href="/sky">رفتن به صفحهٔ آسمان</Link>
      </section>
    );
  }

  const { snapshot, city, currentLocalDate, viewedAt } = state.result;
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const retrogrades = snapshot.planetaryStates.filter((item) => item.motion === "retrograde");
  const now = new Date(viewedAt).getTime();
  const nearestEvent =
    snapshot.timeline.find((event) => {
      const occurredAt = "occurredAt" in event ? event.occurredAt : undefined;
      return occurredAt ? new Date(occurredAt).getTime() >= now : false;
    }) ?? snapshot.timeline[0];
  const nearestTime = nearestEvent && "occurredAt" in nearestEvent
    ? formatTime(nearestEvent.occurredAt, city.timezone)
    : null;
  const stateLabel = state.status === "ready" ? "دادهٔ امروز آماده است" : state.status === "partial" ? "بخشی از داده آماده است" : "دادهٔ تازه در دسترس نیست";
  const heading = state.status === "stale" ? "آخرین دادهٔ معتبر آسمان" : "آسمان امروز در یک نگاه";

  return (
    <section className={styles.liveSkyCard} data-sky-state={state.status} aria-labelledby="home-live-sky-title">
      <header className={styles.liveSkyHeader}>
        <div>
          <span className={styles.stateBadge}>{stateLabel}</span>
          <h2 id="home-live-sky-title">{heading}</h2>
          <p>{city.faName} · {formatPersianDate(currentLocalDate, city.timezone)}</p>
        </div>
        <Link className={styles.secondaryButton} href="/sky">دیدن گزارش کامل آسمان</Link>
      </header>

      <div className={styles.liveSkyMetrics}>
        <article>
          <span>ماه اکنون</span>
          <strong>{moon ? `${SKY_SIGN_LABELS[moon.sign]}، ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه` : "ثبت نشده"}</strong>
        </article>
        <article>
          <span>فاز و روشنایی</span>
          <strong>{snapshot.moonPhase ? `${({ new: "ماه نو", waxing: "افزاینده", full: "ماه کامل", waning: "کاهنده" } as const)[snapshot.moonPhase.phase]} · ${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد` : "ثبت نشده"}</strong>
        </article>
        <article>
          <span>نزدیک‌ترین رویداد معتبر</span>
          <strong>{nearestEvent ? timelineLabel(nearestEvent) : "رویداد زمان‌دار ثبت نشده"}</strong>
          {nearestTime ? <small>ساعت {nearestTime}</small> : null}
        </article>
        <article>
          <span>حرکت برگشتی</span>
          <strong>{retrogrades.length ? retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join("، ") : "سیاره‌ای ثبت نشده"}</strong>
        </article>
      </div>

      {state.status === "partial" ? <p className={styles.skyStateNote}>این خلاصه فقط داده‌های کامل‌شده را نشان می‌دهد.</p> : null}
      {state.status === "stale" ? <p className={styles.skyStateNote}>این داده با برچسب امروز نمایش داده نمی‌شود؛ برای دادهٔ تازه صفحهٔ آسمان را بررسی کن.</p> : null}
    </section>
  );
}
