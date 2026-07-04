"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TehranMoonPulseResponse } from "@/lib/sky-pulse/tehran-moon-pulse";

type PulseState =
  | {
      status: "loading";
      data: null;
    }
  | {
      status: "ready";
      data: TehranMoonPulseResponse;
    }
  | {
      status: "error";
      data: null;
    };

function MoonPulseLoadingCard() {
  return (
    <article className="mini-card paid-value-card moon-pulse-card">
      <span className="badge">در حال خواندن آسمان امروز</span>
      <strong>نبض روز در حال آماده شدن است</strong>
      <p>کارت امروز از محاسبه واقعی خورشید و ماه ساخته می‌شود.</p>
    </article>
  );
}

function MoonPulseErrorCard() {
  return (
    <article className="mini-card paid-value-card moon-pulse-card">
      <span className="badge">خوانش امروز</span>
      <strong>فعلاً نتوانستیم نبض امروز را بخوانیم</strong>
      <p>گزارش تولد همچنان در دسترس است؛ کارت روزانه را بعداً دوباره امتحان کن.</p>
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

        const data = (await response.json()) as TehranMoonPulseResponse;

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

  return (
    <section className="card paid-section moon-pulse-section" id="sky-pulse" aria-labelledby="sky-pulse-title">
      <div className="moon-pulse-header">
        <div>
          <span className="section-label">نبض آسمان امروز</span>

          <h2 id="sky-pulse-title">ماه اکنون، فاز ماه و تاریخ امروز</h2>

          <p>
            این کارت هر روز از محاسبه واقعی خورشید و ماه تازه می‌شود؛ یک خوانش
            کوتاه برای شروع روز، نه پیش‌بینی قطعی یا جایگزین گزارش تولد.
          </p>
        </div>

        <div className="moon-pulse-location">
          <span>تهران</span>
          <p>خوانش امروز با زمان و افق تهران تنظیم شده است.</p>
        </div>
      </div>

      {pulse.status === "loading" ? (
        <div className="grid grid-3">
          <MoonPulseLoadingCard />
          <MoonPulseLoadingCard />
          <MoonPulseLoadingCard />
        </div>
      ) : null}

      {pulse.status === "error" ? (
        <div className="grid grid-3">
          <MoonPulseErrorCard />
          <article className="mini-card paid-value-card moon-pulse-card">
            <span className="badge">مسیر جایگزین</span>
            <strong>گزارش تولد آماده است</strong>
            <p>خوانش شخصی‌تر از چارت تولدت شروع می‌شود.</p>
          </article>
          <article className="mini-card paid-value-card moon-pulse-card">
            <span className="badge">آرام و صادق</span>
            <strong>بدون نتیجه ساختگی</strong>
            <p>اگر محاسبه امروز کامل نشود، هالیوس نتیجه جعلی نشان نمی‌دهد.</p>
          </article>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="moon-pulse-date-row" aria-label="تاریخ امروز">
            <span>
              <strong>شمسی</strong>
              {data.dates.jalaliDate}
            </span>
            <span>
              <strong>میلادی</strong>
              {data.dates.gregorianDate}
            </span>
            <span>
              <strong>قمری</strong>
              {data.dates.hijriDate}
            </span>
          </div>

          <div className="grid grid-3 moon-pulse-grid">
            <article className="mini-card paid-value-card moon-pulse-card moon-pulse-feature">
              <span className="badge">ماه اکنون</span>
              <strong>
                ماه در {data.moon.moonSignLabel}، {data.moon.moonDegree}
              </strong>
              <p>
                خورشید اکنون در {data.moon.sunSignLabel} خوانده می‌شود. این جایگاه‌ها از محاسبه فعلی هالیوس ساخته شده‌اند.
              </p>
            </article>

            <article className="mini-card paid-value-card moon-pulse-card moon-pulse-feature">
              <span className="badge">فاز ماه</span>
              <strong>{data.moon.phaseName}</strong>
              <p>
                {data.moon.illuminationLabel}؛ فاصله زاویه‌ای ماه و خورشید حدود{" "}
                {data.moon.phaseAngle.toLocaleString("fa-IR")} درجه است.
              </p>
            </article>

            <article className="mini-card paid-value-card moon-pulse-card moon-pulse-feature">
              <span className="badge">نبض کوتاه</span>
              <strong>{data.guidance.title}</strong>
              <p>{data.guidance.description}</p>
            </article>
          </div>

          <div className="moon-pulse-guidance">
            <article className="mini-card paid-value-card">
              <span className="badge">امروز با این ریتم</span>
              <strong>استفاده کن</strong>
              <p>{data.guidance.use}</p>
            </article>

            <article className="mini-card paid-value-card">
              <span className="badge">با خودت مهربان‌تر</span>
              <strong>کمتر درگیرش شو</strong>
              <p>{data.guidance.avoid}</p>
            </article>

            <article className="mini-card paid-value-card">
              <span className="badge">گام بعدی</span>
              <strong>خوانش شخصی‌تر با گزارش تولد</strong>
              <p>
                این کارت عمومی است. برای خواندن الگوهای شخصی، گزارش تولدت را از
                چارت واقعی بساز.
              </p>
            </article>
          </div>

          <p className="moon-pulse-note">
            {data.location.note} {data.location.futureNote}
          </p>
        </>
      ) : null}

      <div className="actions">
        <Link className="button" href="/chart">
          ساخت گزارش تولد
        </Link>
        <Link className="button secondary" href="#home-faq">
          پرسش‌های کوتاه
        </Link>
      </div>
    </section>
  );
}
