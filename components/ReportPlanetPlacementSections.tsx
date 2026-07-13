"use client";

import {
  buildPlacementBehavioralInterpretation,
  isBehavioralPlacementInput,
} from "@/lib/astrology/report-behavioral-interpretation";
import { formatZodiacLabel, zodiacSignFromLongitude } from "@/lib/astrology/zodiac-labels";
import type { AstrologyReport } from "@/types/astro";

type ReportPlanetPlacementSectionsProps = {
  report: AstrologyReport;
};

type PlanetPlacement = {
  id?: string | null;
  label?: string | null;
  signId?: string | null;
  sign?: string | null;
  zodiacSign?: string | null;
  longitude?: number | null;
  degreeInSign?: number | null;
  degree?: number | null;
  house?: number | null;
  houseNumber?: number | null;
};

const PLANET_ORDER = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const PLANET_LABELS_FA: Record<string, string> = {
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

export function ReportPlanetPlacementSections({
  report,
}: ReportPlanetPlacementSectionsProps) {
  const placements = getPlanetPlacements(report);
  const retrogradePlanetIds = new Set(
    report.realEngine?.retrogrades?.status === "calculated"
      ? report.realEngine.retrogrades.planetIds
      : [],
  );

  if (placements.length === 0) {
    return null;
  }

  return (
    <section
      className="report-section report-planet-placement-section"
      data-halleus-report-planet-placement-sections="v0.1.259"
      data-halleus-behavioral-placement-core="v0.1.314"
    >
      <div className="report-section-heading">
        <span className="section-label">موقعیت‌های سیاره‌ها</span>
        <h3>هر سیاره در زندگی واقعی چطور دیده می‌شود؟</h3>
        <p>
          هر کارت نقش سیاره، شیوهٔ بیان نشان و صحنهٔ زندگی خانه را با هم
          می‌خواند. خانه فقط یک برچسب نیست؛ مشخص می‌کند این الگو بیشتر در کدام
          تصمیم، رابطه یا رفتار روزمره دیده می‌شود.
        </p>
        <p
          className="report-muted-note"
          data-report-narrative-quality-pass="placement-bridge for-dummies"
        >
          آناتومی این بخش نمادین است، تشخیص پزشکی نیست و رابطهٔ علت‌ومعلولی
          دربارهٔ بدن یا سلامت مطرح نمی‌کند.
        </p>
      </div>

      <div className="report-placement-grid">
        {placements.map((placement) => {
          const interpretation =
            placement.signId &&
            isBehavioralPlacementInput(
              placement.id,
              placement.signId,
              placement.houseNumber,
            )
              ? buildPlacementBehavioralInterpretation({
                  planetId: placement.id,
                  signId: placement.signId,
                  houseNumber: placement.houseNumber,
                  retrograde: retrogradePlanetIds.has(placement.id),
                })
              : null;
          const title = `${placement.label} در ${placement.signLabel}`;

          return (
            <article
              className="mini-card report-planet-placement-card"
              key={placement.id}
            >
              <strong>{title}</strong>
              <span>
                {placement.houseLabel}
                {retrogradePlanetIds.has(placement.id) ? " · پس‌رو" : ""}
              </span>
              <p>
                {interpretation?.plainMeaning ??
                  "برای این جایگاه هنوز ترکیب کامل سیاره، نشان و خانه در دسترس نیست."}
              </p>
              <ul className="report-compact-list">
                <li>
                  <strong>ویژگی‌های روشن:</strong>{" "}
                  {interpretation?.healthyExpression ??
                    "ظرفیت رشد و انتخاب روشن‌تر"}
                </li>
                <li>
                  <strong>چالش‌ها:</strong>{" "}
                  {interpretation?.possibleFriction ??
                    "زیاده‌روی احتمالی یا الگوی تکرارشونده"}
                </li>
                <li>
                  <strong>علایق و کشش‌ها:</strong>{" "}
                  {interpretation?.focus ??
                    "شناخت بهتر نقش این جایگاه در چارت"}
                </li>
                <li>
                  <strong>در زندگی روزمره / مثال ساده:</strong>{" "}
                  {interpretation?.dailyLifeExample ??
                    "این کیفیت در تصمیم‌ها و رفتارهای کوچک قابل مشاهده است."}
                </li>
                <li>
                  <strong>آزمایش کوچک:</strong>{" "}
                  {interpretation?.smallExperiment ??
                    "یک نمونه واقعی از این الگو را در طول هفته یادداشت کن."}
                </li>
                <li>
                  <strong>آناتومی نمادین:</strong>{" "}
                  {interpretation?.symbolicBody ??
                    "این جایگاه فقط به‌عنوان یک استعارهٔ نمادین خوانده می‌شود."}
                </li>
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getPlanetPlacements(report: AstrologyReport) {
  const placements = (report.realEngine?.placements ?? []) as PlanetPlacement[];

  return placements
    .filter(
      (placement) =>
        placement.id && PLANET_ORDER.includes(placement.id),
    )
    .map((placement) => toPlanetPlacementView(placement))
    .filter(
      (
        placement,
      ): placement is NonNullable<
        ReturnType<typeof toPlanetPlacementView>
      > => placement !== null,
    )
    .sort(
      (first, second) =>
        PLANET_ORDER.indexOf(first.id) -
        PLANET_ORDER.indexOf(second.id),
    );
}

function toPlanetPlacementView(placement: PlanetPlacement) {
  if (!placement.id) {
    return null;
  }

  const signId = getSignId(placement);
  const signLabel = signId
    ? formatZodiacLabel(
        signId as Parameters<typeof formatZodiacLabel>[0],
      )
    : "نشان نامشخص";
  const label =
    PLANET_LABELS_FA[placement.id] ??
    placement.label ??
    placement.id;
  const houseNumber = getHouseNumber(placement);

  return {
    id: placement.id,
    label,
    signId,
    signLabel,
    houseNumber,
    houseLabel: houseNumber
      ? `خانه ${formatPersianNumber(houseNumber)}`
      : "خانه ثبت نشده",
  };
}

function getSignId(placement: PlanetPlacement) {
  if (
    typeof placement.signId === "string" &&
    placement.signId.length > 0
  ) {
    return placement.signId;
  }

  if (
    typeof placement.zodiacSign === "string" &&
    placement.zodiacSign.length > 0
  ) {
    return placement.zodiacSign;
  }

  if (
    typeof placement.sign === "string" &&
    placement.sign.length > 0
  ) {
    return placement.sign;
  }

  if (
    typeof placement.longitude === "number" &&
    Number.isFinite(placement.longitude)
  ) {
    return zodiacSignFromLongitude(placement.longitude);
  }

  return null;
}

function getHouseNumber(placement: PlanetPlacement) {
  if (
    typeof placement.houseNumber === "number" &&
    Number.isFinite(placement.houseNumber)
  ) {
    return placement.houseNumber;
  }

  if (
    typeof placement.house === "number" &&
    Number.isFinite(placement.house)
  ) {
    return placement.house;
  }

  return null;
}

function formatPersianNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
