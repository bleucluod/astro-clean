"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildSkyPulseProductLayer, type SkyPulseProductLayer } from "@/lib/sky-pulse/sky-pulse-content";

function GuidanceCard({
  label,
  title,
  description,
  use,
  avoid,
}: {
  label: string;
  title: string;
  description: string;
  use: string;
  avoid: string;
}) {
  return (
    <article className="mini-card paid-value-card">
      <span className="badge">{label}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      <p>
        <strong>استفاده کن:</strong> {use}
      </p>
      <p>
        <strong>فعلاً نکن:</strong> {avoid}
      </p>
    </article>
  );
}

export function SkyPulseDateCard() {
  const [pulse, setPulse] = useState<SkyPulseProductLayer | null>(null);

  useEffect(() => {
    setPulse(buildSkyPulseProductLayer(new Date()));
  }, []);

  const snapshot = pulse?.snapshot;

  return (
    <section className="card paid-section" id="sky-pulse" aria-labelledby="sky-pulse-title">
      <div>
        <span className="section-label">نبض آسمان امروز</span>

        <h2 id="sky-pulse-title">یک کارت زنده برای امروز، بدون ادعای ترنزیت واقعی</h2>

        <p>
          Sky Pulse فعلاً از تاریخ زنده و ریتم تقویم شروع می‌کند تا homepage حس
          زنده‌تری داشته باشد. ترنزیت‌ها و فاز ماه واقعی فقط وقتی فعال می‌شوند
          که منبع محاسبه قابل اعتماد داشته باشیم.
        </p>
      </div>

      <div className="grid grid-3">
        <article className="mini-card paid-value-card">
          <span className="badge">تاریخ زنده</span>
          <strong>{snapshot?.weekday ?? "امروز"}</strong>
          <p>{snapshot?.jalaliDate ?? "در حال خواندن تاریخ امروز..."}</p>
          <p>{snapshot?.gregorianDate ?? ""}</p>
          <p>{snapshot?.leapYearLabel ?? "کبیسه بودن سال پس از خواندن تاریخ مشخص می‌شود."}</p>
        </article>

        {pulse ? (
          <GuidanceCard
            label="ریتم ماهانه تقویم"
            title={pulse.monthPulse.title}
            description={pulse.monthPulse.description}
            use={pulse.monthPulse.use}
            avoid={pulse.monthPulse.avoid}
          />
        ) : (
          <article className="mini-card paid-value-card">
            <span className="badge">ریتم ماهانه تقویم</span>
            <strong>در حال آماده‌سازی</strong>
            <p>ریتم ماهانه پس از خواندن تاریخ امروز نمایش داده می‌شود.</p>
          </article>
        )}

        {pulse ? (
          <GuidanceCard
            label="تمرکز هفته"
            title={pulse.weekPulse.title}
            description={pulse.weekPulse.description}
            use={pulse.weekPulse.use}
            avoid={pulse.weekPulse.avoid}
          />
        ) : (
          <article className="mini-card paid-value-card">
            <span className="badge">تمرکز هفته</span>
            <strong>در حال آماده‌سازی</strong>
            <p>جایگاه هفته پس از خواندن تاریخ امروز نمایش داده می‌شود.</p>
          </article>
        )}
      </div>

      {pulse ? (
        <div className="grid grid-3">
          <GuidanceCard
            label="امروز"
            title={pulse.dayPulse.title}
            description={pulse.dayPulse.description}
            use={pulse.dayPulse.use}
            avoid={pulse.dayPulse.avoid}
          />

          {pulse.transitPreviews.slice(0, 2).map((item) => (
            <article className="mini-card paid-value-card" key={item.title}>
              <span className="badge">{item.status}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mini-card paid-manual-order">
        <div>
          <strong>خلاصه عمومی اینجاست؛ خوانش شخصی در گزارش تولد شروع می‌شود.</strong>
          <p>
            این کارت برای آینده homepage نگه داشته می‌شود، اما فعلاً نباید جای
            گزارش شخصی یا محاسبه واقعی ترنزیت را بگیرد.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>
          <Link className="button secondary" href="/product">
            جایگاه Sky Pulse در محصول
          </Link>
        </div>
      </div>
    </section>
  );
}
