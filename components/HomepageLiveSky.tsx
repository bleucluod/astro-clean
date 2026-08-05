import Image from "next/image";
import Link from "next/link";

import styles from "@/app/home.module.css";
import { resolveHomepageSkyState } from "@/lib/homepage/homepage-live-sky-state";
import type { SkyDailyTimelineEvent } from "@/lib/sky-daily/sky-daily-contract";
import type { SkyPublicDeliveryResult } from "@/lib/sky-public/sky-public-delivery";
import {
  SKY_ASPECT_LABELS,
  SKY_BODY_LABELS,
  SKY_SIGN_LABELS,
} from "@/lib/sky-public/sky-public-labels";

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

function phaseLabel(phase: "new" | "waxing" | "full" | "waning") {
  return {
    new: "ماه نو",
    waxing: "افزاینده",
    full: "ماه کامل",
    waning: "کاهنده",
  }[phase];
}

const MOON_SHADOW_STEPS = 96;

function buildMoonShadowPath(
  illuminationFraction: number,
  phase?: "new" | "waxing" | "full" | "waning",
) {
  const illumination = Math.max(0, Math.min(1, illuminationFraction));

  if (!phase || phase === "new" || illumination <= 0.005) {
    return "M 50 0 A 50 50 0 1 1 49.999 0 Z";
  }

  if (phase === "full" || illumination >= 0.995) {
    return "";
  }

  const terminatorFactor = 1 - 2 * illumination;
  const outerPoints: string[] = [];
  const terminatorPoints: string[] = [];

  for (let index = 0; index <= MOON_SHADOW_STEPS; index += 1) {
    const y = (100 * index) / MOON_SHADOW_STEPS;
    const verticalOffset = y - 50;
    const radiusAtY = Math.sqrt(Math.max(0, 2500 - verticalOffset ** 2));
    const outerX = phase === "waning" ? 50 + radiusAtY : 50 - radiusAtY;
    const terminatorX =
      phase === "waning"
        ? 50 - terminatorFactor * radiusAtY
        : 50 + terminatorFactor * radiusAtY;

    outerPoints.push(`${outerX.toFixed(2)} ${y.toFixed(2)}`);
    terminatorPoints.unshift(`${terminatorX.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `M ${outerPoints[0]} L ${outerPoints.slice(1).join(" L ")} L ${terminatorPoints.join(" L ")} Z`;
}


function getMoonShadowGradient(phase?: "new" | "waxing" | "full" | "waning") {
  if (phase === "waning") {
    return { x1: "100%", x2: "24%" };
  }

  return { x1: "0%", x2: "76%" };
}

function SkyMoonVisual({
  label,
  illuminationFraction,
  phase,
}: {
  label: string;
  illuminationFraction?: number;
  phase?: "new" | "waxing" | "full" | "waning";
}) {
  const illumination = Math.max(0, Math.min(1, illuminationFraction ?? 0));
  const shadowPath = buildMoonShadowPath(illumination, phase);
  const shadowGradient = getMoonShadowGradient(phase);
  const shadowGradientId = `home-moon-shadow-${phase ?? "unavailable"}`;
  const shadowEdgeId = `home-moon-shadow-edge-${phase ?? "unavailable"}`;
  const shadowBlurId = `home-moon-shadow-blur-${phase ?? "unavailable"}`;
  const shadowEdgeBlurId = `home-moon-shadow-edge-blur-${phase ?? "unavailable"}`;

  return (
    <div className={styles.skyVisual} aria-hidden="true">
      <div className={styles.skyMoonStage}>
        <span className={styles.skyMoonOrbitPrimary} />
        <span className={styles.skyMoonOrbitSecondary} />
        <span className={styles.skyMoonOrbitTertiary} />
        <div className={styles.skyMoonShell}>
          <div className={styles.skyMoonDisc}>
            <Image
              src="/halleus-visuals/moon-apollo11.webp"
              alt=""
              width={1024}
              height={1024}
              className={styles.skyMoonPhoto}
              priority={false}
            />
            {shadowPath ? (
              <svg
                className={styles.skyMoonPhaseShadow}
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid slice"
                focusable="false"
              >
                <defs>
                  <linearGradient
                    id={shadowGradientId}
                    x1={shadowGradient.x1}
                    y1="50%"
                    x2={shadowGradient.x2}
                    y2="50%"
                  >
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.96" />
                    <stop offset="60%" stopColor="#020304" stopOpacity="0.92" />
                    <stop offset="82%" stopColor="#07090d" stopOpacity="0.58" />
                    <stop offset="94%" stopColor="#0d1117" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10141b" stopOpacity="0.04" />
                  </linearGradient>
                  <linearGradient
                    id={shadowEdgeId}
                    x1={shadowGradient.x2}
                    y1="50%"
                    x2={shadowGradient.x1}
                    y2="50%"
                  >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
                    <stop offset="45%" stopColor="#b8bec8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </linearGradient>
                  <filter id={shadowBlurId} x="-16%" y="-16%" width="132%" height="132%">
                    <feGaussianBlur stdDeviation="0.95" />
                  </filter>
                  <filter id={shadowEdgeBlurId} x="-16%" y="-16%" width="132%" height="132%">
                    <feGaussianBlur stdDeviation="0.55" />
                  </filter>
                </defs>
                <path
                  className={styles.skyMoonPhaseShadowPath}
                  d={shadowPath}
                  fill={`url(#${shadowGradientId})`}
                  filter={`url(#${shadowBlurId})`}
                />
                <path
                  className={styles.skyMoonPhaseShadowEdge}
                  d={shadowPath}
                  fill="none"
                  stroke={`url(#${shadowEdgeId})`}
                  strokeWidth="0.95"
                  filter={`url(#${shadowEdgeBlurId})`}
                />
              </svg>
            ) : null}
            <span className={styles.skyMoonLimb} />
          </div>
        </div>
      </div>
      <div className={styles.skyFloatingPanel}>
        <span>داده زنده آسمان</span>
        <strong>{label}</strong>
        <small>
          {phase
            ? `${phaseLabel(phase)} · ${(illumination * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })}٪ روشنایی`
            : "داده محاسبه‌شده هالیوس"}
        </small>
      </div>
    </div>
  );
}

