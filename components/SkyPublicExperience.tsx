import Link from "next/link";
import type { CSSProperties } from "react";
import { SkyCityPicker } from "@/components/SkyCityPicker";
import { SkyPublicWheel } from "@/components/SkyPublicWheel";
import type { SkyPublicDeliveryResult } from "@/lib/sky-public/sky-public-delivery";
import type { SkyDailyAspect, SkyDailySnapshot, SkyDailyTimelineEvent, SkyDailyZodiacSign } from "@/lib/sky-daily/sky-daily-contract";
import { SKY_ASPECT_LABELS, SKY_BODY_LABELS, SKY_BODY_SYMBOLS, SKY_MOTION_LABELS, SKY_SIGN_ENGLISH_LABELS, SKY_SIGN_LABELS } from "@/lib/sky-public/sky-public-labels";
import {
  buildSkyPublicReportInterpretation,
  skyPublicAspectKey,
} from "@/lib/sky-public/sky-public-report-interpretation";
import styles from "@/app/sky/sky.module.css";

const INITIAL_ASPECT_COUNT = 3;
const HERO_ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;
const SKY_SIGN_ORDER = Object.keys(SKY_SIGN_LABELS) as SkyDailyZodiacSign[];

function formatPersianDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: timezone, dateStyle: "full" }).format(new Date(`${value}T12:00:00Z`));
}

function formatGregorianDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", { timeZone: timezone, year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

function formatTime(value: string | undefined, timezone: string) {
  return value ? new Intl.DateTimeFormat("fa-IR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "زمان دقیق ثبت نشده";
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
    personalLine: `این خوانش را روی روز خودت امتحان کن: اگر امروز در کار، رابطه یا تصمیم‌هایت ${focus} پررنگ شد، اول دلیلش را ببین و بعد واکنش بده.`,
    moonReason: moon ? `ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} است؛ یعنی بدن، حس و واکنش‌های سریع با لحن ${SKY_SIGN_LABELS[moon.sign]} بالا می‌آیند. اگر چیزی ناگهانی در دلت نشست، همان لحظه حکم نده؛ اول ببین نیاز واقعی‌ات چیست.` : "جایگاه ماه برای این روز ثبت نشده، پس خوانش احساسی با احتیاط بیشتری نمایش داده می‌شود.",
    aspectReason: mainAspect ? `زاویهٔ اصلی امروز ${SKY_ASPECT_LABELS[mainAspect.kind]} میان ${SKY_BODY_LABELS[mainAspect.leftBody]} و ${SKY_BODY_LABELS[mainAspect.rightBody]} است. از همین‌جا می‌فهمیم روز برای حرکت نرم‌تر است یا برای مکث، بازبینی و مراقبت از حرف‌های تند.` : "زاویهٔ برجسته‌ای برای امروز ثبت نشده، پس خوانش سریع بیشتر از جایگاه ماه و وضعیت حرکت سیاره‌ها ساخته شده است.",
    motionReason: retrogrades.length ? `${retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join(" و ")} برگشتی‌اند؛ یعنی مرور، اصلاح و دوباره‌دیدن بعضی تصمیم‌ها می‌تواند از فشار برای نتیجهٔ فوری مفیدتر باشد.` : "امروز سیارهٔ برگشتی فعالی در داده ثبت نشده؛ پس تاکید صفحه بیشتر روی فاز ماه و زاویه‌های روز است.",
    nextEvent: nextEvent ? `${eventText(nextEvent)}${"occurredAt" in nextEvent && nextEvent.occurredAt ? ` · ${formatTime(nextEvent.occurredAt, timezone)}` : ""}` : "رویداد بعدی مهمی تا پایان روز ثبت نشده",
  };
}

