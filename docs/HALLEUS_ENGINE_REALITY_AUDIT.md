# Halleus Engine Reality Audit

Version: v0.1.91-engine-reality-audit
Date: 2026-06-28
Baseline HEAD: 81594d8
Baseline tag: v0.1.90-idea-garden-public-report-seo
Audit type: docs-only, no code changes

## Safety Gate

Current HEAD at audit start: `81594d8`
Latest tag at audit start: `v0.1.90-idea-garden-public-report-seo`
Audited files: `lib`, `src`, `types`, `components`, `app/api`, `app/chart`, `app/reports`, `app/order`, `app/engine`, `scripts`, `package.json`, `docs/HALLEUS_IDEA_GARDEN.md`, and `docs/HALLEUS_PROJECT_CONTEXT.md` from the uploaded v0.1.91 audit ZIPs.
Allowed file for this batch: `docs/HALLEUS_ENGINE_REALITY_AUDIT.md` only.
Forbidden files for this batch: app, components, lib, src, types, scripts, package, and existing project context docs.
Checks for apply: `pnpm run check:encoding` and `git --no-pager diff --check`.

## Executive verdict

Halleus now has a **real calculation prototype wired into the public chart/report flow**, but it is not yet a production-grade astrology/report engine.

The current system is best described as:

```text
Real-ish calculation layer: yes
Production-grade natal engine: not yet
Real placement data in generated reports: partially yes
Final house/aspect/report interpretation layer: not yet
Public/free/private SEO report model: not implemented yet
Wiki/content SEO engine: only a seed-level foundation
```

The product is beyond a mock-only demo, because user-submitted birth data can call `/api/engine/real-chart`, compute astronomy-based placements, and save a report enriched by a real-engine snapshot. However, the saved report still starts from `createMockReport`, the report output versions still identify as preview, interpretation is still mock/preview, houses and ascendant are not production-hardened, and public/indexable report infrastructure does not exist yet.

## Current reality scores

These are rough operating estimates, not marketing claims.

```text
Public deployment / technical SEO shell: 70-75%
Chart input UX: 70-80%
Real planetary placement calculation: 55-65%
House/ascendant reliability: 30-40%
Aspect layer: 45-55%
Report interpretation depth: 30-40%
Report storage and history: 55-65%
Public/private/paid report model: 10-20%
Wiki/content moat: 10-15%
Overall real-site readiness: about 45-50%
```

## Main live flow today

The primary user path is:

```text
/chart -> ChartForm -> Jalali date parsing -> Gregorian ISO birthDate
       -> Iran city selection -> latitude/longitude/timezone
       -> POST /api/engine/real-chart
       -> createMockReport(normalizedForm)
       -> enhanceReportOutputV2(mock report)
       -> attachRealEngineSnapshotToReport if API succeeds
       -> enrichReportWithRealEngineCopy
       -> saveGeneratedReport
       -> /reports/[reportId]
```

Important behavior:

- If the real chart API succeeds, a `RealEngineReportSnapshot` is attached to the report.
- If the real chart API fails, the report is still saved using the safe mock/preview path.
- Reports are saved through the local report repository.
- Default report visibility is currently `private`.
- There is no public/indexable report route or consent gate yet.

## What is genuinely real now

### 1. User input normalization is real enough for MVP testing

`ChartForm` collects nickname/name, Jalali birth date parts, birth time, and Iranian city. It converts the Jalali date to a Gregorian ISO date and uses the city catalog for latitude, longitude, and timezone.

Current useful facts:

- Persian/Jalali UX exists.
- City latitude/longitude/timezone are available for selected Iranian cities.
- The form posts normalized birth data to `/api/engine/real-chart`.
- The country is still internally fixed to Iran in the public flow.

### 2. `/api/engine/real-chart` is a real calculation route

The API route calls `buildRealChartWorkbenchResult` from `src/lib/chart/real-chart-engine.ts`. It returns:

- `realChart`
- `chartReportEnrichment`
- `copyBlocks`
- a preview-style `report` object

This route is not just copy. It calculates chart data from user input.

### 3. Astronomy-based geocentric ecliptic longitudes exist

`src/lib/chart/real-chart-engine.ts` uses `astronomy-engine` to calculate ecliptic longitudes for:

```text
Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
```

The method label is `astronomy-engine-geocentric`. This is a meaningful step beyond the earlier mock engine.

### 4. Timezone conversion exists in the newer real-chart route

