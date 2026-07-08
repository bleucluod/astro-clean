# Halleus Report Engine Unification Plan

Version: v0.1.92-report-engine-unification-plan
Date: 2026-06-28
Baseline HEAD: dcda684
Baseline tag: v0.1.91-engine-reality-audit
Plan type: docs-only, no code changes

## Safety Gate

Current HEAD at plan start: `dcda684`
Latest tag at plan start: `v0.1.91-engine-reality-audit`
Inspected files: `docs/HALLEUS_ENGINE_REALITY_AUDIT.md`, `docs/HALLEUS_IDEA_GARDEN.md`, `components/ChartForm.tsx`, `app/api/engine/real-chart/route.ts`, `lib/astrology`, `lib/report-output`, `src/lib/chart`, `src/lib/report-output`, `types`, and `package.json` from the uploaded v0.1.92 audit ZIP.
Allowed file for this batch: `docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md` only.
Forbidden files for this batch: all app, components, lib, src, types, scripts, package, context, and Idea Garden files.
Apply checks: `pnpm run check:encoding` and `git --no-pager diff --check`.

## Executive decision

The next implementation work should **unify the report generation path before building public/free/private SEO reports**.

Halleus has a real-ish chart calculation layer, but the user-facing report still has split responsibilities:

```text
ChartForm builds a mock-first report
/api/engine/real-chart builds richer normalized chart data
ChartForm currently keeps only a legacy realEngine snapshot from that API
real chart enrichment/copy blocks from the API are not yet the canonical saved report path
V2/V3 report outputs still identify as preview
```

The safest next product move is not more homepage polish and not public report SEO routes yet. The next move is to create a single, explicit report generation contract that owns:

```text
birth input normalization
real chart calculation
fallback behavior
chart enrichment
Persian report copy
saved report shape
generation status
future public/private visibility metadata
```

## Current live flow that must be unified

The current primary `/chart` flow is:

```text
ChartForm
  -> parse Jalali date into Gregorian ISO
  -> select Iran city / timezone / latitude / longitude
  -> POST /api/engine/real-chart
  -> createMockReport(normalizedForm)
  -> enhanceReportOutputV2(mock report)
  -> attachRealEngineSnapshotToReport(...)
  -> enrichReportWithRealEngineCopy(...)
  -> saveGeneratedReport(...)
  -> /reports/[reportId]
```

This is functional, but it has two mismatches:

1. The report starts from `createMockReport`.
2. The API route returns richer data (`normalizedChart`, `chartReportEnrichment`, `copyBlocks`, `report`) that the public form does not fully persist as the canonical saved report.

## Current real engine pieces

### Real chart API

`app/api/engine/real-chart/route.ts` calls `buildRealChartWorkbenchResult` from `src/lib/chart/real-chart-engine`.

The route returns:

```text
ok
realChart
chartReportEnrichment
copyBlocks
report
```

This route is useful, but it still has a workbench/prototype naming shape.

### Real chart calculation

`src/lib/chart/real-chart-engine.ts` currently calculates:

```text
Sun
Moon
Mercury
Venus
Mars
Jupiter
Saturn
Uranus
Neptune
Pluto
approximate ascendant
equal-house normalized chart scaffold
major aspects through normalized chart
```

It uses `astronomy-engine` for geocentric ecliptic longitude and uses JavaScript `Intl` timezone behavior for the birth timezone conversion.

Important limitation already declared in code:

```text
Ascendant and houses are approximate equal-house scaffolding until final house-system hardening.
```

### Legacy report enrichment

`components/ChartForm.tsx` currently transforms the API result into a legacy `RealEngineReportSnapshot` with:

```text
version: "real-engine-preview-v1"
generatedAt
cityLabel
utcIso
ascendantLongitude
placements
note
```

Then `lib/astrology/real-engine-report-writer.ts` builds real-engine summary and interpretations from that legacy snapshot.

### Newer report enrichment

`src/lib/report-output/chart-enrichment.ts` and `src/lib/report-output/real-chart-report-copy.ts` already create a richer data-driven structure from `NormalizedChart`.

