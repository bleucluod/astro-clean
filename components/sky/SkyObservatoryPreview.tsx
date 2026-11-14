"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { SkyMoonVisual } from "@/components/HomepageLiveSky";
import { EditorialStickyCtaSequence } from "@/components/EditorialStickyCtaSequence";
import { SKY_STICKY_CTA_CAMPAIGN } from "@/lib/cta/editorial-sticky-cta";
import { SkyCityPicker } from "@/components/SkyCityPicker";
import { R3ApprovedInlineParagraphs } from "@/components/r3-approved-visible-copy";
import { SurfaceShowcaseSlot } from "@/components/shop/SurfaceShowcaseSlot";
import type { SurfaceOffer } from "@/lib/shop/shop-showcase-contract";
import type {
  SkyDailyBodyId, SkyDailySnapshot, SkyDailyTimelineEvent, SkyDailyZodiacSign,
} from "@/lib/sky-daily/sky-daily-contract";
import {
  SKY_ASPECT_LABELS, SKY_BODY_LABELS, SKY_BODY_SYMBOLS, SKY_MOTION_LABELS,
  SKY_SIGN_LABELS, SKY_SIGN_SYMBOLS,
} from "@/lib/sky-public/sky-public-labels";
import {
  buildSkyPublicReportInterpretation, skyPublicAspectKey,
} from "@/lib/sky-public/sky-public-report-interpretation";
import type { SkyObservatoryPeriodData } from "@/lib/sky-public/sky-observatory-period";
import styles from "./SkyObservatoryPreview.module.css";

type View = "today" | "week" | "month";
const SIGN_IDS = Object.keys(SKY_SIGN_LABELS) as SkyDailyZodiacSign[];
function dateLabel(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(iso + "T12:00:00Z"));
}
function shortDate(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone, day: "numeric", month: "short",
  }).format(new Date(iso + "T12:00:00Z"));
}
function eventTime(value: string | undefined, timezone: string) {
  if (!value) return "زمان دقیق ثبت نشده";
  return new Intl.DateTimeFormat("fa-IR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function eventMoment(value: string | undefined, timezone: string) {
  if (!value) return "زمان دقیق ثبت نشده";
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone, day: "numeric", month: "short",
  }).format(new Date(value));
  return date + " · " + eventTime(value, timezone);
}
function eventLabel(event: SkyDailyTimelineEvent) {
  if (event.type === "ingress") return SKY_BODY_LABELS[event.body] + " وارد " + SKY_SIGN_LABELS[event.toSign] + " می‌شود";
  if (event.type === "station") return SKY_BODY_LABELS[event.body] + " تغییر جهت می‌دهد";
  return SKY_BODY_LABELS[event.aspect.leftBody] + " و " + SKY_BODY_LABELS[event.aspect.rightBody] +
    " به " + SKY_ASPECT_LABELS[event.aspect.kind] + " می‌رسند";
}
function position(longitude: number, radius: number) {
  const radians = longitude * Math.PI / 180;
  return { x: 320 + radius * Math.sin(radians), y: 320 - radius * Math.cos(radians) };
}
function pct(value: number) { return (value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 }) + "٪"; }
const phaseLabel = { new: "ماه نو", waxing: "افزاینده", full: "ماه کامل", waning: "کاهنده" } as const;
function moonLabel(snapshot: SkyDailySnapshot) {
  return snapshot.moonPhase ? phaseLabel[snapshot.moonPhase.phase] : "ثبت نشده";
}
function MoonFact({ snapshot }: { snapshot: SkyDailySnapshot }) {
  const moon = snapshot.planetaryStates.find(p => p.body === "moon");
  return <div className={styles.moonFact}>
    <span>ماه در {moon ? SKY_SIGN_LABELS[moon.sign] : "نامشخص"}</span>
    <strong>{moonLabel(snapshot)}</strong>
    <small>{snapshot.moonPhase ? pct(snapshot.moonPhase.illuminationFraction) + " روشنایی" : "روشنایی ثبت نشده"}</small>
  </div>;
}
function buildHumanDailyGuide(snapshot: SkyDailySnapshot, timezone: string, referenceTime: number) {
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const mainAspect = snapshot.aspects[0];
  const nextEvent = snapshot.timeline.find((event) => "occurredAt" in event && event.occurredAt && new Date(event.occurredAt).getTime() >= referenceTime);
  const retrogrades = snapshot.planetaryStates.filter((item) => item.motion === "retrograde");
  const bodies = mainAspect ? [mainAspect.leftBody, mainAspect.rightBody] : [];
  const hasBody = (body: string) => bodies.includes(body as never);
  const focus = hasBody("venus") || hasBody("moon")
    ? "رابطه و احساس"
    : hasBody("mercury")
      ? "فکر و گفت‌وگو"
      : hasBody("mars")
        ? "انرژی و واکنش"
        : hasBody("saturn")
          ? "تعهد و مرزبندی"
          : moon
            ? `حال‌وهوای ${SKY_SIGN_LABELS[moon.sign]}`
            : "ریتم روز";
  const tone = mainAspect?.kind === "square" || mainAspect?.kind === "opposition"
    ? "امروز روز جواب فوری نیست. اگر فشار، عجله یا حساسیت بالا آمد، پیام مهم را کمی نگه دار، قرارداد را دوباره بخوان و تصمیم برگشت‌ناپذیر را سبک‌تر کن."
    : mainAspect?.kind === "trine" || mainAspect?.kind === "sextile"
      ? "امروز برای جلو بردن یک کار واقعی بهتر است، نه برای پخش شدن در ده مسیر. یک کار نیمه‌مانده را بردار، اما قول بزرگ یا برنامهٔ خیلی فشرده نده."
      : mainAspect?.kind === "conjunction"
        ? "امروز یک موضوع می‌تواند بیشتر از بقیه توجهت را بگیرد. همان نقطه را روشن کن، ولی اگر حس کردی داری زیادی بزرگش می‌کنی، تصمیم نهایی را عقب بینداز."
        : "امروز را ساده بخوان: یک کار مهم، یک مکث کوتاه، و تصمیمی که لازم نیست از روی شتاب گرفته شود.";
  const action = mainAspect?.kind === "square" || mainAspect?.kind === "opposition"
    ? "قرارداد، خرید بزرگ و جواب تند را بعد از بازبینی جلو ببر."
    : mainAspect?.kind === "trine" || mainAspect?.kind === "sextile"
      ? "یک کار نیمه‌مانده را انتخاب کن و همان را کامل‌تر کن."
      : "اولویت امروزت را بنویس و تصمیم حساس را با سند جلو ببر.";

  return {
    focus,
    tone,
    action,
    personalLine: `اگر امروز در کار، رابطه یا تصمیم‌هایت ${focus} پررنگ شد، اول دلیلش را ببین و بعد واکنش بده.`,
    moonReason: moon ? `ماه در ${SKY_SIGN_LABELS[moon.sign]} است؛ حس و واکنش‌ها سریع‌تر از ذهن جلو می‌زنند.` : "جایگاه ماه برای این روز ثبت نشده؛ خوانش احساسی با احتیاط نمایش داده می‌شود.",
    aspectReason: mainAspect ? `${SKY_ASPECT_LABELS[mainAspect.kind]} ${SKY_BODY_LABELS[mainAspect.leftBody]} و ${SKY_BODY_LABELS[mainAspect.rightBody]} لحن روز را می‌سازد: حرکت نرم یا مکث و بازبینی.` : "زاویهٔ برجسته‌ای ثبت نشده؛ خوانش سریع بیشتر از ماه و حرکت سیاره‌ها ساخته شده است.",
    motionReason: retrogrades.length ? `${retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join(" و ")} برگشتی‌اند؛ نتیجهٔ فوری را سبک‌تر بگیر.` : "سیارهٔ برگشتی فعالی ثبت نشده؛ تمرکز بیشتر روی ماه و زاویه‌های روز است.",
    nextEvent: nextEvent ? `${eventLabel(nextEvent)}${"occurredAt" in nextEvent && nextEvent.occurredAt ? ` · ${eventTime(nextEvent.occurredAt, timezone)}` : ""}` : "رویداد بعدی مهمی تا پایان روز ثبت نشده",
  };
}