function signDistance(from: SkyDailyZodiacSign, to: SkyDailyZodiacSign) {
  const fromIndex = SKY_SIGN_ORDER.indexOf(from);
  const toIndex = SKY_SIGN_ORDER.indexOf(to);
  return (toIndex - fromIndex + SKY_SIGN_ORDER.length) % SKY_SIGN_ORDER.length;
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

function AspectCard({ aspect, timezone, reading }: { aspect: SkyDailyAspect; timezone: string; reading: string | undefined }) {
  return <article><strong>{SKY_BODY_LABELS[aspect.leftBody]} و {SKY_BODY_LABELS[aspect.rightBody]}</strong><span>{SKY_ASPECT_LABELS[aspect.kind]} · اورب {aspect.orb.toLocaleString("fa-IR", { maximumFractionDigits: 2 })} درجه</span><small>{aspect.phase === "applying" ? "در حال نزدیک‌شدن" : aspect.phase === "separating" ? "در حال دورشدن" : "دقیق"}{aspect.exactAt ? ` · زمان دقیق ${formatTime(aspect.exactAt, timezone)}` : ""}</small>{reading ? <p className={styles.engineCardReading}>{reading}</p> : null}</article>;
}

function moonPhaseLabel(snapshot: SkyDailySnapshot) {
  if (!snapshot.moonPhase) return "فاز ثبت نشده";
  return ({ new: "ماه نو", waxing: "ماه افزاینده", full: "ماه کامل", waning: "ماه کاهنده" } as const)[snapshot.moonPhase.phase];
}

function markerStyle(longitude: number | undefined) {
  return { "--marker-angle": `${longitude ?? 0}deg` } as CSSProperties;
}

export function SkyHeroLive({ result }: { result: SkyPublicDeliveryResult }) {
  if (result.status !== "ready") {
    return <div className={styles.liveHeroCard}>
      <span className={styles.liveHeroLabel}>داده زنده امروز</span>
      <strong>آسمان انتخاب‌شده آماده نیست</strong>
      <small>وقتی دادهٔ معتبر این روز آماده باشد، جایگاه ماه، فاز ماه و رویداد بعدی همین‌جا نمایش داده می‌شود.</small>
    </div>;
  }

  const { snapshot } = result;
  const moon = snapshot.planetaryStates.find((item) => item.body === "moon");
  const sun = snapshot.planetaryStates.find((item) => item.body === "sun");
  const mainAspect = snapshot.aspects[0];

  return <div className={styles.liveHeroCard} data-sky-live-hero="moon-sun-aspect">
    <div
      className={styles.liveHeroSky}
      aria-label={moon ? `ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} ${SKY_SIGN_ENGLISH_LABELS[moon.sign]}` : "نمایش زنده جایگاه ماه و خورشید"}
      role="img"
    >
      <div className={styles.liveHeroEarth}>زمین</div>
      {sun ? <span className={styles.liveHeroMarker} data-body="sun" style={markerStyle(sun.longitude)}><i>{SKY_BODY_SYMBOLS.sun}</i></span> : null}
      {moon ? <span className={styles.liveHeroMarker} data-body="moon" style={markerStyle(moon.longitude)}><i>{SKY_BODY_SYMBOLS.moon}</i></span> : null}
      {mainAspect ? <span className={styles.liveHeroAspectLine} style={markerStyle(snapshot.planetaryStates.find((item) => item.body === mainAspect.leftBody)?.longitude)} /> : null}
    </div>
  </div>;
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

export function SkyPublicExperience({ result, cityQuery, relatedArticles = [], embedded = false, showControls = true }: { result: SkyPublicDeliveryResult; cityQuery?: string; relatedArticles?: Array<{ slug: string; title: string }>; embedded?: boolean; showControls?: boolean }) {
  const controlCity = result.city ?? { id: cityQuery ?? "tehran", faName: cityQuery ?? "تهران", provinceFaName: "" };

  return <div className={styles.shell}>
    {embedded ? null : <SkyHero />}
    {showControls ? <form className={styles.controls} method="get" action="/sky">
      <SkyCityPicker initialCity={controlCity}/>
      <label><span>تاریخ</span><input type="date" name="date" defaultValue={result.currentLocalDate ?? result.requestedDate ?? ""}/></label>
      <button type="submit">نمایش آسمان</button>
      {result.requestedDate && result.city ? <p className={styles.selectedDateNote}>آسمان {result.city.faName} برای {formatPersianDate(result.requestedDate, result.city.timezone)}، برابر با {formatGregorianDate(result.requestedDate, result.city.timezone)}</p> : null}
    </form> : null}
    {result.status !== "ready" ? <section className={styles.state} role="status"><span>داده در دسترس نیست</span><h2>{result.message}</h2>{result.requestedDate && result.city ? <p>روز درخواستی: {formatPersianDate(result.requestedDate, result.city.timezone)} برابر با {formatGregorianDate(result.requestedDate, result.city.timezone)}. هالیوس فقط دادهٔ معتبر و ذخیره‌شده را نمایش می‌دهد و برای پرکردن آرشیو، آسمان روز دیگری را جایگزین نمی‌کند.</p> : <p>هیچ دادهٔ ساختگی یا دادهٔ روز دیگری نمایش داده نشده است.</p>}<Link href={`/sky?city=${encodeURIComponent(result.city?.id ?? "tehran")}`}>بازگشت به آسمان امروز</Link></section> : <ReadyExperience result={result} relatedArticles={relatedArticles}/>}
  </div>;
}

function ReadyExperience({ result, relatedArticles }: { result: Extract<SkyPublicDeliveryResult, { status: "ready" }>; relatedArticles: Array<{ slug: string; title: string }> }) {
  const { snapshot, city } = result;
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
  const dailyGuide = buildHumanDailyGuide(snapshot, city.timezone, now);
  const signGuides = SKY_SIGN_ORDER.map((sign) => ({ sign, ...buildSignGuide(sign, snapshot) }));

  return <>
    <section className={styles.dailyBrief} data-interpretation-source={reportInterpretation.source}>
      <div className={styles.dailyBriefMain}>
        <span className={styles.eyebrow}>خواندن سریع امروز</span>
        <h2>امروز برای تو از کجا شروع می‌شود؟</h2>
        <p>{dailyGuide.tone}</p>
        <p>{dailyGuide.personalLine}</p>
      </div>
      <div className={styles.dailySignals} aria-label="خلاصه کاربردی آسمان امروز">
        <div><span>تمرکز روز</span><strong>{dailyGuide.focus}</strong></div>
        <div><span>پیشنهاد کوتاه</span><strong>{dailyGuide.action}</strong></div>
        <div><span>اتفاق بعدی آسمان</span><strong>{dailyGuide.nextEvent}</strong></div>
      </div>
      <div className={styles.dailyReasons} aria-label="دلیل خوانش سریع امروز">
        <article><span>دلیل احساسی</span><p>{dailyGuide.moonReason}</p></article>
        <article><span>دلیل رفتاری</span><p>{dailyGuide.aspectReason}</p></article>
        <article><span>ریتم تصمیم‌گیری</span><p>{dailyGuide.motionReason}</p></article>
      </div>
    </section>

    <section className={styles.contentSection} data-interpretation-source={reportInterpretation.source}>
      <header>
        <span className={styles.eyebrow}>برای نشان تو</span>
        <h2>ترنزیت‌های امروز برای هر نشان</h2>
        <p className={styles.sectionIntro}>نشان خودت را پیدا کن و ببین ریتم امروز بیشتر کجای روزت را لمس می‌کند. این بخش حکم قطعی نمی‌دهد، اما می‌گوید چرا ممکن است در رابطه، کار یا تصمیم‌هایت حال‌وهوای خاصی پررنگ‌تر شود.</p>
      </header>
      <div className={styles.signGuideGrid}>
        {signGuides.map((guide) => (
          <article className={styles.signGuideCard} key={guide.sign}>
            <div className={styles.signGuideTitle}><strong>{SKY_SIGN_LABELS[guide.sign]}</strong><small>{SKY_SIGN_ENGLISH_LABELS[guide.sign]}</small></div>
            <p>{guide.tone}</p>
            <small>{guide.reason}</small>
          </article>
        ))}
      </div>
    </section>

    <section className={styles.skyDetailsPanel}>
      <section className={styles.contentSection} aria-labelledby="sky-today-at-a-glance">
        <header>
          <span className={styles.eyebrow}>در یک نگاه</span>
          <h2 id="sky-today-at-a-glance">داده‌های سریع امروز</h2>
          <p className={styles.sectionIntro}>{buildDailySummary(snapshot, city.timezone, now)}</p>
        </header>
        <div className={styles.summaryGrid}>
          <article><span>ماه امروز</span><strong>{moon ? SKY_SIGN_LABELS[moon.sign] : "ثبت نشده"}</strong><small>{moon ? `${SKY_SIGN_ENGLISH_LABELS[moon.sign]} · ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه` : "داده موجود نیست"}</small></article>
          <article><span>فاز ماه</span><strong>{moonPhaseLabel(snapshot)}</strong><small>{snapshot.moonPhase ? `${(snapshot.moonPhase.illuminationFraction * 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} درصد روشنایی` : "داده موجود نیست"}</small></article>
          <article><span>رویداد بعدی</span><strong>{nextEvent ? formatTime("occurredAt" in nextEvent ? nextEvent.occurredAt : undefined, city.timezone) : "رویدادی برای امروز نداریم"}</strong><small>{nextEvent ? eventText(nextEvent) : "تا پایان این روز"}</small></article>
          <article><span>سیارات برگشتی امروز</span><strong>{retrogrades.length.toLocaleString("fa-IR")}</strong><small>{retrogrades.length ? retrogrades.map((item) => SKY_BODY_LABELS[item.body]).join("، ") : "هیچ سیاره‌ای برگشتی نیست"}</small></article>
        </div>
      </section>

      <SkyPublicWheel snapshot={snapshot}/>

      <section className={styles.contentSection} data-interpretation-source={reportInterpretation.source}>
        <header>
          <span className={styles.eyebrow}>جایگاه‌ها</span>
          <h2>وضعیت سیارات امروز</h2>
          <p className={styles.sectionIntro}>اینجا فقط نمی‌گوییم هر سیاره کجاست؛ می‌گوییم امروز آن جایگاه در کار، رابطه، پول، انرژی یا تصمیم‌گیری چه کاربردی دارد و کجا باید احتیاط کنی.</p>
        </header>
        <div className={styles.planetGrid}>
          {snapshot.planetaryStates.map((state) => (
            <details className={styles.planetItem} key={state.body} open>
              <summary className={styles.planetSummary}>
                <span className={styles.planetIdentity}>
                  <strong>{SKY_BODY_SYMBOLS[state.body]} {SKY_BODY_LABELS[state.body]}</strong>
                  <small>{SKY_MOTION_LABELS[state.motion]}{state.nearStation ? " · نزدیک تغییر جهت" : ""}</small>
                </span>
                <span className={styles.planetPosition}>{SKY_SIGN_LABELS[state.sign]} · {SKY_SIGN_ENGLISH_LABELS[state.sign]}، {state.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} درجه</span>
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
          <p>{moon ? `ماه امروز در ${SKY_SIGN_LABELS[moon.sign]} (${SKY_SIGN_ENGLISH_LABELS[moon.sign]}) و درجهٔ ${moon.degreeInSign.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} قرار دارد.` : "جایگاه ماه ثبت نشده است"}</p>
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
          <p className={styles.sectionIntro}>این زاویه‌ها می‌گویند امروز کدام نیروها با هم راه می‌آیند و کجا ممکن است فشار، سوءبرداشت یا تصمیم عجولانه بالا بیاید. عدد اورب یعنی فاصله تا حالت دقیق؛ هرچه کمتر باشد، اثر آن در خوانش امروز جدی‌تر است.</p>
        </header>
        {snapshot.aspects.length ? <>
          <div className={styles.aspectList}>{initialAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div>
          {remainingAspects.length ? <div className={styles.remainingAspects}><h3>{remainingAspects.length.toLocaleString("fa-IR")} زاویهٔ دیگر امروز</h3><div className={styles.aspectList}>{remainingAspects.map((aspect) => <AspectCard key={`${aspect.leftBody}-${aspect.rightBody}-${aspect.kind}`} aspect={aspect} timezone={city.timezone} reading={reportInterpretation.aspectReadings[skyPublicAspectKey(aspect)]}/>)}</div></div> : null}
        </> : <p className={styles.empty}>زاویهٔ مهمی در محدودهٔ معتبر امروز ثبت نشده است.</p>}
      </section>

      <section className={styles.contentSection}>
        <header><span className={styles.eyebrow}>به ترتیب زمان</span><h2>رویدادهای نجومی امروز</h2><p className={styles.sectionIntro}>خط زمانی امروز نشان می‌دهد چه رویدادی گذشته و چه چیزی تا پایان روز پیش رو است.</p></header>
        {snapshot.timeline.length ? <ol className={styles.timeline}>{snapshot.timeline.map((event, index) => { const occurredAt = "occurredAt" in event ? event.occurredAt : undefined; const isPast = occurredAt ? new Date(occurredAt).getTime() < now : false; return <li key={`${event.type}-${index}`} data-state={occurredAt ? (isPast ? "past" : "future") : "untimed"}><time>{formatTime(occurredAt, city.timezone)}</time><span>{eventText(event)}</span><small>{occurredAt ? (isPast ? "گذشته" : "پیش رو") : "بدون زمان دقیق"}</small></li>; })}</ol> : <p className={styles.empty}>رویدادی برای این روز نداریم.</p>}
      </section>

      {snapshot.qualityFlags.length ? <section className={styles.quality} role="status"><h2>یک نکته دربارهٔ ساعت‌ها</h2><p>ساعت بعضی رویدادها تقریبی است.</p></section> : null}
    </section>

    <section className={styles.contentSection}>
      <header><span className={styles.eyebrow}>راهنمای کوتاه</span><h2>این داده‌ها را چگونه بخوانم؟</h2></header>
      <div className={styles.aspectList}><details open><summary>ترنزیت چیست؟</summary><p>ترنزیت به جایگاه و حرکت فعلی سیاره‌ها گفته می‌شود. این صفحه وضعیت عمومی روز را نشان می‌دهد؛ ارتباط فردی فقط با مقایسه با چارت تولد بررسی می‌شود.</p></details><details open><summary>چرا شهر و منطقه زمانی مهم‌اند؟</summary><p>تاریخ محلی و ساعت رویدادها به منطقه زمانی شهر وابسته‌اند و ممکن است برای دو شهر متفاوت نمایش داده شوند.</p></details><details open><summary>آیا حرکت برگشتی یعنی اتفاق بد؟</summary><p>خیر. رتروگراد یک وضعیت محاسباتی است و به‌تنهایی نتیجهٔ قطعی دربارهٔ زندگی فرد نمی‌دهد.</p></details></div>
    </section>

    {relatedArticles.length ? <section className={styles.contentSection}><header><span className={styles.eyebrow}>یادگیری بیشتر</span><h2>راهنماهای مرتبط ویکی</h2></header><div className={styles.relatedList}>{relatedArticles.map((article) => <Link href={`/wiki/${article.slug}`} key={article.slug}>{article.title}</Link>)}</div></section> : null}

    <section className={styles.contentSection}>
      <header><span className={styles.eyebrow}>پرسش‌های رایج</span><h2>دربارهٔ آسترولوژی امروز</h2></header>
      <div className={styles.aspectList}><details open><summary>آیا آسترولوژی امروز همان فال روزانه است؟</summary><p>خیر. این صفحه جایگاه واقعی سیارات، فاز ماه و زاویه‌های روز را نشان می‌دهد و اتفاق شخصی را پیش‌بینی نمی‌کند.</p></details><details open><summary>وضعیت سیارات امروز برای کدام شهر نمایش داده می‌شود؟</summary><p>ساعت رویدادها براساس شهر و منطقهٔ زمانی انتخاب‌شده نمایش داده می‌شود.</p></details><details open><summary>فاز ماه امروز چگونه محاسبه می‌شود؟</summary><p>فاز و درصد روشنایی ماه از دادهٔ محاسبه‌شدهٔ همان تاریخ به دست می‌آید و از روز دیگری جایگزین نمی‌شود.</p></details><details open><summary>چرا بعضی روزها داده نمایش داده نمی‌شود؟</summary><p>اگر دادهٔ معتبر موجود نباشد، هالیوس روز دیگری یا نتیجهٔ تخمینی را جایگزین نمی‌کند.</p></details></div>
    </section>

    <section className={styles.cta}><div><span className={styles.eyebrow}>چارت شخصی</span><h2>می‌خواهی ارتباط این آسمان را با چارت تولدت ببینی؟</h2><p>تاریخ، ساعت و شهر تولدت را وارد کن تا چارت شخصی خودت را ببینی.</p></div><Link href="/chart">ساخت چارت تولد</Link></section>
  </>;
}
