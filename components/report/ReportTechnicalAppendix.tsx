"use client";

import { useState, type ReactNode } from "react";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import {
  buildTechnicalAspectRows,
  type LiveReportReadingContract,
} from "@/lib/report-output/live-report-reading-contract";
import { humanizeVisibleText } from "@/lib/report-output/human-first-report-reading";
import type {
  AstrologyReport,
  RealEngineReportAngle,
  RealEngineReportAspect,
  RealEngineReportHouse,
  RealEngineReportPlacement,
} from "@/types/astro";
import styles from "./human-first-report.module.css";

type AstrologyTab =
  | "engine"
  | "placements"
  | "houses"
  | "aspects"
  | "patterns"
  | "rulership"
  | "supplementary"
  | "axes"
  | "context";

const ASTROLOGY_TABS: Array<{ id: AstrologyTab; label: string }> = [
  // HALLEUS_FREE_ALL_ENGINE_OUTPUT_TAB_20260815
  { id: "engine", label: "خروجی کامل موتور" },
  { id: "placements", label: "جایگاه‌ها" },
  { id: "houses", label: "خانه‌ها" },
  { id: "aspects", label: "رابطه‌های زاویه‌ای" },
  { id: "patterns", label: "الگوها" },
  { id: "rulership", label: "حاکمیت‌ها" },
  { id: "supplementary", label: "نقاط تکمیلی" },
  { id: "axes", label: "محورهای اصلی" },
  { id: "context", label: "مبنای خوانش" },
];

const HOUSE_FIELD_LABELS: Record<number, string> = {
  1: "بدن، تصویر بیرونی و شروع",
  2: "ارزش، امنیت و منابع",
  3: "ذهن، یادگیری و ارتباط",
  4: "خانه، ریشه و امنیت درونی",
  5: "خلاقیت، عشق و بیان شخصی",
  6: "کار روزمره، بدن و مراقبت",
  7: "رابطه و شراکت",
  8: "اعتماد، صمیمیت و دگرگونی",
  9: "معنا، سفر و جهان‌بینی",
  10: "مسیر اجتماعی و اثر بیرونی",
  11: "دوستی‌ها، جمع‌ها و آینده",
  12: "خلوت، ناخودآگاه و رهاسازی",
};

const ANGLE_LABELS: Record<string, string> = {
  asc: "ASC / رایزینگ",
  dsc: "DSC / نقطهٔ روبه‌رو",
  mc: "MC / میانهٔ آسمان",
  ic: "IC / ریشهٔ آسمان",
};