function signDistance(from: SkyDailyZodiacSign, to: SkyDailyZodiacSign) {
  const fromIndex = SIGN_IDS.indexOf(from);
  const toIndex = SIGN_IDS.indexOf(to);
  return (toIndex - fromIndex + SIGN_IDS.length) % SIGN_IDS.length;
}

function buildSignGuide(sign: SkyDailyZodiacSign, snapshot: SkyDailySnapshot) {
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const mainAspect = snapshot.aspects[0];
  const label = SKY_SIGN_LABELS[sign];

  if (!moon) {
    return {
      tone: `برای ${label} امروز بهتر است تصمیم‌ها را ساده‌تر نگه داری.`,
      reason: "چون جایگاه ماه در دادهٔ امروز ثبت نشده، خوانش نشان‌ها محافظه‌کارانه‌تر است.",
    };
  }

  const distance = signDistance(sign, moon.sign);
  const relation = distance === 0
    ? "ماه دقیقاً روی حال‌وهوای نشان توست"
    : distance === 6
      ? "ماه روبه‌روی نشان تو ایستاده"
      : distance === 3 || distance === 9
        ? "ماه با نشان تو زاویهٔ فشاری می‌سازد"
        : distance === 4 || distance === 8
          ? "ماه با نشان تو ریتم روان‌تری دارد"
          : distance === 2 || distance === 10
            ? "ماه با نشان تو فرصت سبک‌تری می‌سازد"
            : "ماه کنار نشان تو حرکت مستقیم و پررنگی ندارد";

  const tone = distance === 0
    ? `برای ${label}، امروز بدن و احساس زودتر از معمول علامت می‌دهد؛ قبل از جواب سریع، یک مکث کوتاه بگذار.`
    : distance === 6
      ? `برای ${label}، رابطه و واکنش دیگران بیشتر به چشم می‌آید؛ بهتر است چیزی را فقط از یک برخورد نتیجه نگیری.`
      : distance === 3 || distance === 9
        ? `برای ${label}، امروز ممکن است برنامه یا رابطه کمی اصطکاک داشته باشد؛ کارها را مرحله‌ای جلو ببر.`
        : distance === 4 || distance === 8
          ? `برای ${label}، امروز فهمیدن حس خودت راحت‌تر است؛ یک کار مهم را با آرامش جلو ببر.`
          : distance === 2 || distance === 10
            ? `برای ${label}، امروز برای گفت‌وگو، مرتب‌کردن کارهای کوچک و تصمیم‌های سبک‌تر مناسب‌تر است.`
            : `برای ${label}، امروز فشار مستقیمی از ماه دیده نمی‌شود؛ از داده‌های عمومی روز برای تنظیم ریتمت استفاده کن.`;

  return {
    tone,
    reason: `${relation}، چون ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} است.${mainAspect ? ` زاویهٔ ${SKY_ASPECT_LABELS[mainAspect.kind]} ${SKY_BODY_LABELS[mainAspect.leftBody]} و ${SKY_BODY_LABELS[mainAspect.rightBody]} هم لحن کلی روز را تغییر می‌دهد.` : ""}`,
  };
}



/** A native-scroll, seamless mobile rail. One copy is accessible; both copies work with pointer input. */
/** GPU-composited looping rail, paused without losing animation position. */
function AutoSweepRail({ label, groupClassName, variant, renderItems }: {
  label: string; groupClassName: string;
  variant: "signal" | "sign" | "explore";
  renderItems: (duplicate: boolean) => ReactNode;
}) {
  const [touchHeld, setTouchHeld] = useState(false);
  const variantStyle = variant === "signal" ? styles.sweepSignalViewport :
    variant === "sign" ? styles.sweepSignViewport : styles.sweepExploreViewport;
  return <div role="group" aria-label={label}
    className={styles.sweepViewport + " " + variantStyle}
    data-sweep-held={touchHeld ? "true" : "false"}
    onPointerDown={event => { if (event.pointerType !== "mouse") setTouchHeld(true); }}
    onPointerUp={() => setTouchHeld(false)}
    onPointerCancel={() => setTouchHeld(false)}
    onPointerLeave={event => { if (event.pointerType !== "mouse") setTouchHeld(false); }}>
    <div className={styles.sweepTrack}>
      <div className={styles.sweepGroup + " " + groupClassName}
        data-sweep-original="true" dir="rtl">{renderItems(false)}</div>
      <div className={styles.sweepGroup + " " + groupClassName}
        aria-hidden="true" dir="rtl">{renderItems(true)}</div>
    </div>
  </div>;
}