The newer `src/lib/chart/real-chart-engine.ts` path uses `Intl.DateTimeFormat` to convert local date/time and timezone into UTC. This is better than the older prototype path.

Important caveat: a separate older chart-engine metadata path still treats submitted birth time as UTC for prototype validation.

### 5. Normalized chart structure exists

`src/lib/chart/normalized-chart.ts` builds a normalized chart with:

- time context
- house context
- 12 houses
- normalized placements
- zodiac positions
- calculated major aspects
- quality limitations

This is a good foundation for future report generation.

### 6. Aspect calculation exists

There are two aspect layers:

- `src/lib/chart/aspects.ts` for normalized chart aspects.
- `lib/astrology/real-engine-aspects.ts` for report snapshot aspects.

Both handle major aspects such as conjunction, sextile, square, trine, and opposition.

### 7. Real-engine Persian copy exists

`lib/astrology/real-engine-report-writer.ts` enriches the saved report using real-engine placement data. It builds Persian text for:

- Sun
- Moon
- Rising / approximate ascendant sign
- Mercury
- Venus
- Mars
- aspect overview
- integration summary

This means generated reports can include data-driven copy instead of only mock text, when the API succeeds.

## What is still mock, preview, or not production-ready

### 1. The saved report still starts as a mock report

The public generation flow still begins with:

```text
createMockReport(normalizedForm)
enhanceReportOutputV2(mock report)
```

Then real-engine data is attached if available. This is safe, but it means the generation architecture is still mock-first rather than real-engine-first.

### 2. The v2/v3 report outputs are still preview-labeled

`lib/report-output/report-v2.ts` explicitly uses `v2-sectioned-preview` and warning text that says real chart placements are not active yet.

`lib/report-output/report-v3.ts` uses `v3-persian-sectioned-preview`.

This is now partly outdated because real placements can be attached, but the report output layer has not been promoted from preview to a real-data-aware version.

### 3. Interpretation driver is still mock-preview

`lib/interpretation/mock-interpretation-driver.ts` reports:

```text
activeDriver: mock-preview
canComposeProductionReport: false
```

It also says real chart placements are not connected yet. This means the interpretation architecture is not yet the main source of final reports.

### 4. There are duplicate chart-engine paths

There are at least two active-ish engine layers:

```text
A. /api/engine/real-chart -> src/lib/chart/real-chart-engine.ts
B. saveGeneratedReport -> attachChartEngineMetadata -> lib/chart-engine/astronomy-engine-prototype.ts
```

Path A is newer and richer. It calculates 10 bodies, uses timezone conversion, approximate ascendant, normalized chart, houses, aspects, enrichment, and copy blocks.

Path B is older metadata. It calculates only 7 bodies, labels the active engine as `mock-preview`, sets placeholder houses by index, and warns that timezone handling treats submitted birth time as UTC.

This duplication is the biggest technical source of confusion.

### 5. Houses are not production-grade yet

The normalized chart layer supports placeholder, whole-sign, and equal-house structures. The real chart route currently uses equal-house scaffolding with an approximate ascendant.

The code itself says:

```text
Ascendant and houses are approximate equal-house scaffolding until final house-system hardening.
```

So houses should not yet be marketed as final/professional.

### 6. Ascendant is approximate

The current ascendant calculation is implemented manually in the real chart engine. It is useful for prototype/report flow, but it needs validation fixtures and a final house-system decision before being treated as paid/private report quality.

### 7. Retrograde is not real yet

Types include `retrograde`, and the fixture engine can fake retrograde-like values. But the real calculation path inspected for saved reports does not compute real retrograde state.

### 8. Transits are not real yet

Sky Pulse is currently a product/content layer, not a real transit engine.

There is no verified monthly/weekly/daily transit source yet. Do not claim real transit coverage until a transit calculation/source layer exists.

### 9. Public/free/private report model is not implemented

The new product idea is recorded in Idea Garden, but code does not yet implement:

- public free report consent
- nickname-only public identity mode
- public report slugs
- indexable public report pages
- noindex/private paid report pages
- public report deletion/unpublish
- public cohort pages like “Dey-born users in Shiraz”

Current storage already has `ReportVisibility = "private" | "public"`, but the active local save path defaults to `private`, and no user-facing consent/indexing flow exists.

### 10. Database/account/payment are not production-ready

Reports are local-preview by default. Database driver is not configured. Payment is still shell/preview. Paid private reports are a product model, not a working monetization system.

## SEO and public reports implication

The public-free-report SEO strategy is promising, but it must wait until the report engine is stronger.

