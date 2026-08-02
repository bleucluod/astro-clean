const signOrder = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

const signStarts = Object.fromEntries(signOrder.map((sign, index) => [sign, index * 30]));

const signNames = {
  aries: ["حمل", "Aries", "♈"],
  taurus: ["ثور", "Taurus", "♉"],
  gemini: ["جوزا", "Gemini", "♊"],
  cancer: ["سرطان", "Cancer", "♋"],
  leo: ["اسد", "Leo", "♌"],
  virgo: ["سنبله", "Virgo", "♍"],
  libra: ["میزان", "Libra", "♎"],
  scorpio: ["عقرب", "Scorpio", "♏"],
  sagittarius: ["قوس", "Sagittarius", "♐"],
  capricorn: ["جدی", "Capricorn", "♑"],
  aquarius: ["دلو", "Aquarius", "♒"],
  pisces: ["حوت", "Pisces", "♓"],
};

const planetLabels = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

function zodiacSign(key) {
  const [faName, enName, symbol] = signNames[key];
  return { key, faName, enName, symbol };
}

function placement(id, signId, degreeInSign, house) {
  return {
    id,
    label: planetLabels[id],
    signId,
    degreeInSign,
    longitude: signStarts[signId] + degreeInSign,
    house,
    method: "report-product-fixture",
  };
}

function makeAngle(id, label, longitude, ascendantLongitude, source, reliability) {
  const normalized = normalizeLongitude(longitude);
  const ascSign = signOrder[Math.floor(normalizeLongitude(ascendantLongitude) / 30) % 12];
  const signId = signOrder[Math.floor(normalized / 30) % 12];

  return {
    id,
    label,
    longitude: normalized,
    signId,
    degreeInSign: normalized % 30,
    method: "report-product-fixture",
    source,
    reliability,
    house: getWholeSignHouseNumber(signId, ascSign),
    limitation: null,
  };
}

function makeAngles(ascendantLongitude) {
  return {
    asc: makeAngle("asc", "ASC / رایزینگ", ascendantLongitude, ascendantLongitude, "calculated", "calculated"),
    dsc: makeAngle("dsc", "DSC / نقطه روبه‌رو", ascendantLongitude + 180, ascendantLongitude, "derived-opposition", "derived"),
    mc: makeAngle("mc", "MC / میانه آسمان", ascendantLongitude + 92, ascendantLongitude, "calculated", "calculated"),
    ic: makeAngle("ic", "IC / ریشه آسمان", ascendantLongitude + 272, ascendantLongitude, "derived-opposition", "derived"),
  };
}

function makeWholeSignHouses(ascendantLongitude, placements, angles) {
  const ascSign = signOrder[Math.floor(normalizeLongitude(ascendantLongitude) / 30) % 12];
  const ascSignIndex = signOrder.indexOf(ascSign);

  return Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const signId = signOrder[(ascSignIndex + index) % 12];
    const angleIds = Object.values(angles)
      .filter((angle) => getWholeSignHouseNumber(angle.signId, ascSign) === number)
      .map((angle) => angle.id);

    return {
      number,
      signId,
      cuspLongitude: signStarts[signId],
      degreeInSign: 0,
      system: "whole-sign",
      method: "whole-sign-from-ascendant",
      reliability: "calculated",
      planetIds: placements.filter((item) => item.house === number).map((item) => item.id),
      angleIds,
      limitation: null,
    };
  });
}

function makeAspect(firstPlanetId, aspectId, secondPlanetId, orb, index) {
  const angleByAspect = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };
  const glyphByAspect = {
    conjunction: "☌",
    sextile: "⚹",
    square: "□",
    trine: "△",
    opposition: "☍",
  };
  const labelByAspect = {
    conjunction: "هم‌نشینی",
    sextile: "تسدیس",
    square: "مربع",
    trine: "تثلیث",
    opposition: "مقابله",
  };
  const angle = angleByAspect[aspectId];

  return {
    id: `${firstPlanetId}-${aspectId}-${secondPlanetId}-${index}`,
    firstPlanetId,
    firstPlanetLabel: planetLabels[firstPlanetId],
    secondPlanetId,
    secondPlanetLabel: planetLabels[secondPlanetId],
    aspectId,
    aspectLabel: labelByAspect[aspectId],
    glyph: glyphByAspect[aspectId],
    angle,
    separation: Math.max(0, angle - orb),
    orb,
    meaning: "این جنبه یک الگوی محاسبه‌شده در fixture گزارش است.",
    narrative: "این متن روایی فقط برای اطمینان از حذف روایت از جدول فنی fixture ساخته شده است.",
  };
}

