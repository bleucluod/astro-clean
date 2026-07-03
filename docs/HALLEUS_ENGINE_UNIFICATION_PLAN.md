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
