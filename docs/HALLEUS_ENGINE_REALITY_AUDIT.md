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

## v0.1.228 true node vector validation harness

- Status: validation harness only; not product integration.
- Method C is executable as a candidate osculating node only: use Astronomy Engine GeoMoonState position plus velocity, rotate into ecliptic frames, and derive the instantaneous lunar orbital plane from the angular-momentum vector.
- The guard `check:true-node-vector-validation` validates finite fixture output, exact candidate South Node opposition, conservative lunar-inclination sanity, node-event geometry alignment, and the continued product boundary.
- SearchMoonNode remains event-time context only. It must not be used as a natal True/Osculating Node longitude source.
- The harness does not promote nodeType beyond mean, does not add a True/Osculating Node method to product types, and does not change real chart output.
- Next gate: compare the candidate against independent True/Osculating Node reference fixtures before any engine/type/UI/report integration.

## v0.1.230 local True Node internal adapter

Halleus now has a local-only internal adapter for a disabled True/Osculating Node candidate.
The adapter uses Astronomy Engine GeoMoonState position and velocity, rotates the lunar state into the ecliptic frame, and derives the candidate node from the instantaneous lunar orbital plane.
This is not product output: the real chart engine and report types continue to expose Mean Lunar Node only.
The adapter must not use runtime Swiss Ephemeris, external APIs, SearchMoonNode as a longitude source, or any public nodeType=true promotion.
## v0.1.234 complete local True Node hardening

Current Node state:
- Halleus production lunar-node output is local True/Osculating.
- The local True/Osculating model uses Astronomy Engine GeoMoonState position plus velocity and the ecliptic-of-date frame.
- South Node is derived as exact opposition of the selected North Node.
- Mean Lunar Node remains fallback/helper only.
- Lilith remains deferred and not-calculated.
- transit remains out of scope.
- No Swiss runtime dependency or external API is approved for Node output.

QA state:
- The Node probe keeps 12 date fixtures and 6 node-event sanity starts.
- The complete-local-true-node-hardening guard verifies engine output, report/UI sync, docs state, no external API, and no Swiss runtime dependency.

Next engine work:
- Lilith requires a separate model/source decision before any output.
- Transit requires a separate rules/source contract before Sky Pulse can claim real transit interpretation.

## v0.1.235 Lilith model decision contract

- Black Moon Lilith remains deferred and not-calculated in production output.
- Mean Black Moon Lilith and True/Osculating Black Moon Lilith are candidate models only until a separate source/validation batch selects and proves one model.
- Dark Moon/Waldemath Lilith is out of scope and must not be conflated with Black Moon Lilith.
- No Lilith transit or report/UI claim is approved by this decision contract.
- No external API, Swiss Ephemeris runtime dependency, or fake Lilith label is approved for this step.

## v0.1.236 Lilith source feasibility probe

- Current local runtime source is astronomy-engine@2.1.19.
- No approved production Black Moon Lilith longitude source exists yet.
- SearchLunarApsis and NextLunarApsis are event-time helpers, not natal Black Moon Lilith longitude sources.
- Do not approximate Black Moon Lilith from lunar apsis events or reuse lunar-node vector code under a Lilith label.
- Black Moon Lilith remains deferred and not-calculated until a separate source/fixture batch proves one model.

## v0.1.237 self-built osculating Lilith decision

- Preferred next model is True/Osculating Black Moon Lilith, not Mean Black Moon Lilith, because it can be probed locally from the same style of Moon state-vector source already used for local True/Osculating Lunar Nodes.
- No external API and no new Lilith runtime dependency are approved in this milestone; Swiss-style sources may remain research/reference material only, not a runtime path.
- The next buildable milestone is a probe-only local osculating Lilith calculator from Moon position and velocity state vectors; it must derive the apogee direction from the osculating orbit and keep the value internal until fixtures and sanity guards pass.
- Mean Black Moon Lilith remains later-only until a public/permissive formula is selected and validated; Dark Moon/Waldemath Lilith and asteroid 1181 Lilith remain out of scope.
- Black Moon Lilith remains deferred and not-calculated; no engine output, report/UI claim, chart-wheel placement, transit, or public SEO claim is approved yet.

## v0.1.238 self-built osculating Lilith probe

- A probe-only local calculator now derives a candidate True/Osculating Black Moon Lilith apogee longitude from Moon position and velocity state vectors.
- The probe uses the existing astronomy-engine GeoMoonState plus ecliptic-of-date rotation and a two-body osculating eccentricity-vector method.
- The value remains internal and not approved for realChart output, report generation, chart wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- Offline reference fixtures are still required before any production output approval.