function makeBaseReport(id, name, input, chart) {
  return {
    id,
    createdAt: "2026-08-02T08:00:00.000Z",
    input: { name, ...input },
    chart: {
      sunSign: zodiacSign(chart.sun),
      moonSign: zodiacSign(chart.moon),
      risingSign: zodiacSign(chart.rising),
    },
    summary: "پیش‌نمایش قدیمی که نباید مالک خروجی نهایی باشد.",
    interpretations: ["متن قدیمی که نباید در مسیر اصلی دوباره نمایش داده شود."],
    safetyNote: "این گزارش برای خودشناسی و تأمل است و جایگزین تصمیم پزشکی، حقوقی یا مالی نیست.",
  };
}

function makeSnapshot({
  cityLabel,
  utcIso,
  ascendantLongitude,
  placements,
  aspects = [],
  withNodes = true,
  withLilith = true,
  includeHouses = true,
  includeAngles = true,
}) {
  const angles = includeAngles ? makeAngles(ascendantLongitude) : undefined;
  const houses = includeHouses && angles
    ? makeWholeSignHouses(ascendantLongitude, placements, angles)
    : [];
  const northNode = {
    id: "north-node",
    label: "دست شمالی ماه",
    longitude: 15,
    signId: "aries",
    degreeInSign: 15,
    house: includeHouses ? 1 : null,
    method: "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
    source: "calculated",
    reliability: "calculated",
    limitation: null,
  };
  const southNode = {
    ...northNode,
    id: "south-node",
    label: "دست جنوبی ماه",
    longitude: 195,
    signId: "libra",
    house: includeHouses ? 7 : null,
    source: "derived-opposition",
  };

  return {
    version: "real-engine-preview-v2",
    generatedAt: "2026-08-02T08:00:00.000Z",
    cityLabel,
    utcIso,
    ascendantLongitude,
    houseSystem: includeHouses ? "whole-sign" : "placidus",
    houseContext: {
      requestedSystem: "placidus",
      appliedSystem: includeHouses ? "whole-sign" : "placidus",
      availability: includeHouses ? "ready" : "unavailable",
      unavailableReason: includeHouses ? null : "non-convergence",
      confidence: includeHouses ? "provided-cusps" : "placeholder",
      ascendantMethod: includeAngles ? "provided" : "unknown",
      ascendantLongitude: includeAngles ? ascendantLongitude : null,
      firstHouseCuspLongitude: includeAngles ? ascendantLongitude : 0,
      cuspLongitudes: includeHouses ? houses.map((house) => house.cuspLongitude) : null,
      calculationMethod: "report-product-fixture",
      limitation: includeHouses ? null : "ساعت تولد یا خانه‌ها در این fixture در دسترس نیستند.",
    },
    houses,
    ...(angles ? { angles } : {}),
    calculationQuality: {
      status: includeHouses ? "partial" : "blocked",
      houseSystemStatus: includeHouses ? "calculated" : "not-calculated",
      anglesStatus: includeAngles ? "calculated" : "not-calculated",
      retrogradeStatus: "calculated",
      nodesStatus: withNodes ? "calculated" : "not-calculated",
      lilithStatus: withLilith ? "calculated" : "not-calculated",
      limitations: includeHouses
        ? ["fixture گزارش؛ خانه‌ها فقط برای QA رابط خواندن هستند."]
        : ["ساعت تولد نامشخص است؛ خانه‌ها و محورهای زمانی حذف شده‌اند."],
      warnings: [],
    },
    retrogrades: {
      status: "calculated",
      method: "report-product-fixture",
      planetIds: ["mars"],
      limitation: null,
    },
    lunarNodes: withNodes
      ? {
          status: "calculated",
          method: "astronomy-engine-geomoonstate-instantaneous-orbital-plane-ecliptic-of-date",
          nodeType: "local-true-osculating",
          northNode,
          southNode,
          limitation: null,
        }
      : { status: "not-calculated", method: "lunar-nodes", limitation: "fixture بدون دست‌های ماه" },
    lilith: withLilith
      ? {
          status: "calculated",
          id: "black-moon-lilith",
          label: "Local True/Osculating Black Moon Lilith",
          longitude: 222,
          signId: "scorpio",
          degreeInSign: 12,
          house: includeHouses ? 8 : null,
          method: "local-osculating-black-moon-lilith-from-validated-probe",
          modelId: "true-osculating-black-moon-lilith",
          lilithType: "local-true-osculating-black-moon-lilith",
          source: "astronomy-engine-geomoonstate-local-state-vector",
          reliability: "calculated",
          approvedForReportOutput: true,
          validationStatus: "independent-reference-fixtures-passed",
          validationReference: "swiss-ephemeris-2.10.03-offline-osculating-apogee",
          validationToleranceDegrees: 0.25,
          limitation: null,
        }
      : { status: "not-calculated", method: "black-moon-lilith", limitation: "fixture بدون لیلیت" },
    placements,
    aspects,
    aspectHighlights: aspects.slice(0, 5),
    note: "fixture رفتاری Batch 1 گزارش کامل تولد",
  };
}