export function HomepageLiveSky({
  result,
}: {
  result: SkyPublicDeliveryResult | null;
}) {
  const state = resolveHomepageSkyState(result);

  if (state.status === "unavailable") {
    return (
      <section
        className={styles.liveSkyCard}
        data-sky-state="unavailable"
        aria-labelledby="home-live-sky-title"
      >
        <SkyMoonVisual label="داده تازه پیدا نشد" />
        <div className={styles.liveSkyContent}>
          <span className={styles.stateBadge}>فعلاً در دسترس نیست</span>
          <h2 id="home-live-sky-title">دادهٔ زندهٔ آسمان نمایش داده نشد</h2>
          <p>
            {state.message} هالیوس برای پرکردن این بخش دادهٔ ساختگی یا دادهٔ روز
            دیگری را جایگزین نمی‌کند.
          </p>
          <Link className={styles.secondaryButton} href="/sky">
            رفتن به صفحهٔ آسمان
          </Link>
        </div>
      </section>
    );
  }

  const { snapshot, city, currentLocalDate, viewedAt } = state.result;
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const retrogrades = snapshot.planetaryStates.filter(
    (item) => item.motion === "retrograde",
  );
  const now = new Date(viewedAt).getTime();
  const nearestEvent =
    snapshot.timeline.find((event) => {
      const occurredAt = "occurredAt" in event ? event.occurredAt : undefined;
      return occurredAt ? new Date(occurredAt).getTime() >= now : false;
    }) ?? snapshot.timeline[0];
  const nearestTime =
    nearestEvent && "occurredAt" in nearestEvent
      ? formatTime(nearestEvent.occurredAt, city.timezone)
      : null;
  const stateLabel =
    state.status === "ready"
      ? "دادهٔ امروز آماده است"
      : state.status === "partial"
        ? "بخشی از داده آماده است"
        : "دادهٔ تازه در دسترس نیست";
  const heading =
    state.status === "stale"
      ? "آخرین دادهٔ معتبر آسمان"
      : "آسمان امروز در یک نگاه";
  const moonLabel = moon
    ? `${SKY_SIGN_LABELS[moon.sign]}، ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه`
    : "ثبت نشده";

  return (
    <section
      className={styles.liveSkyCard}
      data-sky-state={state.status}
      aria-labelledby="home-live-sky-title"
    >
      <SkyMoonVisual
        label={`${city.faName} · ${moonLabel}`}
        illuminationFraction={snapshot.moonPhase?.illuminationFraction}
        phase={snapshot.moonPhase?.phase}
      />

      <div className={styles.liveSkyContent}>
        <header className={styles.liveSkyHeader}>
          <div>
            <span className={styles.stateBadge}>{stateLabel}</span>
            <h2 id="home-live-sky-title">{heading}</h2>
            <p>
              {city.faName} · {formatPersianDate(currentLocalDate, city.timezone)}
            </p>
          </div>
          <Link className={styles.secondaryButton} href="/sky">
            دیدن گزارش کامل آسمان
          </Link>
        </header>

        <div className={styles.liveSkyMetrics}>
          <article>
            <span>ماه اکنون</span>
            <strong>{moonLabel}</strong>
          </article>
          <article>
            <span>فاز و روشنایی</span>
            <strong>
              {snapshot.moonPhase
                ? `${phaseLabel(snapshot.moonPhase.phase)} · ${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد`
                : "ثبت نشده"}
            </strong>
          </article>
          <article>
            <span>نزدیک‌ترین رویداد معتبر</span>
            <strong>
              {nearestEvent
                ? timelineLabel(nearestEvent)
                : "رویداد زمان‌دار ثبت نشده"}
            </strong>
            {nearestTime ? <small>ساعت {nearestTime}</small> : null}
          </article>
          <article>
            <span>حرکت برگشتی</span>
            <strong>
              {retrogrades.length
                ? retrogrades
                    .map((item) => SKY_BODY_LABELS[item.body])
                    .join("، ")
                : "سیاره‌ای ثبت نشده"}
            </strong>
          </article>
        </div>

        {state.status === "partial" ? (
          <p className={styles.skyStateNote}>
            این خلاصه فقط داده‌های کامل‌شده را نشان می‌دهد.
          </p>
        ) : null}
        {state.status === "stale" ? (
          <p className={styles.skyStateNote}>
            این داده با برچسب امروز نمایش داده نمی‌شود؛ برای دادهٔ تازه صفحهٔ
            آسمان را بررسی کن.
          </p>
        ) : null}
      </div>
    </section>
  );
}
