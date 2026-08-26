"use client";

import { useEffect, useId, useState } from "react";

import type {
  SkyDailyAspectKind,
  SkyDailyBodyId,
  SkyDailySnapshot,
} from "@/lib/sky-daily/sky-daily-contract";
import {
  SKY_BODY_LABELS,
  SKY_BODY_SYMBOLS,
  SKY_SIGN_LABELS,
  SKY_SIGN_SYMBOLS,
} from "@/lib/sky-public/sky-public-labels";

type RendererState = "loading" | "ready" | "error";

const ASTROCHART_SIZE = 720;
const ASTROCHART_RENDERER_VERSION = "@astrodraw/astrochart@3.0.2";
const NATURAL_ZODIAC_SECTORS = Array.from({ length: 12 }, (_, index) => index * 30);
const ASTROCHART_BODY_NAMES: Record<SkyDailyBodyId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};
const ASPECT_ANGLES: Record<SkyDailyAspectKind, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};
const ASPECT_COLORS: Record<SkyDailyAspectKind, string> = {
  conjunction: "#78818C",
  sextile: "#6A8C7E",
  square: "#956A6A",
  trine: "#6A8C7E",
  opposition: "#956A6A",
};
const SIGN_IDS = Object.keys(SKY_SIGN_LABELS) as Array<keyof typeof SKY_SIGN_LABELS>;