function attachTransit(report) {
  return {
    ...report,
    engineData: {
      personalTransitReportData: {
        version: "v0.1.254-personal-transit-report-data-bridge",
        status: "ready",
        source: "natal-to-transit-calculation-probe",
        sourceProbeVersion: "v0.1.253-natal-to-transit-calculation-probe",
        reportDataPath: "engineData.personalTransitReportData",
        stage: "visible-report-section",
        userVisible: true,
        reportDataBridgeApproval: true,
        visibleReportSectionApproval: true,
        currentResidenceRequired: true,
        noSilentTehranDefaultForPersonalTransit: true,
        publicLabel: "آسمان ثبت‌شده هنگام ساخت گزارش",
        seoPhrases: [],
        transitLocalDate: "2026-08-02",
        sampleLocalTime: "12:00",
        currentResidenceUtcIso: "2026-08-02T08:30:00.000Z",
        location: {
          birthPlaceName: report.input.birthCity,
          birthTimezone: report.input.birthTimezone,
          currentResidencePlaceName: "استانبول",
          currentResidenceTimezone: "Europe/Istanbul",
          currentResidenceRequired: true,
          noSilentTehranDefaultForPersonalTransit: true,
        },
        aspectHighlights: [
          {
            id: "transit-sun-trine-natal-moon",
            aspect: "trine",
            transitBody: "sun",
            natalBody: "moon",
            orb: 1.2,
            orbLimit: 6,
            summaryKey: "fixture",
          },
        ],
        limitations: ["این داده فقط snapshot زمان ساخت گزارش است."],
        notes: ["برای QA جداسازی natal و transit"],
        nextMilestone: "post-v0.1.288-personal-transit-refresh",
      },
    },
  };
}

const aradPlacements = [
  placement("sun", "aquarius", 11.2, 5),
  placement("moon", "taurus", 19.1, 8),
  placement("mercury", "aquarius", 8.5, 5),
  placement("venus", "capricorn", 27.4, 5),
  placement("mars", "leo", 15.7, 1),
  placement("jupiter", "aquarius", 6.9, 5),
  placement("saturn", "aquarius", 16.4, 7),
  placement("uranus", "capricorn", 17.2, 5),
  placement("neptune", "capricorn", 18.3, 4),
  placement("pluto", "scorpio", 22.5, 3),
];

const denseAspects = [
  ["mars", "opposition", "saturn", 0.68],
  ["mercury", "conjunction", "uranus", 0.79],
  ["saturn", "sextile", "uranus", 0.92],
  ["mercury", "trine", "mars", 1.03],
  ["mercury", "conjunction", "jupiter", 1.2],
  ["jupiter", "sextile", "pluto", 0.25],
  ["uranus", "sextile", "pluto", 0.41],
  ["jupiter", "conjunction", "uranus", 1.99],
  ["moon", "square", "venus", 3.79],
  ["sun", "square", "moon", 4.1],
  ["sun", "conjunction", "venus", 4.8],
  ["sun", "conjunction", "jupiter", 5.1],
  ["sun", "conjunction", "uranus", 5.9],
  ["mercury", "conjunction", "venus", 6.59],
  ["venus", "trine", "mars", 2.3],
  ["venus", "sextile", "pluto", 2.7],
  ["mars", "trine", "jupiter", 1.8],
  ["mars", "trine", "uranus", 2.2],
  ["moon", "trine", "neptune", 2.9],
  ["saturn", "trine", "pluto", 3.2],
  ["jupiter", "sextile", "saturn", 4],
].map((item, index) => makeAspect(item[0], item[1], item[2], item[3], index));

