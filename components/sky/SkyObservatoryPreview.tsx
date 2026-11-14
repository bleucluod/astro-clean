"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { R3ApprovedInlineParagraphs } from "@/components/r3-approved-visible-copy";
import { SurfaceShowcaseSlot } from "@/components/shop/SurfaceShowcaseSlot";
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
function Wheel({ snapshot, onChoose }: { snapshot: SkyDailySnapshot; onChoose: (id: SkyDailyBodyId) => void }) {
  const sorted = [...snapshot.planetaryStates].sort((a,b) => a.longitude-b.longitude);
  return <div className={styles.wheelWrap}>
    <svg className={styles.wheel} viewBox="0 0 640 640" role="img"
      aria-label="نقشهٔ محاسبه‌شدهٔ آسمان؛ موقعیت سیارات و زاویه‌ها">
      <defs><radialGradient id="sky-v9-wheel-well">
        <stop offset="0%" stopColor="#1b1d20"/>
        <stop offset="68%" stopColor="#14161a"/>
        <stop offset="100%" stopColor="#090a0c"/>
      </radialGradient></defs>
      <circle cx="320" cy="320" r="309" fill="url(#sky-v9-wheel-well)"/>
      {[305,293,278,239,212,184,139].map((radius,i)=>
        <circle key={radius} cx="320" cy="320" r={radius}
          className={i<3?styles.ringMajor:styles.ringMinor}/>)}
      {Array.from({length:72},(_,i)=>{
        const start=position(i*5,i%6===0?284:298),end=position(i*5,305);
        return <line key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.tick}/>;
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
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          className={styles.aspectLine} opacity={aspect.orb<=1?.65:.28}/>;
      })}
      <circle cx="320" cy="320" r="49" className={styles.core}/>
      <circle cx="320" cy="320" r="33" className={styles.coreRing}/>
      <text x="320" y="319" textAnchor="middle" className={styles.coreText}>HALLEUS</text>
      <text x="320" y="336" textAnchor="middle" className={styles.coreSub}>SKY</text>
    </svg>
    {sorted.map((state,i)=>{
      const prev=sorted[(i-1+sorted.length)%sorted.length];
      const close=((state.longitude-prev.longitude+360)%360)<13;
      const at=position(state.longitude,close?196:214);
      const xy:CSSProperties={left:(at.x/640*100)+"%",top:(at.y/640*100)+"%"};
      return <button type="button" key={state.body} className={styles.planetPin}
        style={xy} onClick={()=>onChoose(state.body)}
        title={SKY_BODY_LABELS[state.body]+" · "+SKY_SIGN_LABELS[state.sign]}
        aria-label={SKY_BODY_LABELS[state.body]+" در "+SKY_SIGN_LABELS[state.sign]}>
        {SKY_BODY_SYMBOLS[state.body]}
      </button>;
    })}
  </div>;
}
export function SkyObservatoryPreview({ city, cityId, timezone, today, period, view, referenceTime }: {
  city: string; cityId: string; timezone: string;
  today: SkyDailySnapshot; period: SkyObservatoryPeriodData | null; view: View; referenceTime: string;
}) {
  const [selectedDate, setSelectedDate] = useState(today.input.localDate);
  const [planet, setPlanet] = useState<SkyDailyBodyId | null>(null);
  const [sign, setSign] = useState<SkyDailyZodiacSign>("gemini");
  useEffect(() => { setSelectedDate(today.input.localDate); setPlanet(null); }, [view, today.input.localDate]);
  useEffect(() => {
    if (!planet) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPlanet(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [planet]);
  const active = period?.snapshots.find(s => s.input.localDate === selectedDate) ?? today;
  const moon = active.planetaryStates.find(p => p.body === "moon");
  const primary = active.aspects[0];
  const selectedPlanet = active.planetaryStates.find(p => p.body === planet);
  const reading = useMemo(() => buildSkyPublicReportInterpretation(active), [active]);
  const upcomingToday = today.timeline.find(item => "occurredAt" in item && item.occurredAt &&
    new Date(item.occurredAt).getTime() >= new Date(referenceTime).getTime());
  const allEvents = period?.snapshots.flatMap(s => s.timeline) ?? active.timeline;
  const url = (next: View) => "/sky/preview?view=" + next +
    "&city=" + encodeURIComponent(cityId) + "#time-modes";
  const distance = moon ? (SIGN_IDS.indexOf(moon.sign) - SIGN_IDS.indexOf(sign) + 12) % 12 : null;
  const signComment = distance == null ? "دادهٔ ماه برای این روز موجود نیست." :
    distance === 0 ? "ماه در همین نشان قرار دارد؛ احساس و واکنش در خوانش روز برجسته‌تر است." :
    distance === 6 ? "ماه روبه‌روی این نشان قرار گرفته و محور رابطه و پاسخ متقابل برجسته است." :
    distance === 3 || distance === 9 ? "ماه با این نشان زاویهٔ فشاری می‌سازد؛ موضوع اصلی مدیریت واکنش‌هاست." :
    distance === 4 || distance === 8 ? "ماه با این نشان نسبت هماهنگی دارد؛ پیگیری کارهای نیمه‌تمام روان‌تر خوانده می‌شود." :
    "خوانش این نشان را کنار زاویه‌های واقعی روز بررسی کن.";
  return <div className={styles.page} dir="rtl">
    <div className={styles.container}>
      <section className={styles.hero} id="sky-presence">
        <div className={styles.heroIntro}>
          <span className={styles.kicker}><i className={styles.liveDot} aria-hidden="true"/>
            {dateLabel(today.input.localDate, timezone)} · {city}</span>
          <h1>آسترولوژی امروز؛ <em>ماه، سیارات و ترنزیت‌های روز</em></h1>
          <p>امروز آسمان را ببین؛ جایگاه‌ها و زاویه‌ها را لمس کن و خوانش روز را دنبال کن.</p>
        </div>
        <div className={styles.heroScene}>
          <div className={styles.sceneLabel}>
            <span>HALLEUS / OBSERVATORY</span>
            <span>موقعیت واقعی · {city}</span>
          </div>
          <Wheel snapshot={today} onChoose={setPlanet}/>
          <div className={styles.sceneFoot}>
            <div><span>چارت آسترولوژی امروز</span><strong>نقشهٔ محاسبه‌شدهٔ آسمان</strong></div>
            <span>برای جزئیات روی سیاره لمس کن</span>
          </div>
        </div>
      </section>
      <div className={styles.heroFacts}>
        <MoonFact snapshot={today}/>
        <div><span>مهم‌ترین زاویه</span><strong>{today.aspects[0] ?
          SKY_ASPECT_LABELS[today.aspects[0].kind]+" "+SKY_BODY_LABELS[today.aspects[0].leftBody]+
          " و "+SKY_BODY_LABELS[today.aspects[0].rightBody] : "زاویه‌ای ثبت نشده"}</strong></div>
        <div><span>رویداد پیش رو</span><strong>{upcomingToday ?
          eventLabel(upcomingToday) : "رویداد بعدی ثبت نشده"}</strong></div>
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
      {view==="today"&&<div className={styles.planetRail} aria-label="لمس سیارات">
        {today.planetaryStates.map(item=>
          <button type="button" key={item.body} onClick={()=>setPlanet(item.body)}>
            <span>{SKY_BODY_SYMBOLS[item.body]}</span>
            <small>{SKY_BODY_LABELS[item.body]}</small>
          </button>)}
      </div>}
      {view!=="today"&&period&&<section className={styles.period}>
        <div className={styles.periodLede}>
          <span className={styles.kicker}>{view==="week"?"WEEKLY SKYLINE":"LUNAR CYCLE"} · موتور هالیوس</span>
          <h2>{view==="week"?"آسترولوژی این هفته؛":"آسترولوژی این ماه؛"}
            <em>{view==="week"?" هفت روز، یک مسیر آسمانی":" ریتم یک چرخهٔ کامل"}</em></h2>
          <p>از {shortDate(period.startDate,timezone)} تا {shortDate(period.endDate,timezone)}؛
            {view==="week"?" تغییرات ماه و رویدادهای هفت روز را دنبال کن.":
              " چرخهٔ ماه و تغییرات مهم این ماه شمسی را ببین."}</p>
        </div>
        {view==="week"?<div className={styles.weekStage}>
          <h3>روی مسیر هفته حرکت کن</h3>
          <p>هر نقطه یک روز محاسبه‌شده از موتور هالیوس است.</p>
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
          <h3>چرخهٔ ماه در یک نگاه</h3>
          <p>مرحله‌ای از ماه را لمس کن و روز واقعی آن را ببین.</p>
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
      <section className={styles.reading} id="sky-reading">
        <span className={styles.kicker}>خواندن سریع امروز</span>
        <h2>امروز از کدام بخش آسمان شروع کنی؟</h2>
        <p className={styles.lead}>{reading.summary}</p>
        <div className={styles.reason}>
          <span>مهم‌ترین زاویهٔ {view === "today" ? "امروز" : "روز انتخاب‌شده"}</span>
          <p>{primary ? reading.aspectReadings[skyPublicAspectKey(primary)] :
            "زاویهٔ برجسته‌ای برای این روز ثبت نشده است."}</p>
        </div>
        <details className={styles.more}><summary>توضیح کامل و روش خواندن امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="امروز از کدام بخش آسمان شروع کنی؟"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-signs">
        <span className={styles.kicker}>برای نشان تو</span>
        <h2>ترنزیت‌های امروز برای دوازده نشان</h2>
        <div className={styles.signRail} role="group" aria-label="انتخاب نشان">
          {SIGN_IDS.map((id,idx)=><button type="button" key={id}
            aria-pressed={sign === id} className={sign === id ? styles.signActive : styles.sign}
            onClick={() => setSign(id)}><span>{SKY_SIGN_SYMBOLS[idx]}</span>{SKY_SIGN_LABELS[id]}</button>)}
        </div>
        <div className={styles.signReading}><span>{SKY_SIGN_LABELS[sign]}</span><p>{signComment}</p></div>
        <details className={styles.more}><summary>متن آموزشی کامل دوازده نشان و هوروسکوپ امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="ترنزیت‌های امروز برای دوازده نشان"/>
        </details>
      </section>
      <section className={styles.reading}>
        <span className={styles.kicker}>نمای نجومی</span>
        <h2>خلاصهٔ آسمان در یک نگاه</h2>
        <p>موقعیت سیارات امروز، درجه‌ها و زاویه‌ها در چرخ بالا از دادهٔ محاسبه‌شدهٔ همان روز نمایش داده می‌شوند.</p>
        <details className={styles.more}><summary>چارت آسمان امروز چه چیزی نشان می‌دهد؟</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="خلاصهٔ آسمان در یک نگاه"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-moon">
        <span className={styles.kicker}>ماه امروز</span>
        <h2>وضعیت ماه امروز؛ نشان، فاز و روشنایی</h2>
        <div className={styles.moonBig}><span>☽</span><MoonFact snapshot={active}/></div>
        <details className={styles.more}><summary>دربارهٔ فاز و وضعیت ماه بخوان</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="وضعیت ماه امروز؛ نشان، فاز و روشنایی"/>
        </details>
      </section>
      <SurfaceShowcaseSlot surface="sky" slot="after-moon"/>
      <section className={styles.reading} id="sky-planets">
        <span className={styles.kicker}>جایگاه‌ها</span>
        <h2>وضعیت سیارات امروز؛ هر جسم کجاست و چگونه حرکت می‌کند؟</h2>
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
          <p>{reading.aspectReadings[skyPublicAspectKey(aspect)]}</p></div>)}</div>
        {!active.aspects.length ? <p>زاویهٔ مهمی در دادهٔ این روز ثبت نشده است.</p> : null}
        <details className={styles.more}><summary>روش محاسبه و تفسیر زاویه‌ها</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="مهم‌ترین ترنزیت‌ها و زاویه‌های روز"/>
        </details>
      </section>
      <section className={styles.reading} id="sky-events">
        <span className={styles.kicker}>به ترتیب زمان</span>
        <h2>رویدادهای نجومی امروز؛ چه چیزی گذشته و چه چیزی در راه است؟</h2>
        <div className={styles.timeline}>{active.timeline.slice(0,12).map((event,i)=>
          <div key={i}><time>{eventTime("occurredAt" in event ? event.occurredAt : undefined,timezone)}</time>
            <span>{eventLabel(event)}</span></div>)}</div>
        {!active.timeline.length ? <p>رویدادی برای این روز ثبت نشده است.</p> : null}
        <details className={styles.more}><summary>اطلاعات تکمیلی و وضعیت ستاره شناسی امروز</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="رویدادهای نجومی امروز؛ چه چیزی گذشته و چه چیزی در راه است؟"/>
        </details>
      </section>
      <SurfaceShowcaseSlot surface="sky" slot="after-timeline"/>
      <section className={styles.reading} id="sky-guide">
        <span className={styles.kicker}>راهنمای کاربردی</span>
        <h2>این داده‌ها را چگونه به زندگی خودت ربط بدهی؟</h2>
        <p>برای خواندن شخصی‌تر، آسمان روز را کنار چارت تولد خودت قرار بده.</p>
        <details className={styles.more}><summary>ارتباط آسمان امروز و چارت شخصی</summary>
          <R3ApprovedInlineParagraphs page="sky" sectionTitle="این داده‌ها را چگونه به زندگی خودت ربط بدهی؟"/>
        </details>
      </section>
      <section className={styles.reading}>
        <span className={styles.kicker}>پرسش‌های رایج</span><h2>پرسش‌های رایج دربارهٔ آسمان امروز</h2>
        <details className={styles.more}><summary>آیا آسترولوژی امروز همان فال روزانه است؟</summary><p>فال روزانه برای یک نشان متن عمومی دارد؛ این صفحه موقعیت‌های محاسبه‌شده، فاز ماه و زاویه‌ها را نشان می‌دهد.</p></details>
        <details className={styles.more}><summary>ساعت رویدادها برای کدام شهر است؟</summary><p>ساعت‌های رصد براساس منطقهٔ زمانی {city} نمایش داده می‌شوند.</p></details>
        <details className={styles.more}><summary>فاز ماه امروز چگونه محاسبه می‌شود؟</summary><p>فاز و درصد روشنایی از زاویهٔ محاسبه‌شدهٔ ماه و خورشید به دست می‌آید.</p></details>
      </section>
      <section className={styles.cta}>
        <span>از آسمان عمومی تا نقشهٔ شخصی</span><h2>آسمان امروز را کنار چارت تولدت بخوان</h2>
        <p>تاریخ، ساعت و شهر تولدت را وارد کن و نقشهٔ شخصی آسمانت را ببین.</p>
        <Link href="/chart">ساخت چارت تولد ←</Link>
      </section>
    </div>
    <footer className={styles.footer}>HALLEUS SKY · داده‌های محاسبه‌شده با موتور هالیوس · پیش‌نمایش فقط در محیط توسعه</footer>
    {selectedPlanet ? <div className={styles.sheetBackdrop} onClick={() => setPlanet(null)}>
      <section role="dialog" aria-modal="true" aria-label={"جایگاه "+SKY_BODY_LABELS[selectedPlanet.body]}
        className={styles.sheet} onClick={event => event.stopPropagation()}>
        <button type="button" className={styles.sheetClose} onClick={()=>setPlanet(null)} aria-label="بستن">×</button>
        <div className={styles.sheetGlyph}>{SKY_BODY_SYMBOLS[selectedPlanet.body]}</div>
        <h2>{SKY_BODY_LABELS[selectedPlanet.body]}</h2>
        <p>{SKY_SIGN_LABELS[selectedPlanet.sign]} · {selectedPlanet.degreeInSign.toLocaleString("fa-IR",{maximumFractionDigits:2})} درجه</p>
        <dl><div><dt>طول دایرةالبروجی</dt><dd>{selectedPlanet.longitude.toLocaleString("fa-IR",{maximumFractionDigits:3})}°</dd></div>
        <div><dt>جهت حرکت</dt><dd>{SKY_MOTION_LABELS[selectedPlanet.motion]}</dd></div></dl>
        <p>{reading.planetReadings[selectedPlanet.body]}</p>
      </section>
    </div> : null}
  </div>;
}