export function ReportTechnicalAppendix({
  report,
  contract,
  exhaustive = false,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
  exhaustive?: boolean;
}) {
  const [activeTab, setActiveTab] =
    useState<AstrologyTab>(exhaustive ? "engine" : "placements");
  const chartData = report.realEngine;
  const placements = chartData?.placements ?? [];
  const houses = chartData?.houses ?? [];
  const aspects = chartData?.aspects ?? [];
  const angles = chartData?.angles ? Object.values(chartData.angles) : [];

  return (
    <section
      className={styles.technicalAppendix}
      data-report-technical-appendix="placements-houses-aspects-axes-method"
      data-human-first-technical-appendix="complete-astrology-details"
      aria-labelledby="report-astrology-details-title"
    >
      <details
        className={styles.technicalDisclosure}
        data-free-all-engine-output={exhaustive ? "all" : "configured"}
      >
        <summary className={styles.technicalHeading}>
          <span className={styles.eyebrow}>جزئیات نجومی</span>
          <h2 id="report-astrology-details-title">
            همهٔ جایگاه‌ها و زاویه‌ها در یک نگاه
          </h2>
          <p>
            اینجا همهٔ جایگاه‌ها، خانه‌ها، محورهای اصلی، جنبه‌ها و اورب‌ها را یک‌جا می‌بینی.
          </p>
        </summary>

        <div className={styles.technicalContent}>
          <div
            className={styles.technicalTabs}
            role="tablist"
            aria-label="جزئیات کامل چارت"
          >
            {ASTROLOGY_TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                data-active={activeTab === tab.id}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.technicalPanel} role="tabpanel">
            {activeTab === "engine" ? (
              <EngineOutputPanel report={report} />
            ) : null}
            {activeTab === "placements" ? (
              <PlacementTable placements={placements} />
            ) : null}
            {activeTab === "houses" ? (
              <HouseTable
                hasReliableBirthTime={contract.hasReliableBirthTime}
                houses={houses}
                houseAvailability={chartData?.houseContext?.availability}
                houseSystem={chartData?.houseSystem}
              />
            ) : null}
            {activeTab === "aspects" ? (
              <AspectTable aspects={aspects} />
            ) : null}
            {activeTab === "patterns" ? (
              <PatternTable patterns={contract.chartPatterns.patterns} />
            ) : null}
            {activeTab === "rulership" ? (
              <RulershipTable profile={contract.rulership} />
            ) : null}
            {activeTab === "supplementary" ? (
              <SupplementaryPointsTable profile={contract.supplementaryPoints} />
            ) : null}
            {activeTab === "axes" ? (
              <AxisTable
                angles={angles}
                hasReliableBirthTime={contract.hasReliableBirthTime}
              />
            ) : null}
            {activeTab === "context" ? (
              <ContextPanel contract={contract} report={report} />
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}


const ENGINE_PLANET_LABELS: Record<string, string> = {
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

function formatEngineList(values: readonly string[] | undefined) {
  if (!values?.length) return "هیچ‌کدام";
  return values.map((value) => ENGINE_PLANET_LABELS[value] ?? value).join("، ");
}

function formatEngineStatus(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value
    : "ثبت نشده";
}

function EngineOutputPanel({ report }: { report: AstrologyReport }) {
  const chartData = report.realEngine;
  if (!chartData) {
    return (
      <EmptyTechnicalState>
        {"خروجی محاسباتی موتور در این گزارش ذخیره نشده است."}
      </EmptyTechnicalState>
    );
  }

  // HALLEUS_FREE_ALL_ENGINE_UNION_NARROWING_R2_20260815
  const nodes =
    chartData.lunarNodes && "northNode" in chartData.lunarNodes
      ? chartData.lunarNodes
      : null;
  const lilith =
    chartData.lilith && "modelId" in chartData.lilith
      ? chartData.lilith
      : null;
  const signature = chartData.chartSignature;
  const quality = chartData.calculationQuality;
  const houseContext = chartData.houseContext;

  return (
    <div
      className={styles.contextPanel}
      data-technical-table="engine-output"
      data-engine-output-completeness="free-all"
    >
      <dl className={styles.contextFacts}>
        <div>
          <dt>{"زمان UTC تولد"}</dt>
          <dd>{chartData.utcIso}</dd>
        </div>
        <div>
          <dt>{"زمان ساخت"}</dt>
          <dd>{chartData.generatedAt}</dd>
        </div>
        <div>
          <dt>{"شهر محاسبه"}</dt>
          <dd>{chartData.cityLabel}</dd>
        </div>
        <div>
          <dt>{"تعداد جایگاه‌ها"}</dt>
          <dd>{formatPersianNumber(chartData.placements.length)}</dd>
        </div>
        <div>
          <dt>{"تعداد خانه‌ها"}</dt>
          <dd>{formatPersianNumber(chartData.houses?.length ?? 0)}</dd>
        </div>
        <div>
          <dt>{"تعداد جنبه‌ها"}</dt>
          <dd>{formatPersianNumber(chartData.aspects?.length ?? 0)}</dd>
        </div>
        <div>
          <dt>{"وضعیت محاسبه"}</dt>
          <dd>{formatEngineStatus(quality?.status)}</dd>
        </div>
      </dl>

      <div className={styles.evidenceList}>
        <h3>{"جایگاه‌های محاسبه‌شده"}</h3>
        {chartData.placements.map((placement) => (
          <div key={"engine-placement-" + placement.id}>
            <strong>
              {placement.label}{" · "}{formatZodiacLabel(placement.signId)}{" "}
              {formatDegree(placement.degreeInSign)}
            </strong>
            <span>
              {"longitude "}{formatDegree(placement.longitude)}
              {typeof placement.house === "number"
                ? " · خانه " + formatPersianNumber(placement.house)
                : ""}
              {placement.pointType ? " · " + placement.pointType : ""}
              {" · "}{placement.method}
              {placement.motion
                ? " · " + placement.motion.status +
                  " · " + formatPersianNumber(placement.motion.arcDegreesPerDay) +
                  "°/day · window " +
                  formatPersianNumber(placement.motion.sampleWindowHours) +
                  "h · " + placement.motion.method
                : ""}
            </span>
          </div>
        ))}
      </div>

      {chartData.angles ? (
        <div className={styles.evidenceList}>
          <h3>{"محورهای محاسبه‌شده"}</h3>
          {Object.values(chartData.angles).map((angle) => (
            <div key={"engine-angle-" + angle.id}>
              <strong>
                {ANGLE_LABELS[angle.id] ?? angle.label}{" · "}
                {formatZodiacLabel(angle.signId)}{" "}{formatDegree(angle.degreeInSign)}
              </strong>
              <span>
                {"longitude "}{formatDegree(angle.longitude)}{" · "}
                {angle.source}{" · "}{angle.reliability}{" · "}{angle.method}
                {angle.limitation ? " · " + angle.limitation : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {chartData.houses?.length ? (
        <div className={styles.evidenceList}>
          <h3>{"دوازده خانه و تخصیص‌ها"}</h3>
          {chartData.houses.map((house) => (
            <div key={"engine-house-" + house.number}>
              <strong>
                {"خانه "}{formatPersianNumber(house.number)}{" · "}
                {formatZodiacLabel(house.signId)}{" "}{formatDegree(house.degreeInSign)}
              </strong>
              <span>
                {"cusp "}{formatDegree(house.cuspLongitude)}{" · "}
                {house.system}{" · "}{house.method}{" · "}{house.reliability}
                {house.planetIds.length ? " · planets=" + house.planetIds.join(",") : ""}
                {house.angleIds.length ? " · angles=" + house.angleIds.join(",") : ""}
                {house.limitation ? " · " + house.limitation : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {chartData.aspects?.length ? (
        <div className={styles.evidenceList}>
          <h3>{"همه جنبه‌های محاسبه‌شده"}</h3>
          {chartData.aspects.map((aspect) => (
            <div key={"engine-aspect-" + aspect.id}>
              <strong>
                {aspect.firstPlanetLabel}{" — "}{aspect.secondPlanetLabel}
                {" · "}{aspect.aspectLabel}
              </strong>
              <span>
                {"exact "}{formatDegree(aspect.angle)}
                {" · separation "}{formatDegree(aspect.separation)}
                {" · orb "}{formatDegree(aspect.orb)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {houseContext ? (
        <div className={styles.evidenceList}>
          <h3>{"محاسبه خانه‌ها و سرخانه‌ها"}</h3>
          <div>
            <strong>{`${houseContext.requestedSystem} -> ${houseContext.appliedSystem}`}</strong>
            <span>{`${houseContext.availability} · ${houseContext.confidence}`}</span>
          </div>
          <div>
            <strong>{"Ascendant"}</strong>
            <span>
              {houseContext.ascendantLongitude === null
                ? "ثبت نشده"
                : formatDegree(houseContext.ascendantLongitude)}
              {" · "}
              {houseContext.ascendantMethod}
            </span>
          </div>
          <div>
            <strong>{"1st house cusp"}</strong>
            <span>{formatDegree(houseContext.firstHouseCuspLongitude)}</span>
          </div>
          {houseContext.cuspLongitudes?.map((longitude, index) => (
            <div key={`engine-cusp-${index + 1}`}>
              <strong>
                {"سرخانه "}
                {formatPersianNumber(index + 1)}
              </strong>
              <span>{formatDegree(longitude)}</span>
            </div>
          ))}
          {houseContext.calculationMethod ? (
            <div>
              <strong>{"method"}</strong>
              <span>{houseContext.calculationMethod}</span>
            </div>
          ) : null}
          {houseContext.limitation ? (
            <div>
              <strong>{"محدودیت"}</strong>
              <span>{houseContext.limitation}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {chartData.retrogrades ? (
        <div className={styles.evidenceList}>
          <h3>{"حرکت برگشتی"}</h3>
          <div>
            <strong>{formatEngineList(chartData.retrogrades.planetIds)}</strong>
            <span>{chartData.retrogrades.method ?? chartData.retrogrades.status}</span>
          </div>
          {chartData.retrogrades.limitation ? (
            <div><span>{chartData.retrogrades.limitation}</span></div>
          ) : null}
        </div>
      ) : null}

      {nodes ? (
        <div className={styles.evidenceList}>
          <h3>{"گره‌های ماه"}</h3>
          {[nodes.northNode, nodes.southNode].map((node) => (
            <div key={node.id}>
              <strong>
                {node.label}: {formatZodiacLabel(node.signId)}{" "}
                {formatDegree(node.degreeInSign)}
              </strong>
              <span>
                {formatDegree(node.longitude)}
                {typeof node.house === "number"
                  ? " · خانه " + formatPersianNumber(node.house)
                  : ""}
                {" · "}
                {node.method}
                {" · "}
                {node.reliability}
              </span>
            </div>
          ))}
          {nodes.limitation ? <div><span>{nodes.limitation}</span></div> : null}
        </div>
      ) : null}

      {lilith ? (
        <div className={styles.evidenceList}>
          <h3>{"لیلیت سیاه"}</h3>
          <div>
            <strong>
              {formatZodiacLabel(lilith.signId)}{" "}
              {formatDegree(lilith.degreeInSign)}
            </strong>
            <span>
              {formatDegree(lilith.longitude)}
              {typeof lilith.house === "number"
                ? " · خانه " + formatPersianNumber(lilith.house)
                : ""}
            </span>
          </div>
          <div>
            <strong>{lilith.modelId}</strong>
            <span>{`${lilith.method} · ${lilith.source} · ${lilith.reliability}`}</span>
          </div>
          <div>
            <strong>{lilith.validationStatus}</strong>
            <span>
              {`${lilith.validationReference} · tolerance ${formatDegree(
                lilith.validationToleranceDegrees,
              )}`}
            </span>
          </div>
          {lilith.limitation ? <div><span>{lilith.limitation}</span></div> : null}
        </div>
      ) : null}

      {signature ? (
        <div className={styles.evidenceList}>
          <h3>{"امضای کل چارت"}</h3>
          <div>
            <strong>{signature.method}</strong>
            <span>
              {`element=${signature.dominantElement ?? "none"} · modality=${
                signature.dominantModality ?? "none"
              } · expression=${signature.dominantExpression ?? "none"}`}
            </span>
          </div>
          <div>
            <strong>{"element counts"}</strong>
            <span>{JSON.stringify(signature.elementCounts)}</span>
          </div>
          <div>
            <strong>{"modality counts"}</strong>
            <span>{JSON.stringify(signature.modalityCounts)}</span>
          </div>
          <div>
            <strong>{"expression counts"}</strong>
            <span>{JSON.stringify(signature.expressionCounts)}</span>
          </div>
          <div>
            <strong>{"zero / low"}</strong>
            <span>
              {JSON.stringify({
                zeroElements: signature.zeroElements,
                zeroModalities: signature.zeroModalities,
                zeroExpressions: Object.entries(signature.expressionCounts)
                  .filter(([, count]) => count === 0)
                  .map(([key]) => key),
                lowElements: signature.lowElements,
                lowModalities: signature.lowModalities,
                lowExpressions: signature.lowExpressions,
              })}
            </span>
          </div>
          {signature.evidence.map((item) => (
            <div key={`signature-${item.placementId}`}>
              <strong>{ENGINE_PLANET_LABELS[item.placementId] ?? item.placementId}</strong>
              <span>{`${item.signId} · ${item.element} · ${item.modality} · ${item.expression}`}</span>
            </div>
          ))}
        </div>
      ) : null}

      {quality ? (
        <div className={styles.evidenceList}>
          <h3>{"کیفیت و مرز محاسبه"}</h3>
          <div>
            <strong>{quality.status}</strong>
            <span>
              {`houses=${quality.houseSystemStatus} · angles=${quality.anglesStatus} · retrograde=${quality.retrogradeStatus} · nodes=${quality.nodesStatus} · lilith=${quality.lilithStatus}`}
            </span>
          </div>
          {[...quality.limitations, ...quality.warnings].map((item, index) => (
            <div key={`quality-${index}`}><span>{item}</span></div>
          ))}
        </div>
      ) : null}

    </div>
  );
}

function PlacementTable({
  placements,
}: {
  placements: RealEngineReportPlacement[];
}) {
  if (placements.length === 0) {
    return (
      <EmptyTechnicalState>
        جایگاه نجومی قابل نمایش در این گزارش ثبت نشده است.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="placements">
      <div className={styles.dataHead}>
        <span>سیاره یا نقطه</span>
        <span>نشان و درجه</span>
        <span>خانه</span>
      </div>
      {placements.map((placement) => (
        <div className={styles.dataRow} key={placement.id}>
          <strong>{placement.label}</strong>
          <span>
            {formatZodiacLabel(placement.signId)}،{" "}
            {formatDegree(placement.degreeInSign)}
          </span>
          <span>
            {typeof placement.house === "number"
              ? "خانه " + formatPersianNumber(placement.house)
              : "وابسته به ساعت تولد نیست یا ثبت نشده"}
            {placement.motion ? (
              <small>
                {" · "}
                {placement.motion.status}
                {" · "}
                {formatPersianNumber(placement.motion.arcDegreesPerDay)}
                {"°/day"}
              </small>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function HouseTable({
  houses,
  hasReliableBirthTime,
  houseSystem,
  houseAvailability,
}: {
  houses: RealEngineReportHouse[];
  hasReliableBirthTime: boolean;
  houseSystem?: string;
  houseAvailability?: "ready" | "unavailable";
}) {
  if (!hasReliableBirthTime) {
    return (
      <EmptyTechnicalState>
        چون ساعت تولد دقیق نیست، درباره رایزینگ و خانه‌ها نتیجه‌گیری نشده؛
        بخش‌های مستقل از ساعت همچنان بررسی شده‌اند.
      </EmptyTechnicalState>
    );
  }

  if (houses.length !== 12) {
    return (
      <EmptyTechnicalState>
        {houseSystem === "placidus" && houseAvailability === "unavailable"
          ? "برای این موقعیت تولد، جدول کامل خانه‌های پلاسیدوس به دست نیامده و خانه‌ای جای آن حدس زده نشده است."
          : "جدول کامل دوازده خانه همراه این گزارش ثبت نشده است."}
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="houses">
      <div className={styles.dataHead}>
        <span>خانه</span>
        <span>شروع خانه</span>
        <span>میدان زندگی</span>
      </div>
      {houses.map((house) => (
        <div className={styles.dataRow} key={house.number}>
          <strong>خانه {formatPersianNumber(house.number)}</strong>
          <span>
            {formatZodiacLabel(house.signId)}،{" "}
            {formatDegree(house.degreeInSign)}
          </span>
          <span>
            {HOUSE_FIELD_LABELS[house.number] ?? "میدان ثبت‌شدهٔ چارت"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AspectTable({ aspects }: { aspects: RealEngineReportAspect[] }) {
  const rows = buildTechnicalAspectRows(aspects);

  if (rows.length === 0) {
    return (
      <EmptyTechnicalState>
        رابطهٔ زاویه‌ای اصلی برای نمایش در این گزارش ثبت نشده است.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="aspects">
      <div className={`${styles.dataHead} ${styles.aspectHead}`}>
        <span>دو نقطه</span>
        <span>نوع رابطه</span>
        <span>فاصلهٔ زاویه‌ای</span>
        <span>اورب</span>
      </div>
      {rows.map((row) => (
        <div
          className={`${styles.dataRow} ${styles.aspectRow}`}
          key={row.id}
        >
          <strong>{row.planets}</strong>
          <span>
            {row.type} ({formatDegree(row.exactAngle)})
          </span>
          <span>{formatDegree(row.separation)}</span>
          <span>{formatDegree(row.orb)}</span>
        </div>
      ))}
    </div>
  );
}

function PatternTable({
  patterns,
}: {
  patterns: LiveReportReadingContract["chartPatterns"]["patterns"];
}) {
  if (patterns.length === 0) {
    return (
      <EmptyTechnicalState>
        در این چارت استلیوم یا الگوی هندسی چندسیاره‌ایِ معتبر پیدا نشد؛
        نبود الگو هم یک نتیجهٔ محاسباتی است.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="patterns">
      <div className={styles.dataHead}>
        <span>الگو</span>
        <span>سیاره‌های درگیر</span>
        <span>پشتوانه</span>
      </div>
      {patterns.map((pattern) => (
        <div className={styles.dataRow} key={pattern.id}>
          <strong>{pattern.title}</strong>
          <span>{pattern.participantLabels.join("، ")}</span>
          <span>{pattern.technicalSummary}</span>
        </div>
      ))}
    </div>
  );
}

function RulershipTable({
  profile,
}: {
  profile: LiveReportReadingContract["rulership"];
}) {
  return (
    <div className={styles.contextPanel} data-technical-table="rulership">
      {!profile.hasReliableBirthTime ? (
        <EmptyTechnicalState>
          ساعت تولد دقیق ثبت نشده؛ بنابراین حاکمان خانه‌ها و حاکم طالع وارد
          این جدول نمی‌شوند. وضعیت‌های مستقل از خانه همچنان نمایش داده می‌شوند.
        </EmptyTechnicalState>
      ) : null}

      {profile.chartRuler ? (
        <div className={styles.evidenceList}>
          <h3>مسیر حاکم چارت</h3>
          <div>
            <strong>{profile.chartRuler.planetLabel}</strong>
            <span>{profile.chartRuler.pathSummary}</span>
          </div>
        </div>
      ) : null}

      {profile.dispositorChain ? (
        <div className={styles.evidenceList}>
          <h3>زنجیرهٔ حاکمیتی</h3>
          <div>
            <strong>مسیر محدود و قابل ردیابی</strong>
            <span>{profile.dispositorChain.summary}</span>
          </div>
        </div>
      ) : null}

      {profile.houseRulers.length > 0 ? (
        <div className={styles.dataTable}>
          <div className={styles.dataHead}>
            <span>خانه</span>
            <span>حاکم</span>
            <span>مسیر در چارت</span>
          </div>
          {profile.houseRulers.map((house) => (
            <div className={styles.dataRow} key={house.house}>
              <strong>خانه {formatPersianNumber(house.house)}</strong>
              <span>
                {house.rulerPlanetLabel} · {house.cuspSignLabel}
              </span>
              <span>{house.summary}</span>
            </div>
          ))}
        </div>
      ) : null}

      {profile.planetConditions.length > 0 ? (
        <div className={styles.dataTable}>
          <div className={styles.dataHead}>
            <span>سیاره</span>
            <span>وضعیت کلاسیک</span>
            <span>پشتوانه</span>
          </div>
          {profile.planetConditions.map((condition) => (
            <div className={styles.dataRow} key={condition.planetId}>
              <strong>
                {condition.planetLabel} در {condition.signLabel}
              </strong>
              <span>{condition.dignityLabel}</span>
              <span>
                {condition.majorAspect
                  ? `${condition.expression} ${condition.majorAspect}`
                  : condition.expression}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SupplementaryPointsTable({
  profile,
}: {
  profile: LiveReportReadingContract["supplementaryPoints"];
}) {
  const fortune = profile.partOfFortune;

  if (!fortune) {
    return (
      <EmptyTechnicalState>
        ساعت تولد دقیق ثبت نشده یا دادهٔ لازم برای تعیین روز/شب کامل نیست؛
        بنابراین سهم سعادت نمایش داده نمی‌شود.
      </EmptyTechnicalState>
    );
  }

  return (
    <div
      className={styles.contextPanel}
      data-technical-table="supplementary-points"
    >
      <dl className={styles.contextFacts}>
        <div>
          <dt>نقطه</dt>
          <dd>{fortune.label}</dd>
        </div>
        <div>
          <dt>جایگاه</dt>
          <dd>
            {fortune.signLabel}، {formatDegree(fortune.degreeInSign)}، خانه{" "}
            {formatPersianNumber(fortune.house)}
          </dd>
        </div>
        <div>
          <dt>نوع چارت</dt>
          <dd>{fortune.sect === "day" ? "روز" : "شب"}</dd>
        </div>
        <div>
          <dt>فرمول</dt>
          <dd>
            {fortune.formula === "ascendant+moon-sun"
              ? "طالع + ماه − خورشید"
              : "طالع + خورشید − ماه"}
          </dd>
        </div>
      </dl>

      <div className={styles.evidenceList}>
        <h3>پشتوانهٔ محاسبه</h3>
        {fortune.evidence.map((item) => (
          <div key={item}>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AxisTable({
  angles,
  hasReliableBirthTime,
}: {
  angles: RealEngineReportAngle[];
  hasReliableBirthTime: boolean;
}) {
  if (!hasReliableBirthTime || angles.length === 0) {
    return (
      <EmptyTechnicalState>
        چون ساعت تولد دقیق نیست، رایزینگ و محورهای وابسته به زمان نمایش داده
        نمی‌شوند؛ جایگاه‌های مستقل از ساعت همچنان در دسترس‌اند.
      </EmptyTechnicalState>
    );
  }

  return (
    <div className={styles.dataTable} data-technical-table="axes">
      <div className={styles.dataHead}>
        <span>محور</span>
        <span>نشان و درجه</span>
        <span>خانه</span>
      </div>
      {angles.map((angle) => (
        <div className={styles.dataRow} key={angle.id}>
          <strong>{ANGLE_LABELS[angle.id] ?? angle.label}</strong>
          <span>
            {formatZodiacLabel(angle.signId)}،{" "}
            {formatDegree(angle.degreeInSign)}
          </span>
          <span>
            {typeof angle.house === "number"
              ? `خانه ${formatPersianNumber(angle.house)}`
              : "ثبت نشده"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ContextPanel({
  report,
  contract,
}: {
  report: AstrologyReport;
  contract: LiveReportReadingContract;
}) {
  const chartData = report.realEngine;
  const readableLimitations = buildReadableLimitations(contract);

  return (
    <div className={styles.contextPanel}>
      <dl className={styles.contextFacts}>
        <div>
          <dt>نام انتخابی</dt>
          <dd>{report.input.name?.trim() || "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>تاریخ تولد</dt>
          <dd>{report.input.birthDate || "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>ساعت تولد</dt>
          <dd>
            {contract.hasReliableBirthTime
              ? report.input.birthTime
              : "دقیق نیست"}
          </dd>
        </div>
        <div>
          <dt>محل تولد</dt>
          <dd>
            {[report.input.birthCity, report.input.birthCountry]
              .filter(Boolean)
              .join("، ") || "ثبت نشده"}
          </dd>
        </div>
        <div>
          <dt>منطقه زمانی</dt>
          <dd>{report.input.birthTimezone || "همراه گزارش ثبت نشده"}</dd>
        </div>
        <div>
          <dt>خانه‌ها</dt>
          <dd>{formatHouseSystem(chartData?.houseSystem)}</dd>
        </div>
      </dl>

      {readableLimitations.length > 0 ? (
        <details className={styles.limitationsDisclosure}>
          <summary>حدود این خوانش</summary>
          <ul>
            {readableLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className={styles.evidenceList}>
        <h3>این خوانش از کجای چارت آمده است؟</h3>
        {contract.evidenceReferences.map((evidence) => (
          <div key={evidence.id}>
            <strong>{humanizeVisibleLabel(evidence.label)}</strong>
            <span>{humanizeVisibleLabel(evidence.detail)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTechnicalState({ children }: { children: ReactNode }) {
  return (
    <div className={styles.emptyTechnical} role="note">
      {children}
    </div>
  );
}

function buildReadableLimitations(
  contract: LiveReportReadingContract,
): string[] {
  const values = contract.hasReliableBirthTime
    ? []
    : [
        "چون ساعت تولد دقیق نیست، درباره رایزینگ و خانه‌ها نتیجه‌گیری نشده؛ بخش‌های مستقل از ساعت همچنان بررسی شده‌اند.",
      ];

  for (const limitation of contract.limitations) {
    const internalOnly =
      /\b(?:engine|runtime|snapshot|fixture|contract|ranking)\b|feature disabled|partial data|disabled/iu.test(
        limitation,
      );
    const human = humanizeLimitation(limitation)
      .replace(/^[:؛،\-\s]+/u, "")
      .replace(/[\s:؛،\-]+$/u, "")
      .trim();

    if (!human) continue;
    if (!contract.hasReliableBirthTime && /ساعت تولد|رایزینگ و خانه‌ها/u.test(human)) {
      continue;
    }
    if (internalOnly && human.length < 36) continue;
    values.push(human);
  }

  return [...new Set(values)];
}

function humanizeLimitation(value: string) {
  return humanizeVisibleLabel(value)
    .replace(
      /زاویه‌ها، حاکم چارت و خانه‌ها[^.؟!]*/gu,
      "رایزینگ و خانه‌ها در این خوانش وارد نتیجه‌گیری نشده‌اند",
    )
    .replace(
      /تعداد جایگاه‌های سیاره‌ای محدود[^.؟!]*/gu,
      "این خوانش فقط از جایگاه‌هایی استفاده کرده که همراه گزارش ثبت شده‌اند",
    );
}

function humanizeVisibleLabel(value: string) {
  return humanizeVisibleText(value)
    .replace(/legacy\s*\/\s*fallback/giu, "")
    .replace(/[\s\u00a0]+/gu, " ")
    .trim();
}

function formatDegree(value: number): string {
  return `${formatPersianNumber(value)}°`;
}

function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatHouseSystem(system: string | undefined): string {
  if (system === "placidus") return "پلاسیدوس";
  if (system === "whole-sign") return "نشانهٔ کامل";
  if (system === "equal-house") return "خانه‌های مساوی";
  return "همراه این گزارش مشخص نشده";
}