This newer pathway is closer to the future product architecture, but it is not yet the canonical saved report path in `/chart`.

### Preview report outputs

`lib/report-output/report-v2.ts` and `lib/report-output/report-v3.ts` still present the sectioned report as preview-oriented output.

This is acceptable while the engine is being hardened, but it must be renamed and upgraded before public/indexable report pages claim real value.

## Unification goals

The unified report generation path should produce one canonical report object with:

```text
input
normalizedChart
chartReportEnrichment
realEngineSnapshot or equivalent legacy bridge
copyBlocks
interpretationSections
outputQuality
generationStatus
safetyNote
visibility metadata placeholder
SEO metadata placeholder
```

The goal is not to remove all fallback behavior. The goal is to make fallback behavior explicit and product-safe.

## Proposed canonical generation status

Future report generation should distinguish these states:

```text
real-chart-ready
real-chart-partial
fallback-preview
blocked-invalid-input
```

Meaning:

- `real-chart-ready`: placements, timezone, approximate houses, and enrichment are available.
- `real-chart-partial`: placements exist, but houses/timezone/enrichment are incomplete or limited.
- `fallback-preview`: real chart calculation failed, but safe preview copy was generated.
- `blocked-invalid-input`: report should not be saved because required birth input is invalid.

## Privacy and SEO model should wait for this contract

The public/free/private SEO strategy is valuable, but it should not be implemented on top of the current split report flow.

Before public reports become indexable, the report object must know:

```text
isPublic
visibility: public/free/private/paid/manual
nickname
publicSlug
indexingStatus
consentCapturedAt
seoTitle
seoDescription
keywordClusterId
cohortKeys
```

These fields should be designed after the engine generation contract is stable enough to support public pages without misleading users.

## Recommended implementation sequence

### v0.1.93-report-generation-contracts

Type-only or nearly type-only batch.

Create the canonical types for:

```text
ReportGenerationStatus
ReportCalculationSource
GeneratedReportEngineData
GeneratedReportVisibility
GeneratedReportSeoDraft
```

This should avoid changing visible UI.

Candidate files:

```text
types/astro.ts
types/report-output.ts
possibly new types/report-generation.ts
```

Checks:

```text
pnpm run check:encoding
git --no-pager diff --check
pnpm build
```

### v0.1.94-report-generation-service

Create a single report generation service.

Candidate new file:

```text
lib/reports/report-generation-service.ts
```

or, if the project favors the newer `src/lib` tree:

```text
src/lib/report-output/report-generation-service.ts
```

Responsibilities:

```text
accept normalized BirthInput + city/timezone context
call or consume real-chart calculation result
build normalized chart enrichment
build real chart report copy
build V2/V3 sections from real data when available
fall back explicitly when calculation fails
return one canonical report object
```

This service should be unit-like and not require React.

### v0.1.95-chart-form-uses-generation-service

Wire `ChartForm` to the service.

Goals:

```text
remove mock-first responsibility from ChartForm
keep UI submit behavior stable
keep Jalali UX unchanged
keep city/timezone flow unchanged
preserve safe fallback
save one canonical generated report
```

Forbidden in this batch:

```text
public report SEO routes
payment/private paid logic
wiki generation
large homepage changes
```

### v0.1.96-report-detail-uses-generation-status

Update report detail UI so it explains report status honestly.

Examples:

```text
This report is based on calculated chart data.
This report has partial chart data.
This report used a safe fallback preview because calculation was unavailable.
```

This prevents the product from overclaiming.

### v0.1.97-public-private-report-model

Only after the generation path is unified, design the public/free/private model.

Fields to introduce:

```text
visibility
publicConsent
nickname
publicSlug
seoCohortKeys
indexingPolicy
```

This prepares the later public SEO pages without exposing private data.

### v0.1.98-public-report-url-and-cohort-plan

Design public report URL surfaces.

Potential URL patterns to evaluate:

```text
/reports/public/[slug]
/birth-chart/[slug]
/chart-reports/[cohort]/[slug]
```

Cohort examples:

```text
dey-born-shiraz
sun-capricorn-shiraz
moon-cancer-tehran
birth-chart-dey-shiraz
```

Do not ship these routes until privacy/consent copy and deletion/unpublish behavior are designed.

### v0.1.99-persian-keyword-cluster-research

Use live web research for Persian astrology keyword clusters.

Do not invent "latest Google clusters" from memory.

Outputs should map:

```text
keyword cluster -> wiki article -> report section -> public report cohort -> CTA
```

## Implementation boundaries

### Keep for now

- The safe fallback route.
- The existing local report storage until public/private storage is designed.
- The real chart API as an internal calculation endpoint.
- The ability to save a report even if real calculation fails, but make the status explicit.

### Stop treating as final

- `createMockReport` as the main report origin.
- `real-engine-preview-v1` as the long-term public engine name.
- V2/V3 `preview` labels as final output versions.
- Workbench/prototype routes as product evidence.

### Do not do yet

```text
Do not create public indexable report pages yet.
Do not connect Search Console yet.
Do not auto-index user reports yet.
Do not claim precise house or transit accuracy yet.
Do not write SEO copy into personal reports until consent and visibility are explicit.
Do not put real names in public report URLs.
```

## Product copy rule for the transition

Until the engine is unified and privacy model exists, product copy should say:

```text
Halleus uses calculated chart data where available and keeps the report reflective, symbolic, and transparent about limitations.
```

Avoid saying:

```text
fully accurate natal chart
final professional astrology report
indexed public personal chart report
private paid report
```

unless the corresponding code and consent model exist.

## Recommended next batch

The next batch after this plan should be:

```text
v0.1.93-report-generation-contracts
```

It should be small enough to build safely, but large enough to move the project toward a real product foundation.

Suggested Safety Gate for v0.1.93:

```text
Allowed files:
- types/report-generation.ts or equivalent
- types/astro.ts only if needed
- types/report-output.ts only if needed

Forbidden files:
- ChartForm
- /api/engine/real-chart route
- report detail UI
- public report routes
- wiki routes
- SEO config

Checks:
- pnpm run check:encoding
- git --no-pager diff --check
- pnpm build
```

## Success criteria for v0.1.93

```text
Build passes.
No visible UI changes.
Canonical generation statuses exist.
Future public/private SEO fields have a safe placeholder model.
No user data is made public.
No report-generation implementation is changed yet.
```

## v0.1.154 full report completion blueprint alignment

The report-engine unification path should now treat the complete natal report as the primary product foundation. Public/free SEO reports, paid/private packaging, wiki growth, and chart-wheel polish should wait until the canonical report data surface is reliable enough.

Canonical sequence:

```text
Data contract -> engine calculation -> snapshot storage -> QA checks -> report prose -> report UI -> chart wheel
```

Target canonical snapshot fields:

```text
chartMeta
birthData
timeContext
placements
houses
angles
aspects
retrogrades
lunarNodes
lilith
calculationQuality
limitations
```

House/axis direction:
- Whole Sign is the default serious MVP house system because it is a real astrological system, works well for clear Persian report prose, and can be hardened before advanced house-system options.
- ASC and MC must be calculated from birth time, location, timezone, and date.
- DSC should derive from ASC + 180 degrees, with method metadata.
- IC should derive from MC + 180 degrees, with method metadata.
- MC/IC must remain independent angle data; do not collapse them into house 10/house 4 assumptions.
- Placidus or other advanced systems can be added later only after validated calculation support and QA fixtures exist.

Implementation rules:
- Shared types should be widened before UI consumes new fields.
- The engine should fill the canonical snapshot before writer/UI/chart wheel read from it.
- QA should fail when a user-facing section claims a data layer that the snapshot does not provide.
- Missing birth time should degrade gracefully and hide/limit houses and angles rather than inventing them.
- The saved report path should stop depending on mock-first report generation before public/indexable report promises are made.