Do not open public/indexable user-generated reports yet.

Reasons:

- Current reports can still fall back to mock copy.
- Report output still carries preview wording.
- Public consent is not implemented.
- Public report slugs do not exist.
- No deletion/unpublish process exists.
- The engine still needs house/ascendant/timezone/retrograde hardening.
- Keyword insertion should not happen before keyword cluster research and report template design.

## What “realer engine” means for the next phase

The next phase should not be “more copy”. It should make the data model and report pipeline honest.

### Required before public/free indexable reports

1. Single source of truth for chart calculation.
2. Real-engine-first report generation path.
3. Stored normalized chart or stored report enrichment.
4. Explicit quality flags on every generated report.
5. Clear fallback label if mock/fallback data was used.
6. Final decision for house system MVP.
7. More QA fixtures across dates, times, cities, and timezones.
8. Public/private visibility contract.
9. Consent copy before any indexable free report.
10. SEO slug and keyword field model.

## Recommended big next batches

### v0.1.92-chart-engine-single-source-of-truth

Goal: reduce duplicate engine paths.

Scope:

- Decide whether the canonical engine is `src/lib/chart/real-chart-engine.ts` or the older `lib/chart-engine/*` abstraction.
- Stop attaching misleading `mock-preview` metadata when richer real-chart data exists.
- Make saved reports carry one coherent engine status.

No public report features yet.

### v0.1.93-report-real-data-contract

Goal: define what a report must store to be considered real enough.

Needed fields:

```text
engineStatus: real | partial | fallback | mock
calculationVersion
birthTimezoneUsed
placements
aspects
houseSystem
houseConfidence
ascendantConfidence
limitations
seoEligibility
```

### v0.1.94-report-output-real-sections

Goal: move report output from preview sections toward real-data-aware sections.

Sections should be based on real data when available:

```text
Core identity
Emotional rhythm
Mind and communication
Relationship pattern
Drive and action
Rising / approach to life
Strongest aspects
Current limitations
```

### v0.1.95-public-private-report-contract

Goal: design the free public vs paid private model.

Include:

- nickname rules
- consent copy
- visibility flag
- public slug
- noindex/private rules
- public report deletion/unpublish model
- paid/private upgrade path

### v0.1.96-persian-keyword-cluster-research

Goal: research real Persian long-tail clusters before writing wiki/report SEO copy.

Use web research. Do not invent “latest Google clusters” from memory.

### v0.1.97-wiki-and-report-seo-template

Goal: connect wiki content clusters to report templates and public report pages.

## Do not do next

Do not connect Search Console yet.
Do not publish indexable user reports yet.
Do not add fake transit text as if it were calculated.
Do not rewrite the public `/chart` shell.
Do not build public report URLs before consent/privacy is designed.
Do not make keyword-stuffed report copy.
Do not claim professional/paid engine accuracy yet.

## Best immediate next step

The best immediate implementation batch after this audit is:

```text
v0.1.92-chart-engine-single-source-of-truth
```

This should be a bounded code batch after live file inspection, not a blind rewrite.

First target: make the generated report clearly know whether it came from:

```text
real-chart route
partial real route
fallback mock path
legacy metadata path
```

Only after that should Halleus design public/free/private SEO report pages.

## v0.1.153 house and axes data audit

Current real report snapshot data supports a limited house display, not a full axes/cusp system yet.

Confirmed available data:
- `RealEngineReportSnapshot.ascendantLongitude` exists and can support ASC/rising display.
- `RealEngineReportSnapshot.houseContext` may include requested/applied system, confidence, ascendant method, ascendant longitude, and first house cusp longitude.
- `RealEngineReportPlacement.house` exists and already supports planet-in-house display.

Confirmed missing or not reliable enough for UI promises:
- No stable array of 12 real house cusps exists in the public report snapshot contract.
- No stable DSC, IC, or MC fields exist in the report snapshot contract.
- No production-grade house system hardening is complete yet; previous docs still treat houses/axes as approximate scaffolding.
- RealChartWheel currently renders zodiac/placements/aspect lines and ASC, but not reliable DSC/IC/MC or full house divisions.

Allowed next UI step:
- A small "house guide" section may show Whole Sign-style house starts derived from the available ascendant/first-house context, but it must be labeled as a house guide / applied system preview, not as precise production-grade cusps.
- ASC can be shown because ascendantLongitude exists.
- DSC, IC, and MC should stay hidden until the engine/data contract provides reliable fields.

