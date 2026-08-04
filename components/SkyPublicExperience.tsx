import Link from "next/link";
import type { CSSProperties } from "react";
import { SkyCityPicker } from "@/components/SkyCityPicker";
import { SkyPublicWheel } from "@/components/SkyPublicWheel";
import type { SkyPublicDeliveryResult } from "@/lib/sky-public/sky-public-delivery";
import type { SkyDailyAspect, SkyDailySnapshot, SkyDailyTimelineEvent } from "@/lib/sky-daily/sky-daily-contract";
import { SKY_ASPECT_LABELS, SKY_BODY_LABELS, SKY_BODY_SYMBOLS, SKY_MOTION_LABELS, SKY_SIGN_LABELS } from "@/lib/sky-public/sky-public-labels";
import {
  buildSkyPublicReportInterpretation,
  skyPublicAspectKey,
} from "@/lib/sky-public/sky-public-report-interpretation";
import styles from "@/app/sky/sky.module.css";

const INITIAL_ASPECT_COUNT = 6;
const HERO_ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;

function formatPersianDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: timezone, dateStyle: "full" }).format(new Date(`${value}T12:00:00Z`));
}

function formatGregorianDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { timeZone: timezone, year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

function formatTime(value: string | undefined, timezone: string) {
  return value ? new Intl.DateTimeFormat("fa-IR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "زمان دقیق ثبت نشده";
}

function addDay(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dateHref(date: string, city: string) {
  return `/sky/${date}?city=${encodeURIComponent(city)}`;
}

function eventText(event: SkyDailyTimelineEvent) {
  if (event.type === "ingress") return `${SKY_BODY_LABELS[event.body]} وارد ${SKY_SIGN_LABELS[event.toSign]} می‌شود`;
  if (event.type === "station") return `${SKY_BODY_LABELS[event.body]} تغییر جهت می‌دهد`;
  return `${SKY_BODY_LABELS[event.aspect.leftBody]} و ${SKY_BODY_LABELS[event.aspect.rightBody]} به زاویهٔ ${SKY_ASPECT_LABELS[event.aspect.kind]} می‌رسند`;
}

function buildDailySummary(snapshot: SkyDailySnapshot, timezone: string, referenceTime: number) {
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const nextEvent = snapshot.timeline.find((event) => "occurredAt" in event && event.occurredAt && new Date(event.occurredAt).getTime() >= referenceTime) ?? snapshot.timeline[0];
  const retrogrades = snapshot.planetaryStates.filter((item) => item.motion === "retrograde");
  const parts = [moon ? `ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} و درجهٔ ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} است.` : "امروز جایگاه ماه را نداریم."];

  if (nextEvent) {
    const occurredAt = "occurredAt" in nextEvent ? nextEvent.occurredAt : undefined;
    parts.push(`رویداد بعدی: ${eventText(nextEvent)}${occurredAt ? `؛ ساعت ${formatTime(occurredAt, timezone)}.` : "."}`);
  }
  if (retrogrades.length) parts.push(`${retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join(" و ")} امروز برگشتی‌اند.`);
  return parts.join(" ");
}

function AspectCard({ aspect, timezone, reading }: { aspect: SkyDailyAspect; timezone: string; reading: string | undefined }) {
  return <article><strong>{SKY_BODY_LABELS[aspect.leftBody]} و {SKY_BODY_LABELS[aspect.rightBody]}</strong><span>{SKY_ASPECT_LABELS[aspect.kind]} · اورب {aspect.orb.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} درجه</span><small>{aspect.phase === "applying" ? "در حال نزدیک‌شدن" : aspect.phase === "separating" ? "در حال دورشدن" : "دقیق"}{aspect.exactAt ? ` · زمان دقیق ${formatTime(aspect.exactAt, timezone)}` : ""}</small>{reading ? <p className={styles.engineCardReading}>{reading}</p> : null}</article>;
}

function SkyHero() {
  return <header className={styles.hero}>
    <div className={styles.heroGlow} aria-hidden="true" />
    <div className={styles.heroContent}>
      <h1>آسترولوژی امروز؛ وضعیت ماه، سیارات و ترنزیت‌ها</h1>
      <p>ببین امروز سیاره‌ها کجا هستند، ماه در چه نشانی قرار دارد و چه زاویه‌هایی در آسمان شکل گرفته‌اند. این صفحه دادهٔ محاسبه‌شده را نشان می‌دهد؛ نه فال روزانه یا پیش‌بینی قطعی.</p>
    </div>
    <div className={styles.heroVisual} aria-hidden="true">
      <div className={styles.heroOrbit}>
        {HERO_ZODIAC_SYMBOLS.map((symbol, index) => (
          <span
            key={symbol}
            style={{
              "--sky-angle": `${index * 30}deg`,
              "--sky-counter-angle": `${index * -30}deg`,
            } as CSSProperties}
          >{symbol}</span>
        ))}
        <div><strong>هالیوس</strong><small>آسمان امروز</small></div>
      </div>
    </div>
  </header>;
}

export function SkyPublicExperience({ result, cityQuery, relatedArticles = [], embedded = false }: { result: SkyPublicDeliveryResult; cityQuery?: string; relatedArticles?: Array<{ slug: string; title: string }>; embedded?: boolean }) {
  const controlCity = result.city ?? { id: cityQuery ?? "tehran", faName: cityQuery ?? "تهران", provinceFaName: "" };

  return <div className={styles.shell}>
    {embedded ? null : <SkyHero />}
    <form className={styles.controls} method="get" action="/sky"><SkyCityPicker initialCity={controlCity}/><label><span>تاریخ</span><input type="date" name="date" defaultValue={result.currentLocalDate ?? result.requestedDate ?? ""}/></label><button type="submit">نمایش آسمان</button></form>
    {result.status !== "ready" ? <section className={styles.state} role="status"><span>داده در دسترس نیست</span><h2>{result.message}</h2>{result.requestedDate && result.city ? <p>روز درخواستی: {formatPersianDate(result.requestedDate, result.city.timezone)} برابر با {formatGregorianDate(result.requestedDate, result.city.timezone)}. هالیوس فقط دادهٔ معتبر و ذخیره‌شده را نمایش می‌دهد و برای پرکردن آرشیو، آسمان روز دیگری را جایگزین نمی‌کند.</p> : <p>هیچ دادهٔ ساختگی یا دادهٔ روز دیگری نمایش داده نشده است.</p>}<Link href={`/sky?city=${encodeURIComponent(result.city?.id ?? "tehran")}`}>بازگشت به آسمان امروز</Link></section> : <ReadyExperience result={result} relatedArticles={relatedArticles}/>}
  </div>;
}

function ReadyExperience({ result, relatedArticles }: { result: Extract<SkyPublicDeliveryResult, { status: "ready" }>; relatedArticles: Array<{ slug: string; title: string }> }) {
  const { snapshot, city, requestedDate } = result;
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const moonEvents = snapshot.timeline.filter((event) => event.type === "ingress" && event.body === "moon");
  const initialAspects = snapshot.aspects.slice(0, INITIAL_ASPECT_COUNT);
  const remainingAspects = snapshot.aspects.slice(INITIAL_ASPECT_COUNT);
  const now = new Date(result.viewedAt).getTime();
  const reportInterpretation = buildSkyPublicReportInterpretation(snapshot);

  return <>
    <nav className={styles.dateNav} aria-label="جابه‌جایی میان روزها"><Link href={dateHref(addDay(requestedDate, -1), city.id)}>روز قبل</Link><strong>{formatPersianDate(requestedDate, city.timezone)}</strong><Link href={dateHref(addDay(requestedDate, 1), city.id)}>روز بعد</Link></nav>
    <section className={styles.dayCard}><div><h2>{formatPersianDate(requestedDate, city.timezone)}</h2><p className={styles.gregorianDate}>{formatGregorianDate(requestedDate, city.timezone)}</p><p>{city.faName}، {city.provinceFaName}</p></div></section>
    <section className={styles.notice} data-interpretation-source={reportInterpretation.source}><span className={styles.eyebrow}>خلاصهٔ روز</span><h2>مهم‌ترین داده‌های امروز</h2><p>{buildDailySummary(snapshot, city.timezone, now)}</p>{reportInterpretation.summary ? <p className={styles.engineReading}>{reportInterpretation.summary}</p> : null}</section>
    <SkyPublicWheel snapshot={snapshot}/>
    <section data-interpretation-source={reportInterpretation.source}><header><span className={styles.eyebrow}>جایگاه‌ها</span><h2>وضعیت سیاره‌ها</h2><p className={styles.sectionIntro}>اینجا می‌بینی هر سیاره در کدام نشان و درجه است و مستقیم حرکت می‌کند یا برگشتی.</p></header><div className={styles.planetGrid}>{snapshot.planetaryStates.map((state) => <article key={state.body}><strong>{SKY_BODY_SYMBOLS[state.body]} {SKY_BODY_LABELS[state.body]}</strong><span>{SKY_SIGN_LABELS[state.sign]}، {state.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه</span><small>{SKY_MOTION_LABELS[state.motion]}{state.nearStation ? " · نزدیک تغییر جهت" : ""}</small><p className={styles.engineCardReading}>{reportInterpretation.planetReadings[state.body]}</p></article>)}</div></section>
    <section className={styles.moonCard}><div><span className={styles.eyebrow}>ماه امروز</span><h2>{snapshot.moonPhase ? ({new:"ماه نو",waxing:"افزاینده",full:"ماه کامل",waning:"کاهنده"} as const)[snapshot.moonPhase.phase] : "فاز ثبت نشده"}</h2><p>{moon ? `${SKY_SIGN_LABELS[moon.sign]}، ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه` : "جایگاه ماه ثبت نشده است"}</p></div><dl><div><dt>روشنایی</dt><dd>{snapshot.moonPhase ? `${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد` : "ثبت نشده"}</dd></div><div><dt>حرکت</dt><dd>{moon ? SKY_MOTION_LABELS[moon.motion] : "ثبت نشده"}</dd></div><div><dt>رویداد ماه</dt><dd>{moonEvents[0] ? `${eventText(moonEvents[0])} در ${formatTime(moonEvents[0].occurredAt, city.timezone)}` : "تغییر نشان ثبت نشده"}</dd></div></dl></section>
    <section data-interpretation-source={reportInterpretation.source}><header><span className={styles.eyebrow}>روابط آسمان</span><h2>زاویه‌های مهم روز</h2><p className={styles.sectionIntro}>این‌ها مهم‌ترین رابطه‌های امروز میان سیاره‌ها هستند. عدد کنار هر زاویه نشان می‌دهد چقدر به حالت دقیق نزدیک است؛ هرچه کمتر، دقیق‌تر.</p></header>{snapshot.aspects.length ? <><div className={styles.aspectList}>{initialAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div>{remainingAspects.length ? <details className={styles.moreAspects}><summary>نمایش {remainingAspects.length.toLocaleString("fa-IR")} زاویهٔ دیگر</summary><div className={styles.aspectList}>{remainingAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div></details> : null}</> : <p className={styles.empty}>زاویهٔ مهمی در محدودهٔ معتبر امروز ثبت نشده است.</p>}</section>
    <section><header><span className={styles.eyebrow}>به ترتیب زمان</span><h2>خط زمانی روز</h2><p className={styles.sectionIntro}>رویدادهای امروز را به ترتیب ساعت می‌بینی.</p></header>{snapshot.timeline.length ? <ol className={styles.timeline}>{snapshot.timeline.map((event, index) => { const occurredAt = "occurredAt" in event ? event.occurredAt : undefined; const isPast = occurredAt ? new Date(occurredAt).getTime() < now : false; return <li key={`${event.type}-${index}`} data-state={occurredAt ? (isPast ? "past" : "future") : "untimed"}><time>{formatTime(occurredAt, city.timezone)}</time><span>{eventText(event)}</span><small>{occurredAt ? (isPast ? "گذشته" : "پیش رو") : "بدون زمان دقیق"}</small></li>; })}</ol> : <p className={styles.empty}>رویداد مهمی برای این روز نداریم.</p>}</section>
    {snapshot.qualityFlags.length ? <section className={styles.quality} role="status"><h2>یک نکته دربارهٔ ساعت‌ها</h2><p>ساعت بعضی رویدادها تقریبی است.</p></section> : null}
    <section><header><span className={styles.eyebrow}>راهنمای کوتاه</span><h2>این داده‌ها را چگونه بخوانم؟</h2></header><div className={styles.aspectList}><details><summary>ترنزیت چیست؟</summary><p>ترنزیت به جایگاه و حرکت فعلی سیاره‌ها گفته می‌شود. این صفحه وضعیت عمومی روز را نشان می‌دهد؛ ارتباط فردی فقط با مقایسه با چارت تولد بررسی می‌شود.</p></details><details><summary>چرا شهر و منطقه زمانی مهم‌اند؟</summary><p>تاریخ محلی و ساعت رویدادها به منطقه زمانی شهر وابسته‌اند و ممکن است برای دو شهر متفاوت نمایش داده شوند.</p></details><details><summary>آیا حرکت برگشتی یعنی اتفاق بد؟</summary><p>خیر. رتروگراد یک وضعیت محاسباتی است و به‌تنهایی نتیجهٔ قطعی دربارهٔ زندگی فرد نمی‌دهد.</p></details></div></section>
    {relatedArticles.length ? <section><header><span className={styles.eyebrow}>یادگیری بیشتر</span><h2>راهنماهای مرتبط ویکی</h2></header><div className={styles.aspectList}>{relatedArticles.map((article) => <article key={article.slug}><Link href={`/wiki/${article.slug}`}>{article.title}</Link></article>)}</div></section> : null}
    <section><header><span className={styles.eyebrow}>پرسش‌های رایج</span><h2>دربارهٔ آسمان امروز</h2></header><div className={styles.aspectList}><details><summary>آیا این صفحه فال روزانه است؟</summary><p>خیر. دادهٔ واقعی جایگاه‌ها، حرکت‌ها، فاز ماه و جنبه‌ها را نمایش می‌دهد و وقوع اتفاق شخصی را تضمین نمی‌کند.</p></details><details><summary>ساعت رویدادها برای کدام شهر است؟</summary><p>برای شهر انتخاب‌شده و منطقه زمانی همان شهر.</p></details><details><summary>چرا بعضی روزها داده نمایش داده نمی‌شود؟</summary><p>اگر دادهٔ معتبر موجود نباشد، هالیوس روز دیگری یا نتیجهٔ تخمینی را جایگزین نمی‌کند.</p></details></div></section>
    <section className={styles.cta}><h2>می‌خواهی ارتباط این آسمان را با چارت تولدت ببینی؟</h2><p>تاریخ، ساعت و شهر تولدت را وارد کن تا چارت شخصی خودت را ببینی.</p><Link href="/chart">ساخت چارت تولد</Link></section>
  </>;
}