## v0.1.239 Lilith validation harness

- The self-built osculating Lilith probe now has a validation-only harness.
- The harness checks fixture diversity, normalized longitudes, apogee/perigee opposition, eccentricity sanity, angular momentum sanity, and daily continuity.
- The harness does not approve realChart output, report generation, chart-wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- External/offline reference fixtures are still required before adapter or engine output approval.

## v0.1.240 Lilith internal adapter

- The self-built osculating Lilith probe now has an internal adapter named `calculateLocalOsculatingBlackMoonLilith`.
- The adapter wraps the validated probe result into a reusable internal shape with source, method, model, longitude, and safety metadata.
- The adapter is internal adapter only and is not approved for realChart output, report generation, chart-wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- External/offline reference fixtures remain required before engine output approval.

## v0.1.241 Lilith guarded engine output

- `realChart.lilith` is now populated as `Local True/Osculating Black Moon Lilith` from the self-built local True/Osculating Black Moon Lilith adapter.
- The engine path uses `calculateRealChartLilith` and `calculateLocalOsculatingBlackMoonLilith`; no external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- The output is guarded engine data only: report/UI output remains disabled, and report generation must continue to treat Lilith as not-calculated until the report sync milestone.
- Mean Black Moon Lilith, Dark Moon/Waldemath Lilith, asteroid 1181 Lilith, transit Lilith, and public SEO Lilith claims remain out of scope.


## v0.1.242 Lilith report data bridge

- Report generation data now receives the guarded engine Lilith result through `RealEngineReportCalculatedLilith` and `lilith: buildCalculatedLilith(realChart)`.
- `lilithStatus is now calculated in report data` when `realChart.lilith` is calculated, while `approvedForReportOutput` remains false.
- ReportCard and report narrative remain deferred; this milestone is data bridge only and does not add user-facing Lilith UI or narrative copy.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.243 Lilith report/UI sync

- ReportCard now shows a limited technical Lilith card when calculated report data includes Local True/Osculating Black Moon Lilith.
- The UI copy keeps Lilith scoped as a local self-built osculating lunar-apogee data point, not Mean Lilith, asteroid 1181 Lilith, Dark Moon, or Waldemath Lilith.
- The report writer narrative remains gated for a separate milestone; v0.1.243 does not add a Lilith interpretation paragraph or chart-wheel point.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.244 Lilith narrative/trust QA

- Lilith report UI remains a limited technical data card and is not promoted into a full interpretation paragraph yet.
- The report writer narrative remains gated until a separate milestone defines safe Persian Lilith reading copy.
- Mean Lilith, asteroid 1181 Lilith, Dark Moon/Waldemath Lilith, API claims, Swiss runtime claims, and fatalistic Lilith copy remain forbidden.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.245 Transit rules contract

- Sky Pulse's next real transit direction is a sky-only daily transit contract, not personalized natal-to-transit output yet.
- Phase-one bodies are Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn; lunar nodes, Lilith transits, houses, angles, Uranus, Neptune, and Pluto remain deferred.
- Phase-one aspects are conjunction, opposition, trine, square, and sextile with bounded orbs; unbounded or ad-hoc transit aspects remain forbidden.
- Daily pulse boundaries use a target-timezone local calendar day with Asia/Tehran as the initial contract timezone; natal-to-transit remains deferred until birth-data consent, timezone, and privacy paths are guarded.
- No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or SEO claim is approved yet.

## v0.1.246 Transit product scope sync

- Sky Pulse product scope is now both public and personal: public homepage Sky Pulse and personal report transit are both planned, while runtime transit calculation remains gated.
- The launch scope is free and no-login supported for both public daily sky pulse and user-entered birth-data personal transit previews; paid/private transit segmentation remains later-only.
- Iran launch uses Asia/Tehran only for homepage and personal report transit boundaries; user-selectable or user-location timezones remain deferred until a later non-Iran expansion.
- Phase-one transit bodies are Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto; lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points.
- Transit copy should be technical plus inspirational Persian copy and remain compatible with SEO phrases such as آسمان امروز, ترنزیت امروز, ترنزیت روزانه, ترنزیت امروز برای چارت تولد, and تأثیر آسمان امروز روی چارت تولد.
- No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or paid/private split is approved yet.

