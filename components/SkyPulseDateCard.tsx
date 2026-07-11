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

type SkyPulseAspect =
  SkyPulsePersianInterpretationLayer["primaryAspects"][number];

const ASPECT_TITLE_PREFIXES = [
  ["هم‌نشینی ", "تمرکز میان "],
  ["تسهیل ", "فرصت میان "],
  ["چالش زاویه‌ای ", "کشش میان "],
  ["هماهنگی روان ", "هماهنگی میان "],
  ["رویارویی ", "تعادل میان "],
] as const;

function simplifyAspectTitle(title: string): string {
  for (const [technicalPrefix, userFacingPrefix] of ASPECT_TITLE_PREFIXES) {
    if (title.startsWith(technicalPrefix)) {
      return `${userFacingPrefix}${title.slice(technicalPrefix.length)}`;
    }
  }

  return title;
}

function buildCompactAspectNotes(aspects: SkyPulseAspect[]) {
  const seenNotes = new Set<string>();

  return aspects.slice(0, 2).map((aspect) => {
    const note =
      [aspect.reflection, aspect.avoid]
        .map((candidate) => candidate.trim())
        .find(
          (candidate) =>
            candidate.length > 0 && !seenNotes.has(candidate),
        ) ?? null;

    if (note) {
      seenNotes.add(note);
    }

    return {
      id: aspect.id,
      title: simplifyAspectTitle(aspect.title),
      note,
    };
  });
}

function buildCompactMood(aspects: SkyPulseAspect[]): string {
  const leadAspect = aspects[0];

  if (!leadAspect) {
    return "امروز آسمان آرام‌تر است؛ لازم نیست برای هر نشانه معنای بزرگی بسازی.";
  }

  return `${simplifyAspectTitle(
    leadAspect.title,
  )} پررنگ‌تر است؛ آرام پیش برو و به تغییرهای کوچک توجه کن.`;
}

function MoonPulseLoadingCard() {
  return (
    <article className="moon-widget-state">
      <span className="section-label">آسمان امروز</span>
      <strong>خوانش امروز در حال آماده شدن است</strong>
      <p>چند لحظه صبر کن.</p>
    </article>
  );
}

function MoonPulseErrorCard() {
  return (
    <article className="moon-widget-state">
      <span className="section-label">آسمان امروز</span>
      <strong>خوانش امروز فعلاً در دسترس نیست</strong>
      <p>کمی بعد دوباره امتحان کن.</p>
    </article>
  );
}

export function SkyPulseDateCard() {
  const [pulse, setPulse] = useState<PulseState>({
    status: "loading",
    data: null,
  });

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
  const compactAspectNotes = buildCompactAspectNotes(primaryAspects);
  const compactMood = buildCompactMood(primaryAspects);

  return (
    <section
      className="moon-pulse-section sky-pulse-widget sky-pulse-copy-detox-marker"
      id="sky-pulse"
      aria-labelledby="sky-pulse-title"
    >
      <div className="sky-pulse-widget-head">
        <span className="section-label">نبض آسمان امروز</span>
        <h2 id="sky-pulse-title">ماه و حال‌وهوای امروز</h2>
      </div>

      {pulse.status === "loading" ? <MoonPulseLoadingCard /> : null}

      {pulse.status === "error" ? (
        <div className="moon-widget-error-grid">
          <MoonPulseErrorCard />
          <article>
            <strong>گزارش تولد آماده است</strong>
            <p>برای خوانش شخصی‌تر، از چارت تولدت شروع کن.</p>
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
              <span aria-hidden="true" className="moon-phase-icon">
                ◐
              </span>
              <small>فاز ماه</small>
              <strong>{data.moon.phaseName}</strong>
              <p>{data.moon.illuminationLabel}</p>
            </article>

            <article>
              <span aria-hidden="true" className="moon-now-icon">
                ☽
              </span>
              <small>ماه اکنون</small>
              <strong>ماه در {data.moon.moonSignLabel}</strong>
              <p>{data.moon.moonDegree}</p>
            </article>
          </div>

          <div className="sky-pulse-guidance">
            <strong>{data.guidance.title}</strong>
            <p>{data.guidance.description}</p>
          </div>

          {interpretation ? (
            <div
              className="sky-pulse-interpretation-panel sky-pulse-compact-panel"
              aria-label="خوانش کوتاه آسمان امروز"
            >
              <article className="sky-pulse-interpretation-card soft">
                <small>حال‌وهوای امروز</small>
                <p>{compactMood}</p>
              </article>

              {compactAspectNotes.length > 0 ? (
                <div
                  className="sky-pulse-aspect-list sky-pulse-compact-aspect-list"
                  aria-label="نکته‌های امروز"
                >
                  {compactAspectNotes.map((aspect) => (
                    <article key={aspect.id}>
                      <strong>{aspect.title}</strong>
                      {aspect.note ? <p>{aspect.note}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <article className="sky-pulse-no-aspect-note">
                  <p>
                    امروز نشانه برجسته‌ای دیده نمی‌شود؛ چیزی را بزرگ‌تر از
                    اندازه‌اش نکن.
                  </p>
                </article>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="sky-pulse-widget-actions">
        <Link href="/chart">ساخت گزارش تولد</Link>
      </div>
    </section>
  );
}
