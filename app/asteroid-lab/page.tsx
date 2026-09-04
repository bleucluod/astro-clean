"use client";

import { useMemo, useState, type FormEvent } from "react";

type AsteroidLabSuccess = {
  ok: true;
  result: {
    status: "calculated";
    stableId: string;
    number: number;
    labelFa: string;
    labelEn: string;
    longitude: number;
    signId: string;
    degreeInSign: number;
    house: number | null;
    motion: {
      status: "direct" | "retrograde" | "stationary";
      arcDegreesPerDay: number;
      sampleWindowHours: 12;
    };
    collisionClarification: string | null;
    mainReportPromotion: "not-automatic";
  };
  collisionClarification?: string | null;
};

type AsteroidLabFailure = {
  ok: false;
  error?: string;
  message?: string;
  result?: {
    status?: "blocked";
    reason?: string;
    detail?: string;
  };
};

type AsteroidLabResponse = AsteroidLabSuccess | AsteroidLabFailure;

const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function SelectedAsteroidWheel({ result }: { result: AsteroidLabSuccess["result"] }) {
  const size = 360;
  const center = size / 2;
  const radius = 142;
  const markerRadius = 116;
  const angle = (180 - result.longitude) * (Math.PI / 180);
  const markerX = center + markerRadius * Math.cos(angle);
  const markerY = center + markerRadius * Math.sin(angle);
  const spokes = useMemo(
    () => Array.from({ length: 12 }, (_, index) => {
      const a = (180 - index * 30) * (Math.PI / 180);
      return {
        x: center + radius * Math.cos(a),
        y: center + radius * Math.sin(a),
      };
    }),
    [],
  );

  return (
    <section
      aria-label={`چرخ سیارک انتخاب‌شده: ${result.labelFa}`}
      data-asteroid-lab-selected-only-wheel="true"
      data-asteroid-lab-selected-id={result.stableId}
      style={{ marginTop: 28, display: "grid", gap: 14 }}
    >
      <div>
        <p style={{ margin: 0, opacity: 0.65, fontSize: 13 }}>فقط جرم انتخاب‌شده</p>
        <h2 style={{ margin: "5px 0 0", fontSize: 20 }}>{result.labelFa}</h2>
      </div>
      <svg
        role="img"
        aria-label={`${result.labelFa} در طول دایره‌البروج ${result.longitude.toFixed(2)} درجه`}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", maxWidth: 420, justifySelf: "center", overflow: "visible" }}
      >
        <circle cx={center} cy={center} r={radius} fill="#0b0d11" stroke="#4b535e" strokeWidth="2" />
        <circle cx={center} cy={center} r={markerRadius} fill="none" stroke="#28313c" strokeWidth="1" />
        {spokes.map((point, index) => (
          <g key={index}>
            <line x1={center} y1={center} x2={point.x} y2={point.y} stroke="#303945" strokeWidth="1" />
            <text
              x={center + (radius + 18) * Math.cos((180 - index * 30 - 15) * (Math.PI / 180))}
              y={center + (radius + 18) * Math.sin((180 - index * 30 - 15) * (Math.PI / 180))}
              fill="#a9b2bd"
              fontSize="17"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {ZODIAC_GLYPHS[index]}
            </text>
          </g>
        ))}
        <circle cx={markerX} cy={markerY} r="13" fill="#171d26" stroke="#dbe5ff" strokeWidth="2" />
        <text
          x={markerX}
          y={markerY + 1}
          fill="#f4f6f8"
          fontSize="12"
          fontWeight="800"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {result.number}
        </text>
      </svg>
      <div style={{ display: "grid", gap: 6, border: "1px solid #334155", borderRadius: 14, padding: 14, background: "#0b1220" }}>
        <span>{result.longitude.toFixed(2)}° · {result.signId} · {result.degreeInSign.toFixed(2)}°</span>
        <span>{result.house ? `خانه ${result.house}` : "خانه قابل اتکا نیست"} · {result.motion.status}</span>
        {result.collisionClarification ? <small style={{ opacity: 0.72 }}>{result.collisionClarification}</small> : null}
      </div>
    </section>
  );
}

export default function AsteroidLabPage() {
  const [form, setForm] = useState({
    query: "1181",
    birthDate: "1997-02-13",
    birthTime: "20:20",
    timezone: "Asia/Tehran",
    placeName: "Mianeh",
    latitude: "37.421",
    longitude: "47.716",
  });
  const [response, setResponse] = useState<AsteroidLabResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const request = await fetch("/api/engine/asteroid-lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }),
      });
      setResponse((await request.json()) as AsteroidLabResponse);
    } catch {
      setResponse({ ok: false, message: "ارتباط با Asteroid Lab برقرار نشد." });
    } finally {
      setLoading(false);
    }
  }

  const calculated = response?.ok === true && response.result.status === "calculated"
    ? response.result
    : null;

  return (
    <main dir="rtl" style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px", color: "#e5edf6" }}>
      <p style={{ opacity: 0.65 }}>Halleus · Advanced</p>
      <h1>آزمایشگاه سیارک‌ها</h1>
      <p style={{ lineHeight: 1.9, opacity: 0.8 }}>
        جست‌وجوی جداگانه برای لیلیت ۱۱۸۱، اروس ۴۳۳، سایکی ۱۶ و هایجیا ۱۰. فقط سیارکی که خودت جست‌وجو و محاسبه می‌کنی روی چرخ همین صفحه دیده می‌شود؛ این انتخاب خودکار وارد داستان اصلی گزارش تولد نمی‌شود.
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 28 }}>
        {Object.entries(form).map(([key, value]) => (
          <label key={key} style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{key}</span>
            <input
              value={value}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #334155", background: "#0f172a", color: "inherit" }}
            />
          </label>
        ))}
        <button disabled={loading} style={{ padding: 14, borderRadius: 12, border: 0, cursor: "pointer" }}>
          {loading ? "در حال محاسبه…" : "محاسبهٔ سیارک"}
        </button>
      </form>

      {calculated ? <SelectedAsteroidWheel result={calculated} /> : null}

      {response && !response.ok ? (
        <div role="status" style={{ marginTop: 24, padding: 18, border: "1px solid #334155", borderRadius: 14, background: "#0b1220", lineHeight: 1.8 }}>
          {response.message ?? response.error ?? response.result?.detail ?? "محاسبه آماده نشد."}
        </div>
      ) : null}
    </main>
  );
}