Do not implement yet:
- Do not fake DSC, IC, MC, Lilith, nodes, retrograde, or precise cusp arrays.
- Do not build a full chart wheel that claims complete axes/house precision before the data contract is hardened.

## v0.1.163 special points real source audit

Current source audit for lunar nodes and Lilith/Black Moon points:

- The inspected astronomy-engine package exposes event-search helpers such as SearchMoonNode / NextMoonNode and SearchLunarApsis / NextLunarApsis.
- These APIs describe event times for lunar node crossings or lunar apsides. They are not a stable natal chart API for a North Node longitude, South Node longitude, Mean Lilith, or True Lilith at the birth moment.
- A node crossing event must not be treated as the natal North Node point.
- A lunar apsis event must not be treated as a Mean/True Black Moon Lilith point.
- Therefore realEngine.lunarNodes and realEngine.lilith must remain deferred/hidden until Halleus has a validated source and QA fixtures for actual natal point longitudes.

Allowed future implementation path:
- Add or derive a validated ecliptic longitude source for North Node.
- Derive South Node only as the exact opposition of a validated North Node.
- Choose and document Mean Lilith or True Lilith before any Lilith UI/writer output.
- Add snapshot fields, QA fixtures, ReportCard, writer, and wheel support only after the source is real.

Do not implement yet:
- Do not fake North Node, South Node, or Lilith from event-search APIs.
- Do not show Nodes/Lilith in public reports, writer prose, or chart wheel until real point data exists.

## v0.1.164 special points source decision

Decision after the v0.1.164 source review:

- Keep `astronomy-engine` as the approved runtime astronomy dependency for the current Halleus engine path.
- Do not add Swiss Ephemeris wrapper dependencies to the product runtime in this batch.
- Treat `swisseph` and `sweph` as research candidates only until license, deployment, binary/runtime, and API stability risks are reviewed.
- Do not use `SearchMoonNode`, `NextMoonNode`, `SearchLunarApsis`, or `NextLunarApsis` as substitutes for natal North Node, South Node, Mean Lilith, or True Lilith longitude.
- Keep `realEngine.lunarNodes` and `realEngine.lilith` deferred/hidden until actual natal point longitudes are produced by a validated source.

Preferred implementation order:

1. Nodes first, Lilith later.
2. Implement a hidden North Node source spike only after the formula/source and QA fixtures are documented in code/checks.
3. Store South Node only as the exact opposition of a validated North Node longitude.
4. Add ReportCard, writer, and chart wheel exposure only after the snapshot carries real node data.
5. Keep Lilith deferred until Halleus chooses Mean Lilith or True Lilith and validates its source separately.

Do not implement yet:

- Do not install a new ephemeris dependency in a product batch without an explicit dependency/license/deployment gate.
- Do not expose Nodes/Lilith in public reports as decorative or guessed content.
- Do not let the desire for a complete report override source reality.

## v0.1.165 true vs mean node probe

Probe result after the v0.1.165 context review:

- `astronomy-engine` stays useful for Sun, Moon, planets, ecliptic conversion, sidereal time, houses/angles support, and event search.
- The inspected `astronomy-engine` API exposes `SearchMoonNode` / `NextMoonNode` for event times when the Moon crosses the ecliptic plane. It does not expose a direct natal True Node or Mean Node ecliptic longitude API.
- Do not infer natal True Node longitude from `SearchMoonNode` event times.
- Swiss Ephemeris wrappers remain research-only for now; do not add `swisseph`, `sweph`, or `swiss-ephemeris` to runtime dependencies in this path.
- Mean Lunar Node is not fake. It is a documented mean-orbit model and can be implemented with a small formula, but it must be labeled honestly as Mean Node, not True/Osculating Node.
- True/Osculating Node remains deferred until Halleus accepts a validated source that returns natal longitude directly or implements a separately validated osculating-node calculation.

Mean Node implementation decision:

- Implement Mean Lunar Nodes before True Node.
- Use the J2000 mean longitude of the Moon ascending node formula in code comments and checks: `Omega = 125.04452 - 1934.136261*T + 0.0020708*T^2 + T^3/450000` degrees, normalized to 0..360.
- Store North Node as a calculated ecliptic longitude with method `mean-lunar-node-j2000-meeus-formula`.
- Store South Node only as the exact opposition of North Node: `South Node = normalize(North Node + 180)`.
- Keep Black Moon Lilith deferred; this probe does not decide Mean Lilith vs True/Osculating Lilith.
