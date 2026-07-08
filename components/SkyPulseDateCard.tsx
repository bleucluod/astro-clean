"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TehranMoonPulseResponse } from "@/lib/sky-pulse/tehran-moon-pulse";
import type { SkyPulsePersianInterpretationLayer } from "@/lib/sky-pulse/sky-pulse-persian-interpretation";

type SkyPulseHomepageResponse = TehranMoonPulseResponse & {
  transit?: {
    interpretation?: SkyPulsePersianInterpretationLayer;
  };
};

type PulseState =
  | {
      status: "loading";
      data: null;
    }
  | {
      status: "ready";
      data: SkyPulseHomepageResponse;
    }
  | {
      status: "error";
      data: null;
    };

function MoonPulseLoadingCard() {
  return (
    <article className="moon-widget-state">
      <span className="section-label">در حال خواندن آسمان امروز</span>
      <strong>نبض روز در حال آماده شدن است</strong>
      <p>کارت امروز از محاسبه واقعی خورشید، ماه و جنبه‌های ترنزیت روزانه تهران ساخته می‌شود.</p>
    </article>
  );
}

function MoonPulseErrorCard() {
  return (
    <article className="moon-widget-state">
      <span className="section-label">خوانش امروز</span>
      <strong>فعلاً نبض امروز را آرام نگه می‌داریم</strong>
      <p>گزارش تولد همچنان در دسترس است؛ کارت روزانه را کمی بعد دوباره امتحان کن.</p>
    </article>
  );
}

export function SkyPulseDateCard() {
  const [pulse, setPulse] = useState<PulseState>({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;

    async function loadPulse() {
      try {
        const response = await fetch("/api/sky-pulse/today", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Sky Pulse request failed.");
        }

        const data = (await response.json()) as SkyPulseHomepageResponse;

        if (!cancelled) {
          setPulse({ status: "ready", data });
        }
      } catch {
        if (!cancelled) {
          setPulse({ status: "error", data: null });
        }
      }
    }

    void loadPulse();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = pulse.data;
  const interpretation = data?.transit?.interpretation ?? null;
  const primaryAspects = interpretation?.primaryAspects.slice(0, 2) ?? [];

  return (
    <section className="moon-pulse-section sky-pulse-widget" id="sky-pulse" aria-labelledby="sky-pulse-title">
      <div className="sky-pulse-widget-head">
        <span className="section-label">نبض آسمان امروز</span>
        <h2 id="sky-pulse-title">آسمان امروز؛ ماه، فاز ماه و ترنزیت روزانه تهران</h2>
      </div>

      {pulse.status === "loading" ? <MoonPulseLoadingCard /> : null}

      {pulse.status === "error" ? (
        <div className="moon-widget-error-grid">
          <MoonPulseErrorCard />
          <article>
            <strong>گزارش تولد آماده است</strong>
            <p>خوانش شخصی‌تر از چارت تولدت شروع می‌شود.</p>
          </article>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="sky-pulse-date-line" aria-label="تاریخ امروز">
            <span>امروز {data.dates.jalaliDate}</span>
          </div>

          <div className="sky-pulse-moon-grid">
            <article>
              <span aria-hidden="true" className="moon-phase-icon">◐</span>
              <small>فاز ماه</small>
              <strong>{data.moon.phaseName}</strong>
              <p>{data.moon.illuminationLabel}</p>
            </article>

            <article>
              <span aria-hidden="true" className="moon-now-icon">☽</span>
              <small>ماه اکنون</small>
              <strong>ماه در {data.moon.moonSignLabel}</strong>
              <p>{data.moon.moonDegree}</p>
            </article>
          </div>

          <div className="sky-pulse-guidance">
            <strong>{data.guidance.title}</strong>
            <p>{data.guidance.description}</p>
          </div>

          <div className="sky-pulse-meta">
            <span>تنظیم با افق تهران</span>
            <span>{data.dates.localTime}</span>
          </div>
          {interpretation ? (
            <div className="sky-pulse-interpretation-panel" aria-label="خوانش ترنزیت امروز">
              <div className="sky-pulse-interpretation-kicker">
                <span>آسمان امروز</span>
                <span>رایگان و بدون لاگین</span>
                <span>تهران / ایران</span>
              </div>

              <article className="sky-pulse-interpretation-card">
                <small>ترنزیت امروز</small>
                <strong>{interpretation.title}</strong>
                <p>{interpretation.summary}</p>
              </article>

              <article className="sky-pulse-interpretation-card soft">
                <small>حال و هوای آسمان امروز</small>
                <p>{interpretation.skyMood}</p>
              </article>

              {primaryAspects.length > 0 ? (
                <div className="sky-pulse-aspect-list" aria-label="aspectهای برجسته امروز">
                  {primaryAspects.map((aspect) => (
                    <article key={aspect.id}>
                      <small>جنبه محاسبه‌شده</small>
                      <strong>{aspect.title}</strong>
                      <p>{aspect.inspiration}</p>
                      <p>{aspect.reflection}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <article className="sky-pulse-no-aspect-note">
                  <small>بدون جنبه اصلی نزدیک</small>
                  <p>امروز Halleus به‌جای ساختن ادعای مصنوعی، نبود جنبه نزدیک را هم به‌عنوان داده واقعی نشان می‌دهد.</p>
                </article>
              )}

              <div className="sky-pulse-technical-note">
                <span>{interpretation.technicalTrustNote}</span>
                <span>{interpretation.publicScopeNote}</span>
              </div>
            </div>
          ) : null}

        </>
      ) : null}

      <div className="sky-pulse-widget-actions">
        <Link href="/chart">ساخت گزارش تولد</Link>
        <Link href="#home-faq">پرسش‌های کوتاه</Link>
      </div>
    </section>
  );
}