function CompactReading({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= 265) return <p>{text}</p>;
  const boundary = [...text.matchAll(/[.!؟](?:\s|$)/gu)]
    .map(match => (match.index ?? 0) + 1)
    .find(index => index >= 110 && index <= 230);
  const wordBoundary = text.lastIndexOf(" ", 230);
  const preview = text.slice(0, boundary ?? (wordBoundary > 110 ? wordBoundary : 230)).trim();
  return <div className={styles.compactReading}>
    <p>{expanded ? text : preview + (/[.!؟]$/u.test(preview) ? "" : "…")}</p>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? "بستن توضیح" : "خواندن توضیح کامل"}
    </button>
  </div>;
}

function Wheel({ snapshot, onChoose }: { snapshot: SkyDailySnapshot; onChoose: (id: SkyDailyBodyId) => void }) {
  const [highlightBody, setHighlightBody] = useState<SkyDailyBodyId | null>(null);
  const sorted = [...snapshot.planetaryStates].sort((a,b) => a.longitude-b.longitude);
  return <div className={styles.wheelWrap}>
    <svg className={styles.wheel} viewBox="0 0 640 640" role="img"
      aria-label="نقشهٔ محاسبه‌شدهٔ آسمان؛ موقعیت سیارات و زاویه‌ها">
      <defs><radialGradient id="sky-v9-wheel-well">
        <stop offset="0%" stopColor="#1c2935"/>
        <stop offset="65%" stopColor="#111c26"/>
        <stop offset="100%" stopColor="#090e15"/>
      </radialGradient></defs>
      <circle cx="320" cy="320" r="309" fill="url(#sky-v9-wheel-well)"/>
      {[305,293,278,239,212,184].map((radius,i)=>
        <circle key={radius} cx="320" cy="320" r={radius}
          className={i<3?styles.ringMajor:styles.ringMinor}/>)}
      {Array.from({length:72},(_,i)=>{
        const start=position(i*5,i%6===0?284:298),end=position(i*5,305);
        return <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={i%6===0 ? styles.tickMajor : styles.tick}/>;
      })}
      {Array.from({length:12},(_,i)=>{
        const from=position(i*30,213),to=position(i*30,291),symbol=position(i*30+15,257);
        return <g key={i}>
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={styles.spoke}/>
          <text x={symbol.x} y={symbol.y} textAnchor="middle" dominantBaseline="central"
            className={styles.zodiacSymbol}>{SKY_SIGN_SYMBOLS[i]}</text>
        </g>;
      })}
      {snapshot.aspects.slice(0,22).map((aspect,i)=>{
        const a=snapshot.planetaryStates.find(p=>p.body===aspect.leftBody);
        const b=snapshot.planetaryStates.find(p=>p.body===aspect.rightBody);
        if(!a||!b)return null;
        const from=position(a.longitude,183),to=position(b.longitude,183);
        const related=highlightBody===aspect.leftBody || highlightBody===aspect.rightBody;
        const tone=aspect.kind==="trine" || aspect.kind==="sextile"
          ? styles.aspectFlow : aspect.kind==="square" || aspect.kind==="opposition"
            ? styles.aspectTension : styles.aspectUnion;
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          className={styles.aspectLine+" "+tone}
          opacity={highlightBody ? (related ? .94 : .055) : (aspect.orb<=1 ? .54 : .20)}/>;
      })}
      <circle cx="320" cy="320" r="49" className={styles.core}/>
      <circle cx="320" cy="320" r="33" className={styles.coreRing}/>
      <text x="320" y="319" textAnchor="middle" className={styles.coreText}>HALLEUS</text>
      <text x="320" y="336" textAnchor="middle" className={styles.coreSub}>SKY</text>
    </svg>
    {sorted.map((state,i)=>{
      const prev=sorted[(i-1+sorted.length)%sorted.length];
      const next=sorted[(i+1)%sorted.length];
      const nearPrev=((state.longitude-prev.longitude+360)%360)<14;
      const nearNext=((next.longitude-state.longitude+360)%360)<14;
      const at=position(state.longitude,nearPrev&&nearNext ? 184 : nearPrev ? 196 : 214);
      const xy:CSSProperties={left:(at.x/640*100)+"%",top:(at.y/640*100)+"%"};
      return <button type="button" key={state.body}
        className={styles.planetPin+(highlightBody===state.body ? " "+styles.planetPinActive : "")}
        style={xy} onClick={()=>onChoose(state.body)}
        onPointerEnter={()=>setHighlightBody(state.body)}
        onPointerLeave={()=>setHighlightBody(null)}
        onFocus={()=>setHighlightBody(state.body)}
        onBlur={()=>setHighlightBody(null)}
        title={SKY_BODY_LABELS[state.body]+" · "+SKY_SIGN_LABELS[state.sign]}
        aria-label={SKY_BODY_LABELS[state.body]+" در "+SKY_SIGN_LABELS[state.sign]}>
        {SKY_BODY_SYMBOLS[state.body]}
      </button>;
    })}
  </div>;
}
export function SkyObservatoryPreview({ city, cityId, timezone, today, period, view, referenceTime, previewOffers }: {
  city: string; cityId: string; timezone: string;
  today: SkyDailySnapshot; period: SkyObservatoryPeriodData | null; view: View; referenceTime: string;
  previewOffers: Record<string, SurfaceOffer>;
}) {
  const [selectedDate, setSelectedDate] = useState(today.input.localDate);
  const [planet, setPlanet] = useState<SkyDailyBodyId | null>(null);
  const [moonOpen, setMoonOpen] = useState(false);
  const [sign, setSign] = useState<SkyDailyZodiacSign>("gemini");
  useEffect(() => { setSelectedDate(today.input.localDate); setPlanet(null); setMoonOpen(false); }, [view, today.input.localDate]);
  useEffect(() => {
    if (!planet && !moonOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPlanet(null); setMoonOpen(false); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [planet, moonOpen]);
  const active = period?.snapshots.find(s => s.input.localDate === selectedDate) ?? today;
  const moon = active.planetaryStates.find(p => p.body === "moon");
  const primary = active.aspects[0];
  const selectedPlanet = active.planetaryStates.find(p => p.body === planet);
  const reading = useMemo(() => buildSkyPublicReportInterpretation(active), [active]);
  const modeTitle = view === "today" ? "آسمان امروز" :
    view === "week" ? "آسمان این هفته" : "آسمان این ماه";
  const modeSubtitle = view === "today" ? "موقعیت واقعی ماه و سیاره‌ها" :
    view === "week" ? "هفت روز، یک مسیر آسمانی" : "چرخهٔ ماه و حرکت سیاره‌ها";
  const modeIntro = view === "today" ?
    "حرکت ماه، موقعیت سیارات و مهم‌ترین زاویه‌های روز را روی نقشهٔ واقعی آسمان ببین." :
    view === "week" ?
    "روی هفت روز هفته حرکت کن؛ نقشهٔ آسمان و خوانش هر روز با انتخاب تو تغییر می‌کند." :
    "فازهای ماه، جابه‌جایی سیارات و رویدادهای مهم این ماه شمسی را دنبال کن.";
  const allEvents = period?.snapshots.flatMap(s => s.timeline) ?? active.timeline;
  const url = (next: View) => "/sky/preview?view=" + next +
    "&city=" + encodeURIComponent(cityId) + "#time-modes";
  const signGuides = SIGN_IDS.map(id=>({id,...buildSignGuide(id,active)}));
  const selectedGuide = signGuides.find(item=>item.id===sign);
  const dailyGuide = buildHumanDailyGuide(active,timezone,new Date(referenceTime).getTime());
  const signalItems = [
    { id: "sun", symbol: "☉", label: "خورشید در", value: active.planetaryStates.find(p=>p.body==="sun") ?
      SKY_SIGN_LABELS[active.planetaryStates.find(p=>p.body==="sun")!.sign] : "—" },
    { id: "moon", symbol: "☽", label: "ماه در", value: moon ? SKY_SIGN_LABELS[moon.sign] : "—" },
    { id: "phase", symbol: "◐", label: "فاز ماه", value: moonLabel(active) },
    { id: "aspects", symbol: "◇", label: "زاویه‌ها", value: active.aspects.length.toLocaleString("fa-IR") },
    { id: "retro", symbol: "↺", label: "برگشتی‌ها", value: active.planetaryStates.filter(p=>p.motion==="retrograde").length.toLocaleString("fa-IR") },
  ];
  return <div className={styles.page} dir="rtl" id="sky-public-experience" data-sky-mode={view}>
    <EditorialStickyCtaSequence campaign={SKY_STICKY_CTA_CAMPAIGN} endId="sky-personal-chart-cta" rootId="sky-public-experience" />
    <div className={styles.container}>
      <div className={styles.stage}>
      <section className={styles.hero} id="sky-presence">
        <div className={styles.heroIntro}>
          <span className={styles.kicker}><i className={styles.liveDot} aria-hidden="true"/>
            {dateLabel(active.input.localDate, timezone)} · {city}</span>
          <h1>{modeTitle}<em>{modeSubtitle}</em></h1>
        </div>
        <div className={styles.heroScene}>
          <div className={styles.sceneLabel}>
            <span>HALLEUS / OBSERVATORY</span>
            <span>موقعیت واقعی · {city}</span>
          </div>
          <Wheel snapshot={active} onChoose={setPlanet}/>
          <div className={styles.sceneFoot}>
            <div><span>{view === "today" ? "چارت آسترولوژی امروز" : "چارت آسمان روز انتخاب‌شده"}</span><strong>نقشهٔ محاسبه‌شدهٔ آسمان</strong></div>
            <a href="#sky-city-tools">تغییر شهر رصد</a>
          </div>
        </div>
      </section>
      <div className={styles.heroFacts} aria-label="خلاصهٔ سریع آسمان">
        <div><span>ماه در</span><strong>{moon ? SKY_SIGN_LABELS[moon.sign] : "نامشخص"}</strong></div>
        <div><span>فاز ماه</span><strong>{moonLabel(active)}</strong></div>
        <div><span>زاویهٔ مهم</span><strong>{primary ? SKY_ASPECT_LABELS[primary.kind] : "ثبت نشده"}</strong></div>
      </div>
      <div className={styles.timeModes} id="time-modes">
        <span>کاوش در زمان</span>
        <nav aria-label="بازهٔ رصد آسمان">
          {(["today","week","month"] as const).map(item =>
            <Link key={item} href={url(item)}
              aria-current={view===item?"page":undefined}
              className={view===item?styles.modeCurrent:styles.mode}>
              {item==="today"?"امروز":item==="week"?"این هفته":"این ماه"}
            </Link>)}
        </nav>
      </div>
      </div>
      {view!=="today"&&period&&<section className={styles.period}>
        <div className={styles.periodLede}>
          <span className={styles.kicker}>{view==="week"?"WEEKLY SKYLINE":"LUNAR CYCLE"} · موتور هالیوس</span>
          <h2>{view==="week"?"روزهای پیش رو":"فازهای ماه"}</h2>
          <p>از {shortDate(period.startDate,timezone)} تا {shortDate(period.endDate,timezone)}</p>
        </div>
        {view==="week"?<div className={styles.weekStage}>
          <p>برای دیدن نقشهٔ هر روز، یکی از تاریخ‌ها را انتخاب کن.</p>
          <div className={styles.weekLine} role="group" aria-label="روزهای هفته">
            {period.snapshots.map(day=>{
              const date=day.input.localDate,chosen=active.input.localDate===date;
              return <button type="button" key={date}
                className={chosen?styles.weekDayActive:styles.weekDay}
                aria-pressed={chosen} onClick={()=>setSelectedDate(date)}>
                <small>{new Intl.DateTimeFormat("fa-IR",{timeZone:timezone,weekday:"short"}).format(new Date(date+"T12:00:00Z"))}</small>
                <strong>{new Intl.DateTimeFormat("fa-IR",{timeZone:timezone,day:"numeric"}).format(new Date(date+"T12:00:00Z"))}</strong>
                <i aria-hidden="true"/>
              </button>;
            })}
          </div>
          <div className={styles.weekReading} aria-live="polite">
            <span>{dateLabel(active.input.localDate,timezone)}</span>
            <h3>{active.aspects[0]?SKY_ASPECT_LABELS[active.aspects[0].kind]+" "+
              SKY_BODY_LABELS[active.aspects[0].leftBody]+" و "+
              SKY_BODY_LABELS[active.aspects[0].rightBody]:"مرور وضعیت آسمان"}</h3>
            <p>{active.planetaryStates.find(p=>p.body==="moon")?
              "ماه در "+SKY_SIGN_LABELS[active.planetaryStates.find(p=>p.body==="moon")!.sign]+
              " است؛ "+moonLabel(active)+" با "+
              (active.moonPhase?pct(active.moonPhase.illuminationFraction):"روشنایی نامشخص")+
              " چارچوب خوانش این روز را شکل می‌دهد.":
              "جایگاه ماه برای این روز ثبت نشده است."}</p>
            <div className={styles.weekHint}><span>☽</span><p>
              {active.timeline.length.toLocaleString("fa-IR")} رویداد و
              {active.aspects.length.toLocaleString("fa-IR")} زاویه در این روز محاسبه شده.
            </p></div>
          </div>
        </div>:<div className={styles.monthStage}>
          <p>یکی از فازها را انتخاب کن تا تصویر ماه و جزئیات همان روز تغییر کنند.</p>
          <div className={styles.moonPhases} role="group" aria-label="چرخهٔ ماه">
            {(["new","waxing","full","waning"] as const).map(phase=>{
              const found=period.snapshots.find(day=>day.moonPhase?.phase===phase);
              const chosen=!!found&&active.input.localDate===found.input.localDate;
              return <button type="button" key={phase} disabled={!found}
                className={chosen?styles.phaseActive:styles.phase}
                aria-pressed={chosen} onClick={()=>found&&setSelectedDate(found.input.localDate)}>
                <span className={styles.phaseOrb} data-phase={phase} aria-hidden="true"/>
                <strong>{phaseLabel[phase]}</strong>
                <small>{found?shortDate(found.input.localDate,timezone):"در این ماه ثبت نشده"}</small>
              </button>;
            })}
          </div>
          <div className={styles.monthReading} aria-live="polite">
            <span>{dateLabel(active.input.localDate,timezone)}</span>
            <h3>{moonLabel(active)}</h3>
            <p>در این روز روشنایی ماه
              {active.moonPhase?" "+pct(active.moonPhase.illuminationFraction):" ثبت نشده"}
              است؛ این مقدار از دادهٔ محاسبه‌شدهٔ همان تاریخ به‌دست آمده است.</p>
          </div>
        </div>}
        <div className={styles.periodEvents}>
          <h3>رویدادهای مهم {view==="week"?"هفته":"ماه"}</h3>
          {allEvents.length?allEvents.slice()
            .sort((a,b)=>(("occurredAt" in a?a.occurredAt:"")??"")
              .localeCompare((("occurredAt" in b?b.occurredAt:"")??"")))
            .slice(0,view==="week"?7:12).map((event,i)=>
              <div key={i}>
                <time>{eventMoment("occurredAt" in event?event.occurredAt:undefined,timezone)}</time>
                <strong>{eventLabel(event)}</strong>
              </div>):<p>رویداد زمان‌دار دیگری در این بازه ثبت نشده است.</p>}
        </div>
      </section>}
      <AutoSweepRail label="خلاصهٔ رصد" groupClassName={styles.signalRail} variant="signal"
        renderItems={() => signalItems.map(item =>
          <div key={item.id}><span>{item.symbol}</span><small>{item.label}</small><strong>{item.value}</strong></div>
        )}/>
      <section className={styles.overview} id="sky-overview">
      <section className={styles.reading} id="sky-reading">
        <span className={styles.kicker}>{view === "today" ? "خواندن سریع امروز" : "خوانش روز انتخاب‌شده"}</span>
        <h2>{view === "today" ? "امروز از کدام بخش آسمان شروع کنی؟" : "آسمان این روز چه چیزی می‌گوید؟"}</h2>
        <p className={styles.lead}>{dailyGuide.tone}</p>
        <p className={styles.subLead}>{dailyGuide.personalLine}</p>
        <div className={styles.dailySignals}>
          <div><span>تمرکز این روز</span><strong>{dailyGuide.focus}</strong></div>
          <div><span>پیشنهاد این روز</span><strong>{dailyGuide.action}</strong></div>
        </div>
        <details className={styles.more}><summary>جمع‌بندی محاسبات روز</summary><p>{reading.summary}</p>
          <p>{dailyGuide.moonReason}</p><p>{dailyGuide.aspectReason}</p>
          <p>{dailyGuide.motionReason}</p>
        </details>
        <div className={styles.reason}>
          <span>مهم‌ترین زاویهٔ {view === "today" ? "امروز" : "روز انتخاب‌شده"}</span>
          <p>{primary ? reading.aspectReadings[skyPublicAspectKey(primary)] :
            "زاویهٔ برجسته‌ای برای این روز ثبت نشده است."}</p>
        </div>
        <details className={styles.more}><summary>توضیح کامل و روش خواندن امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="امروز از کدام بخش آسمان شروع کنی؟"/>
        </details>
      </section>
      <aside className={styles.planetPreview} aria-label="جایگاه‌های اصلی سیارات">
        <span className={styles.kicker}>PLANET POSITIONS</span>
        <h2>جایگاه سیارات در روز انتخاب‌شده</h2>
        <div>{active.planetaryStates.slice(0,4).map(state=>
          <button type="button" key={state.body} onClick={()=>setPlanet(state.body)}>
            <span>{SKY_BODY_SYMBOLS[state.body]}</span><strong>{SKY_BODY_LABELS[state.body]}</strong>
            <small>{SKY_SIGN_LABELS[state.sign]} · {state.degreeInSign.toLocaleString("fa-IR",{maximumFractionDigits:1})}°</small>
            <span aria-hidden="true">‹</span>
          </button>)}</div>
        <a href="#sky-planets">نمایش هر ده سیاره</a>
      </aside>
      </section>
      <section className={styles.reading} id="sky-moon">
        <span className={styles.kicker}>{view === "today" ? "ماه امروز" : "ماه در روز انتخاب‌شده"}</span>
        <h2>{view === "today" ? "وضعیت ماه امروز؛ نشان، فاز و روشنایی" : "وضعیت ماه در روز انتخاب‌شده؛ نشان، فاز و روشنایی"}</h2>
        <div className={styles.moonExperience}>
          <div className={styles.moonVisual}>
            <SkyMoonVisual label={city + " · ماه در " + (moon ? SKY_SIGN_LABELS[moon.sign] : "نامشخص")}
              illuminationFraction={active.moonPhase?.illuminationFraction}
              phase={active.moonPhase?.phase} showPanel={false} idPrefix="sky-preview-inline"/>
            <button type="button" className={styles.moonVisualButton}
              onClick={() => setMoonOpen(true)} aria-label="نمای بزرگ ماه و جزئیات فاز">
              <span className={styles.moonVisualHint}>برای دیدن جزئیات، ماه را لمس کن</span>
            </button>
          </div>
          <div className={styles.moonDetails}>
            <MoonFact snapshot={active}/>
            <p>{active.moonPhase && active.moonPhase.illuminationFraction < 0.08
              ? "ماه در این روز بسیار کم‌نور است؛ تاریکی تصویر به معنی خطای بارگذاری نیست."
              : "تصویر از عکس واقعی ماه و سایهٔ فاز محاسبه‌شدهٔ همین روز ساخته شده است."}</p>
          </div>
        </div>
        <details className={styles.more}><summary>دربارهٔ فاز و وضعیت ماه بخوان</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="وضعیت ماه امروز؛ نشان، فاز و روشنایی"/>
        </details>
      </section>
      <SurfaceShowcaseSlot surface="sky" slot="after-moon" previewFallback={previewOffers["after-moon"]}/>
      <section className={styles.reading} id="sky-planets">
        <span className={styles.kicker}>جایگاه‌ها</span>
        <h2>{view === "today" ? "وضعیت سیارات امروز؛ هر جسم کجاست و چگونه حرکت می‌کند؟" : "وضعیت سیارات در روز انتخاب‌شده؛ جایگاه و حرکت"}</h2>
        <div className={styles.planetList}>{active.planetaryStates.map(item =>
          <button type="button" key={item.body} onClick={() => setPlanet(item.body)}>
            <span>{SKY_BODY_SYMBOLS[item.body]}</span>
            <strong>{SKY_BODY_LABELS[item.body]}</strong>
            <small>{SKY_SIGN_LABELS[item.sign]} · {item.degreeInSign.toLocaleString("fa-IR",{maximumFractionDigits:1})}°</small>
            <span>＋</span>
          </button>)}</div>
        <details className={styles.more}><summary>توضیحات کامل موقعیت و حرکت سیارات</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="وضعیت سیارات امروز؛ هر جسم کجاست و چگونه حرکت می‌کند؟"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-aspects">
        <span className={styles.kicker}>روابط آسمان</span>
        <h2>مهم‌ترین ترنزیت‌ها و زاویه‌های روز</h2>
        <div className={styles.eventList}>{active.aspects.slice(0,8).map((aspect,i)=>
          <div key={i}><strong>{SKY_BODY_LABELS[aspect.leftBody]} و {SKY_BODY_LABELS[aspect.rightBody]}</strong>
          <span>{SKY_ASPECT_LABELS[aspect.kind]} · اورب {aspect.orb.toLocaleString("fa-IR",{maximumFractionDigits:2})}°</span>
          <CompactReading text={reading.aspectReadings[skyPublicAspectKey(aspect)]}/></div>)}</div>
        {!active.aspects.length ? <p>زاویهٔ مهمی در دادهٔ این روز ثبت نشده است.</p> : null}
        <details className={styles.more}><summary>روش محاسبه و تفسیر زاویه‌ها</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="مهم‌ترین ترنزیت‌ها و زاویه‌های روز"/>
        </details>
      </section>
      <SurfaceShowcaseSlot surface="sky" slot="after-aspects" previewFallback={previewOffers["after-aspects"]}/>
      <section className={styles.reading} id="sky-events">
        <span className={styles.kicker}>به ترتیب زمان</span>
        <h2>{view === "today" ? "رویدادهای نجومی امروز؛ چه چیزی گذشته و چه چیزی در راه است؟" : "رویدادهای نجومی روز انتخاب‌شده؛ به ترتیب زمان"}</h2>
        <div className={styles.timeline}>{active.timeline.slice(0,12).map((event,i)=>
          <div key={i}><time>{eventTime("occurredAt" in event ? event.occurredAt : undefined,timezone)}</time>
            <span>{eventLabel(event)}</span></div>)}</div>
        {!active.timeline.length ? <p>رویدادی برای این روز ثبت نشده است.</p> : null}
        <details className={styles.more}><summary>اطلاعات تکمیلی و وضعیت ستاره شناسی امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="رویدادهای نجومی امروز؛ چه چیزی گذشته و چه چیزی در راه است؟"/>
        </details>
      </section>
      <SurfaceShowcaseSlot surface="sky" slot="after-timeline" previewFallback={previewOffers["after-timeline"]}/>
      <section className={styles.explore} aria-label="کاوش بیشتر در آسمان">
        <h2>کاوش بیشتر در آسمان</h2>
        <AutoSweepRail label="کاوش بیشتر در آسمان" groupClassName={styles.exploreTiles} variant="explore"
          renderItems={duplicate => <>
            <a tabIndex={duplicate ? -1 : undefined} href="#sky-moon"><span>☽</span><strong>چرخهٔ ماه</strong><small>فاز، روشنایی و جایگاه واقعی</small></a>
            <Link tabIndex={duplicate ? -1 : undefined} href={url("week")}><span>✧</span><strong>ترنزیت‌های این هفته</strong><small>هفت روز محاسبه‌شده</small></Link>
            <a tabIndex={duplicate ? -1 : undefined} href="#sky-guide"><span>◇</span><strong>راهنمای چارت آسمان</strong><small>نشان‌ها و زاویه‌ها</small></a>
          </>}/>
      </section>
      <section className={styles.reading} id="sky-signs">
        <span className={styles.kicker}>برای نشان تو</span>
        <h2>{view === "today" ? "ترنزیت‌های امروز برای دوازده نشان" : "ترنزیت‌های روز انتخاب‌شده برای دوازده نشان"}</h2>
        <AutoSweepRail label="انتخاب نشان" groupClassName={styles.signRail} variant="sign"
          renderItems={duplicate => SIGN_IDS.map((id,idx)=><button type="button" key={id}
            tabIndex={duplicate ? -1 : undefined}
            aria-pressed={sign === id} className={sign === id ? styles.signActive : styles.sign}
            onClick={() => setSign(id)}><span>{SKY_SIGN_SYMBOLS[idx]}</span>{SKY_SIGN_LABELS[id]}</button>)}/>
        <div className={styles.signReading}><span>{SKY_SIGN_LABELS[sign]}</span>
          <p>{selectedGuide?.tone}</p><CompactReading text={selectedGuide?.reason}/>
        </div>
        <details className={styles.signArchive}><summary>خوانش تمام دوازده نشان</summary>
          <div>{signGuides.map(item=>
            <article key={item.id}><h3>{SKY_SIGN_LABELS[item.id]}</h3>
              <p>{item.tone}</p><small>{item.reason}</small>
            </article>)}</div>
        </details>
        <details className={styles.more}><summary>متن آموزشی کامل دوازده نشان و هوروسکوپ امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="ترنزیت‌های امروز برای دوازده نشان"/>
        </details>
      </section>
      <section className={styles.reading}>
        <span className={styles.kicker}>نمای نجومی</span>
        <h2>خلاصهٔ آسمان در یک نگاه</h2>
        <p>موقعیت سیاره‌ها، درجه‌ها و زاویه‌ها در چرخ بالا از دادهٔ محاسبه‌شدهٔ روز انتخاب‌شده نمایش داده می‌شوند.</p>
        <details className={styles.more}><summary>چارت آسمان امروز چه چیزی نشان می‌دهد؟</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="خلاصهٔ آسمان در یک نگاه"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-guide">
        <span className={styles.kicker}>راهنمای کاربردی</span>
        <h2>این داده‌ها را چگونه به زندگی خودت ربط بدهی؟</h2>
        <p>برای خواندن شخصی‌تر، آسمان روز را کنار چارت تولد خودت قرار بده.</p>
        <p>{modeIntro}</p>
          <details className={styles.heroEditorial}>
            <summary>آشنایی با آسترولوژی امروز</summary>
            <p>بعضی روزها یک موضوع بیشتر از بقیه ذهنت را درگیر می‌کند؛ روز دیگر همان موضوع آسان‌تر پیش می‌رود. برای خواندن این تفاوت‌ها در زبان آسترولوژی، اول باید بدانی آسمان واقعاً چه وضعیتی دارد. آسترولوژی امروز در هالیوس از جایگاه محاسبه‌شدهٔ ماه و سیاره‌ها شروع می‌شود: هر جسم در کدام نشان است، چه زاویه‌ای با بقیه دارد و چه تغییراتی تا پایان روز در پیش است.</p>
            <p>این نگاه با یک پیش‌گوییِ آماده فرق دارد. در یک لحظه، جایگاه سیاره‌ها مبنای مشترک خوانش است؛ اما برداشت شخصی از آن به چارت تولد هر نفر وابسته است. استرولوژی امروز هم از همین جایگاه‌ها و حرکت‌های جاری حرف می‌زند، نه از اتفاق قطعی زندگی تو. اینجا اول نقشهٔ عمومی روز را می‌خوانی و بعد، اگر بخواهی، سراغ چارت شخصی خودت می‌روی.</p>
          </details>
        <details className={styles.more}><summary>ارتباط آسمان امروز و چارت شخصی</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="این داده‌ها را چگونه به زندگی خودت ربط بدهی؟"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-faq">
        <span className={styles.kicker}>پرسش‌های رایج</span>
        <h2>پرسش‌های رایج دربارهٔ آسمان امروز</h2>
        <details className={styles.more}><summary>آیا آسترولوژی امروز همان فال روزانه است؟</summary><p>نه. داده‌های جایگاه سیارات، فاز ماه و زاویه‌های روز از محاسبه می‌آیند. فال روزانه معمولاً متنی تفسیری برای یک نشان است. این صفحه علاوه بر توضیح‌های نمادین، خودِ داده‌ها و خط زمانی را هم نشان می‌دهد؛ بنابراین می‌توانی میان محاسبه و برداشت فرق بگذاری.</p></details><details className={styles.more}><summary>ساعت رویدادها برای کدام شهر است؟</summary><p>ساعت‌ها بر اساس منطقهٔ زمانی شهری که داده برای آن به دست آمده نمایش داده می‌شوند. در نمای فعلی، تهران پیش‌فرض است و انتخاب‌گر عمومیِ تغییر شهر و تاریخ دیده نمی‌شود. برای یک تاریخ واحد، ساعت محلی همان رویداد در شهرهای مختلف می‌تواند فرق کند.</p></details><details className={styles.more}><summary>فاز ماه امروز چگونه محاسبه می‌شود؟</summary><p>نام فاز و درصد روشنایی از دادهٔ محاسبه‌شدهٔ همان روز به دست می‌آیند. فاز ماه با نشان ماه یکی نیست: فاز از هندسهٔ روشنایی صحبت می‌کند و نشان از محل ماه در زودیاک.</p></details><details className={styles.more}><summary>چرا بعضی روزها داده نمایش داده نمی‌شود؟</summary><p>اگر تاریخ خواسته‌شده خارج از روز پشتیبانی‌شده باشد یا دادهٔ معتبر آن درخواست در دسترس نباشد، هالیوس وضعیت نبود داده را نشان می‌دهد و روز دیگری را بی‌خبر جایگزین نمی‌کند. این رفتار از نمایش عددی ظاهراً دقیق ولی نامربوط بهتر است.</p></details>
      </section>
      <details className={styles.cityTools} id="sky-city-tools"><summary>انتخاب شهر رصد</summary>
        <form method="get" action="/sky/preview">
          <input type="hidden" name="view" value={view}/>
          <SkyCityPicker initialCity={{id:cityId,faName:city,provinceFaName:""}}/>
          <button type="submit">نمایش آسمان این شهر</button>
        </form>
      </details>
      <section className={styles.cta} id="sky-personal-chart-cta">
        <span>از آسمان عمومی تا نقشهٔ شخصی</span><h2>آسمان امروز را کنار چارت تولدت بخوان</h2>
        <p>تاریخ، ساعت و شهر تولدت را وارد کن و نقشهٔ شخصی آسمانت را ببین.</p>
        <Link href="/chart">ساخت چارت تولد ←</Link>
      </section>
    </div>
    <footer className={styles.footer}>HALLEUS SKY · داده‌های محاسبه‌شده با موتور هالیوس · پیش‌نمایش فقط در محیط توسعه</footer>
    {moonOpen ? <div className={styles.sheetBackdrop} onClick={() => setMoonOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="جزئیات ماه"
        className={styles.sheet+" "+styles.moonSheet} onClick={event => event.stopPropagation()}>
        <button type="button" className={styles.sheetClose} onClick={() => setMoonOpen(false)} aria-label="بستن">×</button>
        <span className={styles.sheetEyebrow}>{dateLabel(active.input.localDate,timezone)}</span>
        <h2>{moon ? "ماه در "+SKY_SIGN_LABELS[moon.sign] : "ماه آسمان"}</h2>
        <div className={styles.moonSheetImage}>
          <SkyMoonVisual label={city} illuminationFraction={active.moonPhase?.illuminationFraction}
            phase={active.moonPhase?.phase} showPanel={false} idPrefix="sky-preview-modal"/>
        </div>
        <div className={styles.moonSheetFacts}>
          <div><span>فاز</span><strong>{moonLabel(active)}</strong></div>
          <div><span>روشنایی</span><strong>{active.moonPhase ? pct(active.moonPhase.illuminationFraction) : "ثبت نشده"}</strong></div>
          <div><span>نشان</span><strong>{moon ? SKY_SIGN_LABELS[moon.sign] : "نامشخص"}</strong></div>
        </div>
        <p>{active.moonPhase && active.moonPhase.illuminationFraction < 0.08
          ? "کم‌نور بودن ماه در این تاریخ طبیعی است؛ تصویر فاز محاسبه‌شده را نمایش می‌دهد، نه خطای بارگذاری."
          : "تصویر از همان عکس واقعی ماه و سایهٔ محاسبه‌شدهٔ این تاریخ ساخته شده است."}</p>
      </section>
    </div> : null}
    {selectedPlanet ? <div className={styles.sheetBackdrop} onClick={() => setPlanet(null)}>
      <section role="dialog" aria-modal="true" aria-label={"جایگاه "+SKY_BODY_LABELS[selectedPlanet.body]}
        className={styles.sheet} onClick={event => event.stopPropagation()}>
        <button type="button" className={styles.sheetClose} onClick={()=>setPlanet(null)} aria-label="بستن">×</button>
        <div className={styles.sheetVisual}>
          <div className={styles.sheetOrbit} aria-hidden="true">
            <span className={styles.sheetGlyph}>{SKY_BODY_SYMBOLS[selectedPlanet.body]}</span>
          </div>
          <span className={styles.sheetEyebrow}>موقعیت محاسبه‌شدهٔ سیاره</span>
          <h2>{SKY_BODY_LABELS[selectedPlanet.body]}</h2>
          <p className={styles.sheetPosition}>{SKY_SIGN_LABELS[selectedPlanet.sign]} · {selectedPlanet.degreeInSign.toLocaleString("fa-IR",{maximumFractionDigits:2})}°</p>
        </div>
        <dl className={styles.sheetMetrics}>
          <div><dt>نشان</dt><dd>{SKY_SIGN_LABELS[selectedPlanet.sign]}</dd></div>
          <div><dt>درجه</dt><dd>{selectedPlanet.degreeInSign.toLocaleString("fa-IR",{maximumFractionDigits:2})}°</dd></div>
          <div><dt>جهت حرکت</dt><dd>{SKY_MOTION_LABELS[selectedPlanet.motion]}</dd></div>
        </dl>
        <div className={styles.sheetReading}>
          <h3>خوانش {SKY_BODY_LABELS[selectedPlanet.body]} در این روز</h3>
          <CompactReading text={reading.planetReadings[selectedPlanet.body]}/>
        </div>
        <details className={styles.sheetTechnical}>
          <summary>جزئیات محاسباتی</summary>
          <dl><div><dt>طول دایرةالبروجی</dt><dd>{selectedPlanet.longitude.toLocaleString("fa-IR",{maximumFractionDigits:3})}°</dd></div></dl>
        </details>
      </section>
    </div> : null}
  </div>;
}