Immediate next buildable step after this blueprint:
- v0.1.155 complete natal chart data contract, scoped to shared types and static guards, with no UI promises yet.

## v0.1.163 special points implementation gate

Nodes and Lilith are gated behind a real source milestone.

Next valid implementation sequence:

1. Select a validated source for natal North Node longitude and document its method.
2. Store North Node as a real ecliptic longitude and South Node as North Node + 180 degrees.
3. Decide whether Halleus uses Mean Lilith or True Lilith; do not mix labels.
4. Add source-level QA fixtures before UI/writer output.
5. Only then expose Nodes/Lilith in snapshot, ReportCard, report writer, and chart wheel.

The current astronomy-engine event helpers are useful audit clues but are not sufficient as a natal report point source.

## v0.1.164 special points source decision

Special points now have a concrete implementation decision:

- The current runtime engine remains `astronomy-engine`.
- No Swiss Ephemeris wrapper is approved for runtime use yet.
- Nodes should be implemented before Lilith because South Node can be derived from a validated North Node opposition, while Lilith needs an explicit Mean/True decision.
- The next buildable implementation milestone should be a Node-only hidden source spike with fixtures, not UI copy.
- Lilith remains a separate milestone and must not share labels or assumptions with lunar apsis event APIs.

Next valid sequence:

1. Add a documented North Node longitude source behind checks.
2. Add fixtures for at least a few known dates and longitude bounds.
3. Fill `realEngine.lunarNodes` only after checks pass.
4. Then add ReportCard, writer, and wheel support for Nodes.
5. Decide Mean Lilith vs True Lilith before any Lilith implementation.

## v0.1.165 true vs mean node implementation path

Node source decision:

- The next implementation milestone should be a Node-only Mean Lunar Node implementation, not a combined Nodes/Lilith batch.
- This is a practical source decision, not a downgrade: Mean Lunar Node is a real, disclosed calculation model; it is just not the same as True/Osculating Node.
- True/Osculating Node should stay deferred until a validated source or dependency gate exists.

Build sequence for the next code batch:

1. Widen shared node types so `realEngine.lunarNodes` can represent calculated Mean North/South Node data instead of only a deferred calculation.
2. Add `calculateMeanNorthNodeLongitude(date)` near the real chart engine utilities with a code comment for the J2000 formula.
3. Add node output to the real chart workbench result without touching Lilith.
4. Convert Mean North/South Node into the saved `realEngine` snapshot with method `mean-lunar-node-j2000-meeus-formula`.
5. Set `calculationQuality.nodesStatus` to `calculated` only when both North and South Node longitudes exist.
6. Add QA fixtures that verify normalization, exact 180-degree South Node opposition, method label, and that Lilith remains deferred.
7. Only after the snapshot is real, expose a small ReportCard/writer section labeled Mean Lunar Node.

Do not do in the next Node implementation:

- Do not call the Mean Node simply North Node without model disclosure.
- Do not implement or show True Node from `SearchMoonNode` event helpers.
- Do not add Swiss Ephemeris runtime dependencies in the same batch.
- Do not unblock Lilith until Mean/True Lilith is separately chosen and sourced.

## v0.1.228 true node vector validation path

- Merge the feasibility probe into a validation harness before any product output changes.
- Add `check:true-node-vector-validation` to keep the vector candidate executable and bounded.
- Keep Mean Lunar Node as the only product lunar-node output for now.
- Do not integrate True/Osculating Node into real chart output until independent fixtures pass.
- Do not change South Node semantics in product output; current South Node remains derived from the approved Mean North Node + 180.
- If independent fixtures fail or remain unavailable, keep True/Osculating Node deferred.

## v0.1.230 local True Node disabled adapter path

The next True Node work should build from the local internal adapter rather than duplicating vector math in product paths.
Keep the adapter behind a disabled/internal gate until offline reference fixtures and an approval contract are available.
Do not connect the adapter to birth chart output, report writer output, chart wheel labels, or shared report types in this milestone.
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