## v0.1.247 Sky-only transit calculation probe

- A probe-only sky transit calculator now samples the Iran-launch daily Sky Pulse at Asia/Tehran local noon and converts that local day boundary through the existing timezone conversion helper.
- The probe calculates local astronomy-engine geocentric ecliptic longitudes for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto, then finds phase-one aspects: conjunction, opposition, trine, square, and sextile with bounded orbs.
- The probe is not wired to the homepage Sky Pulse route, report narrative, chart wheel, API, dependency, account, payment, paid/private model, or personalized natal-to-transit runtime.
- Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points for transit.
- Public homepage Sky Pulse and personal report transit remain planned as free and no-login supported for the Iran/Tehran launch, with Persian SEO wording such as آسمان امروز, ترنزیت امروز, ترنزیت روزانه, ترنزیت امروز برای چارت تولد, and تأثیر آسمان امروز روی چارت تولد.

## v0.1.252 Natal-to-transit contract

- Public/Homepage Sky Pulse is already user-visible and hardened; this milestone continues the locked roadmap into Personal Transit instead of resetting Sky Pulse.
- Personal Transit advanced from scope decision to foundation contract only: the product label is آسمان امروز نسبت به چارت تولد تو, with SEO wording including ترنزیت امروز برای چارت تولد and تأثیر آسمان امروز روی چارت تولد.
- The contract remains free/no-login and Iran/Tehran-only for launch. It requires user-entered birth input and a real natal chart before any personal transit reading, but this milestone adds no calculation probe, no report data bridge, and no visible report section.
- Phase-one personal transit scope compares calculated current sky transit bodies to calculated natal chart bodies for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto using conjunction, opposition, trine, square, and sextile with bounded orbs.
- Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred. The contract forbids fake static personal daily claims, scary/fatalistic copy, external transit APIs, new runtime dependencies, account/payment gating, user-location expansion, and public homepage route changes.
- Stage status: Personal Transit is contract-only / foundation done. Next smallest step is v0.1.253 natal-to-transit calculation probe; v0.1.254 remains report data bridge; v0.1.255 remains first visible report section.

## v0.1.253 Natal-to-transit calculation probe

- Personal Transit advanced from contract to calculation probe without changing Homepage/Public Sky Pulse, report UI, report data bridge, account, payment, or SEO routes.
- Product correction synced: homepage Sky Pulse can remain Tehran-only, but personal report transits must compare the user's natal chart from birth place/time with the current sky for the user's current residence. There is no silent Tehran default for personal reports.
- The probe uses explicit birth place, birth time, timezone, and coordinates for natal placements, and explicit Iran current residence place/timezone/coordinates for the current transit context.
- If current residence is missing, the probe returns a missing-current-residence state rather than inventing personal precision.
- Phase one remains free/no-login, Iran current residence only, and uses Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto with conjunction, opposition, trine, square, and sextile. Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred.
- Stage status: Personal Transit is now calculation probe done; no report data bridge and no visible report section yet. Next: v0.1.254 Personal transit report data bridge.

## v0.1.254 Personal transit report data bridge

- Personal Transit advanced from calculation probe to report data bridge without resetting the roadmap.
- The bridge adds `personalTransitReportData` at `engineData.personalTransitReportData` as the report-data slot for personal transit output, while keeping the visible report section deferred to `v0.1.255`.
- The source remains the real natal-to-transit calculation probe: natal data comes from birth place, birth time, timezone, and coordinates; transit context comes from current residence / current living location.
- No silent Tehran default is allowed for personal reports. If current residence is missing, the bridge keeps a missing-current-residence state instead of inventing personal precision.
- This milestone does not change Homepage/Public Sky Pulse, does not add report UI, does not add account/payment/private logic, and does not add a new API or dependency.
- Stage status: Contract done, Calculation probe done, Data bridge done; First visible report section remains for `v0.1.255`.

## v0.1.255 Personal Transit First Visible Report Section

- Personal Transit advanced from report data bridge to the first visible report section without changing Homepage/Public Sky Pulse, calculation math, account, payment, privacy, API, or dependency scope.
- ReportCard now reads personal transit from engineData.personalTransitReportData and renders a guarded section titled آسمان امروز نسبت به چارت تولد تو when report data exists.
- The visible section preserves the corrected location policy: natal data comes from birth place and birth time, while transit context comes from current residence / current living location. There is no silent Tehran default for personal reports.
- If current residence is missing, the section shows a missing-current-residence state instead of inventing personal precision or fake daily claims.
- Stage status: Contract done, Calculation probe done, Data bridge done, First visible report section done; next locked step is post-v0.1.255-report-depth-and-synthesis.

