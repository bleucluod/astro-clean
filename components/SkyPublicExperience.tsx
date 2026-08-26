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

const INITIAL_ASPECT_COUNT = 3;
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

function moonPhaseLabel(snapshot: SkyDailySnapshot) {
  if (!snapshot.moonPhase) return "فاز ثبت نشده";
  return ({ new: "ماه نو", waxing: "ماه افزاینده", full: "ماه کامل", waning: "ماه کاهنده" } as const)[snapshot.moonPhase.phase];
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
  const retrogrades = snapshot.planetaryStates.filter((item) => item.motion === "retrograde");
  const upcomingMoonEvent = moonEvents.find((event) => event.occurredAt && new Date(event.occurredAt).getTime() >= now);
  const futureEvents = snapshot.timeline.filter((event) => {
    const occurredAt = "occurredAt" in event ? event.occurredAt : undefined;
    return occurredAt && new Date(occurredAt).getTime() >= now;
  });
  const nextEvent = futureEvents[0];

  return <>
    <section className={styles.dayCard}>
      <div className={styles.dayMeta}>
        <span className={styles.eyebrow}>آسمان انتخاب‌شده</span>
        <h2>{formatPersianDate(requestedDate, city.timezone)}</h2>
        <p><span className={styles.gregorianDate}>{formatGregorianDate(requestedDate, city.timezone)}</span><span aria-hidden="true"> · </span>{city.faName}، {city.provinceFaName}</p>
      </div>
      <nav className={styles.dateNav} aria-label="جابه‌جایی میان روزها">
        <Link href={dateHref(addDay(requestedDate, -1), city.id)}>روز قبل</Link>
        <Link href={dateHref(addDay(requestedDate, 1), city.id)}>روز بعد</Link>
      </nav>
    </section>

    <section className={styles.notice} data-interpretation-source={reportInterpretation.source}>
      <span className={styles.eyebrow}>خلاصهٔ روز</span>
      <h2>مهم‌ترین داده‌های امروز</h2>
      <p>{buildDailySummary(snapshot, city.timezone, now)}</p>
      {reportInterpretation.summary ? <p className={styles.engineReading}>{reportInterpretation.summary}</p> : null}
    </section>

    <section className={styles.contentSection} aria-labelledby="sky-today-at-a-glance">
      <header>
        <span className={styles.eyebrow}>در یک نگاه</span>
        <h2 id="sky-today-at-a-glance">امروز در آسمان چه خبر است؟</h2>
        <p className={styles.sectionIntro}>مهم‌ترین چیزهایی که برای بازدید روزانه تغییر می‌کنند، یک‌جا دیده می‌شوند.</p>
      </header>
      <div className={styles.summaryGrid}>
        <article><span>جایگاه ماه امروز</span><strong>{moon ? SKY_SIGN_LABELS[moon.sign] : "ثبت نشده"}</strong><small>{moon ? `${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه` : "داده موجود نیست"}</small></article>
        <article><span>فاز ماه امروز</span><strong>{moonPhaseLabel(snapshot)}</strong><small>{snapshot.moonPhase ? `${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد روشنایی` : "داده موجود نیست"}</small></article>
        <article><span>رویداد بعدی</span><strong>{nextEvent ? formatTime("occurredAt" in nextEvent ? nextEvent.occurredAt : undefined, city.timezone) : "رویدادی نمانده"}</strong><small>{nextEvent ? eventText(nextEvent) : "تا پایان این روز"}</small></article>
        <article><span>سیارات برگشتی امروز</span><strong>{retrogrades.length.toLocaleString("fa-IR")}</strong><small>{retrogrades.length ? retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join("، ") : "هیچ سیاره‌ای برگشتی نیست"}</small></article>
      </div>
    </section>

    <SkyPublicWheel snapshot={snapshot}/>

    <section className={styles.contentSection} data-interpretation-source={reportInterpretation.source}>
      <header>
        <span className={styles.eyebrow}>جایگاه‌ها</span>
        <h2>وضعیت سیارات امروز</h2>
        <p className={styles.sectionIntro}>موقعیت سیارات امروز نشان می‌دهد هر سیاره در کدام نشان و درجه است و مستقیم حرکت می‌کند یا برگشتی.</p>
      </header>
      <div className={styles.planetGrid}>
        {snapshot.planetaryStates.map((state) => (
          <details className={styles.planetItem} key={state.body}>
            <summary className={styles.planetSummary}>
              <span className={styles.planetIdentity}>
                <strong>{SKY_BODY_SYMBOLS[state.body]} {SKY_BODY_LABELS[state.body]}</strong>
                <small>{SKY_MOTION_LABELS[state.motion]}{state.nearStation ? " · نزدیک تغییر جهت" : ""}</small>
              </span>
              <span className={styles.planetPosition}>{SKY_SIGN_LABELS[state.sign]}، {state.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه</span>
            </summary>
            <p className={styles.engineCardReading}>{reportInterpretation.planetReadings[state.body]}</p>
          </details>
        ))}
      </div>
    </section>

    <section className={styles.moonCard}>
      <div>
        <span className={styles.eyebrow}>ماه امروز در چه برجی است؟</span>
        <h2>فاز ماه امروز</h2>
        <strong className={styles.moonPhaseName}>{moonPhaseLabel(snapshot)}</strong>
        <p>{moon ? `ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} و درجهٔ ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} قرار دارد.` : "جایگاه ماه ثبت نشده است"}</p>
      </div>
      <dl>
        <div><dt>روشنایی</dt><dd>{snapshot.moonPhase ? `${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد` : "ثبت نشده"}</dd></div>
        <div><dt>حرکت</dt><dd>{moon ? SKY_MOTION_LABELS[moon.motion] : "ثبت نشده"}</dd></div>
        <div><dt>رویداد بعدی ماه</dt><dd>{upcomingMoonEvent ? `${eventText(upcomingMoonEvent)} در ${formatTime(upcomingMoonEvent.occurredAt, city.timezone)}` : "تغییر نشان دیگری تا پایان روز ثبت نشده"}</dd></div>
      </dl>
    </section>

    <section className={styles.contentSection} data-interpretation-source={reportInterpretation.source}>
      <header>
        <span className={styles.eyebrow}>روابط آسمان</span>
        <h2>مهم‌ترین ترنزیت‌ها و زاویه‌های امروز</h2>
        <p className={styles.sectionIntro}>این‌ها مهم‌ترین رابطه‌های امروز میان سیاره‌ها هستند. عدد کنار هر زاویه نشان می‌دهد چقدر به حالت دقیق نزدیک است؛ هرچه کمتر، دقیق‌تر.</p>
      </header>
      {snapshot.aspects.length ? <>
        <div className={styles.aspectList}>{initialAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div>
        {remainingAspects.length ? <details className={styles.moreAspects}><summary>نمایش {remainingAspects.length.toLocaleString("fa-IR")} زاویهٔ دیگر</summary><div className={styles.aspectList}>{remainingAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div></details> : null}
      </> : <p className={styles.empty}>زاویهٔ مهمی در محدودهٔ معتبر امروز ثبت نشده است.</p>}
    </section>

    <section className={styles.contentSection}>
      <header><span className={styles.eyebrow}>به ترتیب زمان</span><h2>رویدادهای نجومی امروز</h2><p className={styles.sectionIntro}>خط زمانی امروز نشان می‌دهد چه رویدادی گذشته و چه چیزی تا پایان روز پیش رو است.</p></header>
      {snapshot.timeline.length ? <ol className={styles.timeline}>{snapshot.timeline.map((event, index) => { const occurredAt = "occurredAt" in event ? event.occurredAt : undefined; const isPast = occurredAt ? new Date(occurredAt).getTime() < now : false; return <li key={`${event.type}-${index}`} data-state={occurredAt ? (isPast ? "past" : "future") : "untimed"}><time>{formatTime(occurredAt, city.timezone)}</time><span>{eventText(event)}</span><small>{occurredAt ? (isPast ? "گذشته" : "پیش رو") : "بدون زمان دقیق"}</small></li>; })}</ol> : <p className={styles.empty}>رویداد مهمی برای این روز نداریم.</p>}
    </section>

    {snapshot.qualityFlags.length ? <section className={styles.quality} role="status"><h2>یک نکته دربارهٔ ساعت‌ها</h2><p>ساعت بعضی رویدادها تقریبی است.</p></section> : null}

    <section className={styles.contentSection}>
      <header><span className={styles.eyebrow}>راهنمای کوتاه</span><h2>این داده‌ها را چگونه بخوانم؟</h2></header>
      <div className={styles.aspectList}><details><summary>ترنزیت چیست؟</summary><p>ترنزیت به جایگاه و حرکت فعلی سیاره‌ها گفته می‌شود. این صفحه وضعیت عمومی روز را نشان می‌دهد؛ ارتباط فردی فقط با مقایسه با چارت تولد بررسی می‌شود.</p></details><details><summary>چرا شهر و منطقه زمانی مهم‌اند؟</summary><p>تاریخ محلی و ساعت رویدادها به منطقه زمانی شهر وابسته‌اند و ممکن است برای دو شهر متفاوت نمایش داده شوند.</p></details><details><summary>آیا حرکت برگشتی یعنی اتفاق بد؟</summary><p>خیر. رتروگراد یک وضعیت محاسباتی است و به‌تنهایی نتیجهٔ قطعی دربارهٔ زندگی فرد نمی‌دهد.</p></details></div>
    </section>

    {relatedArticles.length ? <section className={styles.contentSection}><header><span className={styles.eyebrow}>یادگیری بیشتر</span><h2>راهنماهای مرتبط ویکی</h2></header><div className={styles.relatedList}>{relatedArticles.map((article) => <Link href={`/wiki/${article.slug}`} key={article.slug}>{article.title}</Link>)}</div></section> : null}

    <section className={styles.contentSection}>
      <header><span className={styles.eyebrow}>پرسش‌های رایج</span><h2>دربارهٔ آسترولوژی امروز</h2></header>
      <div className={styles.aspectList}><details><summary>آیا آسترولوژی امروز همان فال روزانه است؟</summary><p>خیر. این صفحه جایگاه واقعی سیارات، فاز ماه و زاویه‌های روز را نشان می‌دهد و اتفاق شخصی را پیش‌بینی نمی‌کند.</p></details><details><summary>وضعیت سیارات امروز برای کدام شهر نمایش داده می‌شود؟</summary><p>ساعت رویدادها براساس شهر و منطقهٔ زمانی انتخاب‌شده نمایش داده می‌شود.</p></details><details><summary>فاز ماه امروز چگونه محاسبه می‌شود؟</summary><p>فاز و درصد روشنایی ماه از دادهٔ محاسبه‌شدهٔ همان تاریخ به دست می‌آید و از روز دیگری جایگزین نمی‌شود.</p></details><details><summary>چرا بعضی روزها داده نمایش داده نمی‌شود؟</summary><p>اگر دادهٔ معتبر موجود نباشد، هالیوس روز دیگری یا نتیجهٔ تخمینی را جایگزین نمی‌کند.</p></details></div>
    </section>

    <section className={styles.cta}><div><span className={styles.eyebrow}>چارت شخصی</span><h2>می‌خواهی ارتباط این آسمان را با چارت تولدت ببینی؟</h2><p>تاریخ، ساعت و شهر تولدت را وارد کن تا چارت شخصی خودت را ببینی.</p></div><Link href="/chart">ساخت چارت تولد</Link></section>
  </>;
}
