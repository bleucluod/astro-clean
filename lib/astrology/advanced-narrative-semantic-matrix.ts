export const ADVANCED_NARRATIVE_SEMANTIC_MATRIX_VERSION =
  "deep-narrative-advanced-aspect-matrix-v1-20260902" as const;
// HALLEUS_DEEP_NARRATIVE_SLICE3_ADVANCED_SEMANTIC_MATRIX_R1_20260902

export const ADVANCED_NARRATIVE_BODY_IDS = [
  "ceres", "pallas", "juno", "vesta", "chiron", "eris", "pholus", "nessus",
] as const;
export const ADVANCED_NARRATIVE_ASPECT_IDS = [
  "conjunction", "sextile", "square", "trine", "opposition",
] as const;
export type AdvancedNarrativeBodyId = (typeof ADVANCED_NARRATIVE_BODY_IDS)[number];
export type AdvancedNarrativeAspectId = (typeof ADVANCED_NARRATIVE_ASPECT_IDS)[number];

export type AdvancedNarrativeSemanticRule = {
  semanticKey: string;
  bodyId: AdvancedNarrativeBodyId;
  aspectId: AdvancedNarrativeAspectId;
  thesis: string;
  constructiveExpression: string;
  frictionExpression: string;
  safeThemes: string[];
};

type BodyMeaning = { label: string; function: string; strength: string; friction: string; themes: string[] };
const BODIES: Record<AdvancedNarrativeBodyId, BodyMeaning> = {
  ceres: { label: "سرس", function: "مراقبت، دریافت حمایت و چرخهٔ نزدیک‌شدن و جداشدن", strength: "مراقبتی که نیاز واقعی را می‌بیند و مرز را هم نگه می‌دارد", friction: "مراقبت بیش از حد، دشواری دریافت کمک یا یکی گرفتن محبت با همیشه در دسترس بودن", themes: ["care","nurture","support","separation"] },
  pallas: { label: "پالاس", function: "تشخیص الگو، راهبرد و هوش حل مسئله", strength: "دیدن ساختار مسئله و پیدا کردن راهی هوشمندانه و قابل اجرا", friction: "فاصله گرفتن از احساس برای حل مسئله یا اعتماد بیش از حد به الگوی ذهنی", themes: ["strategy","pattern","problem-solving"] },
  juno: { label: "جونو", function: "تعهد، برابری، وفاداری و انتظار در پیوند بلندمدت", strength: "تعهدی که شروط، نقش‌ها و برابری را روشن می‌کند", friction: "سخت شدن انتظار، حساب‌گری رابطه‌ای یا ماندن در قرارداد مبهم", themes: ["commitment","partnership","equality","loyalty"] },
  vesta: { label: "وستا", function: "تمرکز، وقف شدن و نگه داشتن آتش یک کار یا مأموریت", strength: "تمرکز عمیق و توان حفظ توجه در زمان", friction: "تنگ شدن جهان به یک وظیفه یا سوختن از تمرکز بی‌وقفه", themes: ["focus","devotion","mission"] },
  chiron: { label: "کایران", function: "حساسیت ماندگار و امکان ساختن مهارت ترمیم و مراقبت از همان نقطه", strength: "شناخت حساسیت بدون تعریف کردن تمام هویت با آن و تبدیل تجربه به مهارت مراقبت", friction: "حساس شدن بیش از حد به نشانهٔ ردشدن یا ساختن نتیجهٔ قطعی از یک نقطهٔ دردناک", themes: ["sensitivity","repair","healing","value"] },
  eris: { label: "اریس (Eris)", function: "اختلاف، حذف‌شدن، رقابت و صدایی که نظم موجود را به چالش می‌کشد", strength: "جرئت نام بردن از چیزی که در جمع یا ساختار نادیده مانده", friction: "شخصی کردن هر اختلاف یا نگه داشتن موقعیت فقط از راه تعارض", themes: ["discord","inclusion","competition","voice"] },
  pholus: { label: "فولوس", function: "محرک کوچک، زنجیرهٔ واکنش و نقطه‌ای که پیامد بزرگ‌تری را باز می‌کند", strength: "دیدن نقطهٔ شروع زنجیره و انتخاب آگاهانه پیش از بزرگ شدن پیامد", friction: "تبدیل یک محرک کوچک به واکنش زنجیره‌ای بدون مکث", themes: ["catalyst","chain-reaction","turning-point"] },
  nessus: { label: "نسوس", function: "مرز، قدرت، پاسخگویی و جایی که یک چرخهٔ آسیب‌زننده می‌تواند متوقف شود", strength: "پاسخگویی، مرزبندی و متوقف کردن الگوی تکراری بدون فرافکنی", friction: "تکرار کشمکش قدرت یا عبور از مرز بدون پذیرفتن سهم و پیامد", themes: ["boundaries","power","accountability","cycle"] },
};