## v0.1.256 Report depth/synthesis first pass

- Report depth/synthesis phase started after Public Sky Pulse and the Personal Transit first visible report section were completed.
- This milestone adds a first visible synthesis layer to the report reading experience: روایت ترکیبی گزارش.
- The section connects the three core cards, calculated aspect count, active technical report data, and the personal transit visible section without changing calculation math.
- It keeps the report honest: no fake daily claim, no silent Tehran default, no account/payment/private logic, and no homepage/Public Sky Pulse change.
- Scope: first pass only. Deeper narrative synthesis, richer chart-spine prose, and premium-feel report depth remain after this milestone.

## v0.1.257a Report detail inventory audit

- Current report detail reality after v0.1.256: the report page has hooks for real placements, aspects, retrograde source data, birth Moon phase, house rows with cusp labels, Lunar Nodes, Lilith, Personal Transit, and the first synthesis section.
- Current gap: these hooks are not yet all surfaced with the depth and order the user expects. Known gaps include inline motion in the placements-in-houses table, standalone Moon sign, visible house cusp degree/sign rows, standalone planet-placement prose before aspect prose, standalone aspect relationship prose, and deeper natal-vs-transit comparison.
- This audit intentionally does not claim the report detail page is complete. It records the inventory so later UI batches can be smaller and safer.
- Health/anatomy report copy remains a narrative/content requirement only with strict non-medical wording. It must not be treated as a calculation guarantee or medical claim.

## v0.1.258 Report detail visible facts panel

- Existing real-engine outputs for Moon placement, retrograde status, and house cusp degree/sign are now surfaced by a separate report-detail facts component.
- No engine calculation was changed in this milestone; the batch only exposes already-available report/engine fields.
- Known remaining gaps: inline motion inside the existing placements-in-houses table, standalone planet placement prose, standalone aspect relationship prose, deeper natal-vs-transit comparison, and deeper Lilith/Lunar Nodes narrative.

## v0.1.259 Standalone planet placement sections

Added a visible report-detail layer for standalone planet placement sections before aspect relationship prose. The scope is presentation/narrative only: no astrology calculation changes, no transit math changes, and no medical claims. Placement copy may include for-dummies examples, positive/challenge traits, interests, and symbolic anatomy/health language only when clearly framed as non-diagnostic.

Next report-detail batches should add standalone aspect relationship sections, then deepen natal-vs-transit comparison and Lilith / lunar-node narrative.

## v0.1.260 Standalone aspect relationship sections

- Added a componentized report-detail layer for standalone aspect relationship cards after the individual planet-placement sections and before the older compact aspect summary.
- The page now has a visible, user-friendly relationship reading for priority natal aspects with headings such as Sun sextile Moon / 60-degree style relationships, simple explanations, helpful side, growth side, and orb/trust copy.
- The batch does not change astrology calculation, transit calculation, Sky Pulse, account/payment, SEO/indexing, or medical/fatalistic claims.

## v0.1.261 Personal Transit Comparison Depth
- Added a deeper visible personal transit comparison section for natal chart vs today, using the existing `engineData.personalTransitReportData` bridge rather than changing transit math.
- The section keeps current residence as required for personal transit and preserves the no silent Tehran default rule.
- The UI now explains ready, missing-current-residence, and partial-no-aspects states with more useful interpretation, orb/trust copy, and non-fatalistic language.
- This remains report-detail work only: no Sky Pulse reset, no account/payment/private model work, and no SEO/indexing implementation.

<!-- personal transit comparison depth -->


## v0.1.262 Report Special Points Deep Narrative
- Added a componentized report-detail narrative section for Lilith and the lunar nodes / دست‌های ماه.
- This is the report special points deep narrative batch: Lilith and Nodes now get a deeper, human, non-fatalistic reading rather than remaining only technical rows.
- The section keeps Mean Node and True/Osculating Node labels separate and keeps the local True/Osculating Black Moon Lilith model explicit.
- Lilith trust copy states that this point is not Mean Lilith, asteroid 1181, or Waldemath/Dark Moon, and that the text is symbolic rather than medical, deterministic, or frightening.
- No astrology calculation, transit calculation, Sky Pulse, account/payment/private model, or SEO/indexing behavior changed.
<!-- report special points deep narrative -->