const aradBase = makeBaseReport(
  "fixture-arad",
  "آراد",
  {
    birthDate: "1991-01-31",
    birthTime: "08:45",
    birthCity: "تهران",
    birthCountry: "ایران",
    birthTimezone: "Asia/Tehran",
  },
  { sun: "aquarius", moon: "taurus", rising: "leo" },
);

const aradSnapshot = makeSnapshot({
  cityLabel: "تهران، ایران",
  utcIso: "1991-01-31T05:15:00.000Z",
  ascendantLongitude: 135,
  placements: aradPlacements,
  aspects: denseAspects,
});

const halehPlacements = [
  placement("sun", "cancer", 5.1, 10),
  placement("moon", "sagittarius", 12.3, 3),
  placement("mercury", "gemini", 28.5, 9),
  placement("venus", "leo", 2.2, 11),
  placement("mars", "virgo", 17.8, 12),
  placement("jupiter", "pisces", 9.4, 6),
  placement("saturn", "aries", 21.1, 7),
  placement("uranus", "aquarius", 8.2, 5),
  placement("neptune", "capricorn", 27.7, 4),
  placement("pluto", "sagittarius", 1.1, 2),
];

const halehAspects = [
  makeAspect("sun", "opposition", "neptune", 2.6, 1),
  makeAspect("moon", "trine", "venus", 1.2, 2),
  makeAspect("mercury", "square", "mars", 1.8, 3),
  makeAspect("venus", "trine", "saturn", 3.1, 4),
  makeAspect("jupiter", "sextile", "neptune", 1.7, 5),
  makeAspect("uranus", "sextile", "pluto", 2.9, 6),
];

const halehBase = makeBaseReport(
  "fixture-haleh",
  "هاله",
  {
    birthDate: "1996-06-26",
    birthTime: "16:10",
    birthCity: "شیراز",
    birthCountry: "ایران",
    birthTimezone: "Asia/Tehran",
  },
  { sun: "cancer", moon: "sagittarius", rising: "libra" },
);

const halehSnapshot = makeSnapshot({
  cityLabel: "شیراز، ایران",
  utcIso: "1996-06-26T12:40:00.000Z",
  ascendantLongitude: 195,
  placements: halehPlacements,
  aspects: halehAspects,
  withLilith: false,
});

const unknownTimeBase = makeBaseReport(
  "fixture-unknown-time",
  "نمونه بدون ساعت",
  {
    birthDate: "1988-10-10",
    birthTime: "unknown",
    birthCity: "رشت",
    birthCountry: "ایران",
    birthTimezone: "Asia/Tehran",
  },
  { sun: "libra", moon: "scorpio", rising: "libra" },
);

const unknownTimeSnapshot = makeSnapshot({
  cityLabel: "رشت، ایران",
  utcIso: "1988-10-10T12:00:00.000Z",
  ascendantLongitude: 180,
  placements: [
    placement("sun", "libra", 17, null),
    placement("moon", "scorpio", 3, null),
    placement("mercury", "libra", 8, null),
    placement("venus", "virgo", 24, null),
    placement("mars", "pisces", 11, null),
  ],
  aspects: [makeAspect("sun", "conjunction", "mercury", 1.1, 1)],
  withNodes: false,
  withLilith: false,
  includeHouses: false,
  includeAngles: false,
});

const legacyReport = makeBaseReport(
  "fixture-legacy",
  "نسخه قدیمی",
  {
    birthDate: "1980-03-12",
    birthTime: "09:00",
    birthCity: "اهواز",
    birthCountry: "ایران",
  },
  { sun: "pisces", moon: "capricorn", rising: "gemini" },
);

export const reportProductFixtures = {
  arad: { report: aradBase, snapshot: aradSnapshot },
  differentChart: { report: halehBase, snapshot: halehSnapshot },
  unknownTime: { report: unknownTimeBase, snapshot: unknownTimeSnapshot },
  legacy: { report: legacyReport, snapshot: null },
  noTransit: { report: halehBase, snapshot: halehSnapshot },
  dense: { report: attachTransit(aradBase), snapshot: aradSnapshot },
};

function getWholeSignHouseNumber(signId, ascSignId) {
  const signIndex = signOrder.indexOf(signId);
  const ascIndex = signOrder.indexOf(ascSignId);
  return ((signIndex - ascIndex + 12) % 12) + 1;
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}