export function SkyPublicWheel({ snapshot }: { snapshot: SkyDailySnapshot }) {
  const reactId = useId().replace(/:/g, "");
  const chartId = `halleus-sky-astrochart-${reactId}`;
  const [rendererState, setRendererState] = useState<RendererState>("loading");
  const retrogradeBodies = snapshot.planetaryStates.filter(
    (state) => state.motion === "retrograde",
  );

  useEffect(() => {
    let cancelled = false;
    const host = document.getElementById(chartId);

    if (!host) return undefined;

    const chartHost = host;
    chartHost.replaceChildren();
    queueMicrotask(() => {
      if (!cancelled) setRendererState("loading");
    });

    async function renderSkyWheel() {
      try {
        const { Chart } = await import("@astrodraw/astrochart");
        if (cancelled) return;

        const chart = new Chart(chartId, ASTROCHART_SIZE, ASTROCHART_SIZE, {
          SYMBOL_SCALE: 1.12,
          COLOR_BACKGROUND: "#0B0D11",
          POINTS_COLOR: "#F4F6F8",
          SIGNS_COLOR: "#E5EAF0",
          CIRCLE_COLOR: "#4B535E",
          LINE_COLOR: "#3A424C",
          CUSPS_FONT_COLOR: "#A9B2BD",
          SYMBOL_AXIS_FONT_COLOR: "#F4F6F8",
          COLORS_SIGNS: [
            "#151922", "#101318", "#171B21", "#11151B",
            "#151922", "#101318", "#171B21", "#11151B",
            "#151922", "#101318", "#171B21", "#11151B",
          ],
          MARGIN: 48,
          PADDING: 22,
          COLLISION_RADIUS: 12,
          SHOW_DIGNITIES_TEXT: false,
          ADD_CLICK_AREA: false,
          ASPECTS: {},
        });
        const planets = Object.fromEntries(
          snapshot.planetaryStates.map((state) => [
            ASTROCHART_BODY_NAMES[state.body],
            state.motion === "retrograde"
              ? [state.longitude, -1]
              : [state.longitude],
          ]),
        );
        const radix = chart.radix({
          planets,
          cusps: NATURAL_ZODIAC_SECTORS,
        });
        const aspects = snapshot.aspects.slice(0, 12).map((aspect) => ({
          aspect: {
            name: aspect.kind,
            degree: ASPECT_ANGLES[aspect.kind],
            orbit: aspect.orb,
            color: ASPECT_COLORS[aspect.kind],
          },
          point: {
            name: ASTROCHART_BODY_NAMES[aspect.leftBody],
            position: snapshot.planetaryStates.find(
              (state) => state.body === aspect.leftBody,
            )?.longitude ?? 0,
          },
          toPoint: {
            name: ASTROCHART_BODY_NAMES[aspect.rightBody],
            position: snapshot.planetaryStates.find(
              (state) => state.body === aspect.rightBody,
            )?.longitude ?? 0,
          },
          precision: aspect.orb.toFixed(2),
        }));

        if (aspects.length > 0) radix.aspects(aspects);

        removeNatalOnlyLayers(chartHost, chartId);
        const svg = chartHost.querySelector("svg");
        if (svg) {
          styleAspectLines(svg);
          svg.setAttribute("role", "img");
          svg.setAttribute(
            "aria-label",
            "چرخ آسمان عمومی با جایگاه سیاره‌ها و رابطه‌های زاویه‌ای، بدون خانه‌ها و محورهای چارت تولد",
          );
        }
        setRendererState("ready");
      } catch {
        if (!cancelled) {
          chartHost.replaceChildren();
          setRendererState("error");
        }
      }
    }

    void renderSkyWheel();
    return () => {
      cancelled = true;
      chartHost.replaceChildren();
    };
  }, [chartId, snapshot]);

  return (
    <section
      className="sky-astrochart-wheel"
      data-sky-public-wheel-renderer={ASTROCHART_RENDERER_VERSION}
      data-sky-public-wheel-status={rendererState}
      aria-labelledby="sky-wheel-title"
    >
      <header className="sky-astrochart-wheel-header">
        <div>
          <span>نمای تصویری</span>
          <h2 id="sky-wheel-title">چارت آسترولوژی امروز</h2>
        </div>
      </header>

      <div className="sky-astrochart-wheel-body">
        <div
          className="sky-astrochart-wheel-canvas"
          id={chartId}
          aria-busy={rendererState === "loading"}
        />

        <aside className="sky-astrochart-wheel-guide" aria-label="راهنمای فارسی چرخ آسمان">
          <div>
            <strong>نماد سیاره‌ها</strong>
            <ul className="sky-wheel-symbol-list" role="list">
              {snapshot.planetaryStates.map((state) => (
                <li key={state.body}>
                  <span aria-hidden="true">{SKY_BODY_SYMBOLS[state.body]}</span>
                  {SKY_BODY_LABELS[state.body]}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <strong>نشانه‌های دوازده‌گانه</strong>
            <ul className="sky-wheel-symbol-list" role="list">
              {SKY_SIGN_SYMBOLS.map((symbol, index) => (
                <li key={SIGN_IDS[index]}>
                  <span aria-hidden="true">{symbol}</span>
                  {SKY_SIGN_LABELS[SIGN_IDS[index]]}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <strong>رنگ رابطه‌ها</strong>
            <ul className="sky-wheel-aspect-guide" role="list">
              <li><i data-tone="harmonious" />سبز؛ تثلیث و تسدیس</li>
              <li><i data-tone="dynamic" />قرمز؛ مربع و مقابله</li>
              <li><i data-tone="conjunction" />خاکستری؛ هم‌نشینی</li>
            </ul>
            {retrogradeBodies.length > 0 ? (
              <p className="sky-wheel-retrogrades">
                <strong>حرکت برگشتی:</strong>{" "}
                {retrogradeBodies.map((state) => SKY_BODY_LABELS[state.body]).join("، ")}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {rendererState === "loading" ? (
        <p className="sky-astrochart-wheel-state" role="status">چرخ آسمان در حال آماده‌شدن است…</p>
      ) : null}
      {rendererState === "error" ? (
        <p className="sky-astrochart-wheel-state" role="note">
          نمایش تصویری آماده نشد؛ داده‌های متنی همین صفحه همچنان معتبر و در دسترس‌اند.
        </p>
      ) : null}
    </section>
  );
}

function removeNatalOnlyLayers(host: HTMLElement, chartId: string) {
  host.querySelector(`#${chartId}-astrology-radix-cusps`)?.remove();
  host.querySelector(`#${chartId}-astrology-radix-axis`)?.remove();
}

function styleAspectLines(svg: SVGSVGElement) {
  svg.querySelectorAll<SVGLineElement>("line[data-precision]").forEach((line) => {
    const orb = Number(line.dataset.precision);
    const isVeryTight = Number.isFinite(orb) && orb <= 1;
    const isTight = Number.isFinite(orb) && orb <= 2.5;
    line.setAttribute("stroke-width", isVeryTight ? "2.4" : isTight ? "1.8" : "1.25");
    line.setAttribute("stroke-opacity", isVeryTight ? "0.92" : isTight ? "0.78" : "0.62");
    line.setAttribute("stroke-linecap", "round");
  });
}