const DYNAMICS: Record<AdvancedNarrativeAspectId, { verb: string; strength: string; friction: string }> = {
  conjunction: { verb: "مستقیماً با موضوع اصلی تماس یکی می‌شود و صدایش را بلندتر می‌کند", strength: "یکپارچه و قابل مشاهده", friction: "مرز دو موضوع ممکن است محو شود" },
  sextile: { verb: "یک مسیر همکاری فراهم می‌کند که با انتخاب آگاهانه فعال می‌شود", strength: "به منبع حمایتی تبدیل می‌شود", friction: "اگر استفاده نشود در حد امکان خام می‌ماند" },
  square: { verb: "با موضوع اصلی اصطکاک می‌سازد و آن را به مسئله‌ای برای حل کردن تبدیل می‌کند", strength: "از راه تمرین به مهارت تبدیل می‌شود", friction: "می‌تواند به واکنش تکرارشونده تبدیل شود" },
  trine: { verb: "طبیعی‌تر با موضوع اصلی جریان پیدا می‌کند و اصطکاک کمتری دارد", strength: "به توان قابل اتکا تبدیل می‌شود", friction: "ممکن است آن‌قدر عادی باشد که نادیده بماند" },
  opposition: { verb: "در سوی مقابل موضوع اصلی می‌ایستد و یک محور برای مذاکره می‌سازد", strength: "با دیدن هر دو قطب پخته‌تر می‌شود", friction: "ممکن است یک قطب به دیگری فرافکنی شود" },
};

export const ADVANCED_NARRATIVE_SEMANTIC_MATRIX: Readonly<Record<string, AdvancedNarrativeSemanticRule>> = (() => {
  const rows: Record<string, AdvancedNarrativeSemanticRule> = {};
  for (const bodyId of ADVANCED_NARRATIVE_BODY_IDS) {
    const body = BODIES[bodyId];
    for (const aspectId of ADVANCED_NARRATIVE_ASPECT_IDS) {
      const dynamic = DYNAMICS[aspectId];
      const semanticKey = `${bodyId}:${aspectId}`;
      rows[semanticKey] = {
        semanticKey,
        bodyId,
        aspectId,
        thesis: `${body.label} در این تماس، ${body.function} را وارد داستان می‌کند و ${dynamic.verb}`,
        constructiveExpression: `${body.strength}؛ در این هندسه ${dynamic.strength}`,
        frictionExpression: `${body.friction}؛ زیر فشار ${dynamic.friction}`,
        safeThemes: [...body.themes],
      };
    }
  }
  return Object.freeze(rows);
})();

export function getAdvancedNarrativeSemanticRule(bodyId: string, aspectId: string): AdvancedNarrativeSemanticRule | null {
  if (!(ADVANCED_NARRATIVE_BODY_IDS as readonly string[]).includes(bodyId)) return null;
  if (!(ADVANCED_NARRATIVE_ASPECT_IDS as readonly string[]).includes(aspectId)) return null;
  return ADVANCED_NARRATIVE_SEMANTIC_MATRIX[`${bodyId}:${aspectId}`] ?? null;
}

export function synthesizeTargetedAdvancedCombination(bodyIds: string[]): { key: string; thesis: string; constructiveExpression: string; frictionExpression: string } | null {
  const ids = new Set(bodyIds.filter((id) => (ADVANCED_NARRATIVE_BODY_IDS as readonly string[]).includes(id)));
  if (ids.has("ceres") && ids.has("juno") && ids.has("chiron")) {
    return {
      key: "ceres+juno+chiron",
      thesis: "مراقبت، تعهد و حساسیت در یک داستان واحد به هم می‌رسند: پیوند وقتی امن‌تر می‌شود که کمک کردن، قرارداد رابطه و نقطهٔ حساس هر دو طرف هم‌زمان قابل گفت‌وگو باشند",
      constructiveExpression: "وفاداری همراه با مراقبت و توان ترمیم، بدون اینکه یکی از طرفین برای نگه داشتن رابطه خودش را حذف کند",
      frictionExpression: "کمک کردن می‌تواند جای گفتن نیاز را بگیرد یا حساسیت قدیمی به معیار وفاداری تبدیل شود",
    };
  }
  if (ids.has("juno") && ids.has("chiron")) return { key: "juno+chiron", thesis: "تعهد مستقیماً به نقطهٔ حساس رابطه وصل می‌شود؛ قرارداد خوب باید امنیت و آسیب‌پذیری را هم در خود جا بدهد", constructiveExpression: "تعهدی که درباره نیاز، ترس و ترمیم صریح است", frictionExpression: "ترس از ردشدن می‌تواند توقع یا آزمون وفاداری را سخت‌تر کند" };
  if (ids.has("ceres") && ids.has("juno")) return { key: "ceres+juno", thesis: "مراقبت و تعهد به هم گره می‌خورند؛ کیفیت رابطه فقط با ماندن سنجیده نمی‌شود، با نوع حمایت هم سنجیده می‌شود", constructiveExpression: "تعهدی که مراقبت را دوطرفه و قابل درخواست می‌کند", frictionExpression: "یکی گرفتن وفاداری با همیشه مراقبت کردن یا همیشه در دسترس بودن" };
  if (ids.has("ceres") && ids.has("chiron")) return { key: "ceres+chiron", thesis: "مراقبت به نقطهٔ حساس قدیمی نزدیک می‌شود؛ دریافت و دادن حمایت می‌تواند هم محرک باشد هم مسیر ترمیم", constructiveExpression: "حمایت مشخص و مرزبندی‌شده که حساسیت را می‌بیند اما آن را هویت کامل نمی‌کند", frictionExpression: "کمک افراطی، دشواری دریافت کمک یا واکنش زیاد به نشانهٔ بی‌توجهی" };
  return null;
}

export function getAdvancedNarrativeMatrixCounts() {
  return { bodies: 8, aspectForms: 5, semanticRules: Object.keys(ADVANCED_NARRATIVE_SEMANTIC_MATRIX).length, targetedCombinations: 4 } as const;
}
