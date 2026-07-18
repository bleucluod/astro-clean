# Halleus Idea Garden

Last updated: 2026-07-18
Authority checkpoint: `v0.1.333-wiki-queue-operations-ai-guide`
Checkpoint commit: `f6cc03e0fd37c6ea04acc6031ea2a2d28aab031c`

This file is the current product-decision garden. It records active, approved, shipped, and deferred ideas. It is not implementation evidence: live code, Git/VPS state, database state, and public verification remain separate.

Historical seed notes are preserved in Git history rather than kept as conflicting live instructions here.

## 1. Decision filter

Before selecting a new idea, ask:

1. Does it improve report value, trust, depth, or the core birth-data-to-report journey?
2. Does it preserve honest astrology and visible limitations?
3. Does it fit one small, independently verifiable batch?
4. Does it avoid reopening completed work or creating generic infrastructure?
5. Does it protect publication consent and private premium data?
6. Does it support the live Wiki without distracting from report value?
7. Does it avoid unverified transit claims, thin SEO pages, and premature payment complexity?

A seed is not `shipped` until a commit/tag and, when relevant, production smoke demonstrate it.

## 2. Non-negotiable product decisions

### Persian-first report product

Halleus is primarily a Persian birth-chart report and self-discovery product. The report—not a horoscope feed, engineering workbench, or generic content site—is the core product moment.

### Astrology integrity

- Calculations come from the engine and explicit contracts, never from AI invention.
- Text generation may explain and synthesize calculated data but must not fabricate placements, houses, aspects, transits, certainty, or scientific authority.
- Unknown birth time, polar limits, fallback generation, and other accuracy limits must remain visible.
- Sky Pulse or personal timing may expand only with a verified calculation/source layer.

### Publication and privacy model

```text
Guest report: public/indexable.
Logged-in free report: public/indexable.
Logged-in premium report: private/noindex by default.
Premium owner: explicit opt-in may make a selected report public/indexable.
Identifying details: optional and consent-based.
Analytics consent: never publication consent.
Admin: may restrict/unpublish, never force a private report public.
```

This model is approved product direction. Current report routes remain noindex until the publication, ownership, unpublish/delete, and indexing implementation is complete and verified.

### Wiki role

The Persian Wiki is a live, public, indexable knowledge surface and a report-support funnel. Preserve it. Add content selectively, with credible sourcing, internal links, and a clear path toward chart/report value. Do not turn it into a volume-only SEO factory.

### Product sequencing

Prioritize:

1. report quality and depth,
2. report generation and reading experience,
3. premium/private access model and public/free implementation,
4. Wiki work that supports report value,
5. later growth surfaces.

Defer broad SEO expansion, payment expansion, hosting changes, and generic infrastructure unless required by an active failure.

## 3. Current seed board

| Seed | Status | Product value | Risk | Current direction |
|---|---|---:|---:|---|
| Core Birth Report | active | very high | medium | deepen synthesis, reduce repetition, improve reading order and felt value |
| Real Chart Engine | shipped foundation / active hardening | very high | high | preserve Placidus, axes, retrograde, node, accuracy and fallback contracts |
| Report Generation Contract | shipped foundation / active | very high | medium | keep API contract canonical and fallback explicit |
| Report Detail as Product Moment | active | very high | medium | narrative first, technical detail available, mobile/desktop readability |
| Natal Chart Wheel | shipped foundation | high | medium | renderer only; stored Halleus data remains source of truth |
| Personal Transit Relevance | shipped foundation / bounded | high | high | keep claims bounded; no expansion without verified source |
| Accounts and Saved Reports | shipped foundation / active | high | medium | preserve ownership and local/account state separation |
| Guest/Free Public Reports | approved model / not fully implemented | very high | high | implement only with route, ownership, consent, unpublish/delete and index guards |
| Premium Private Reports | approved model / partial operations | very high | high | private by default; explicit owner publication option |
| Premium Access and Section Gating | next product area after report value/traffic | very high | medium-high | admin-configurable access to deeper report sections and comparisons |
| Secure Admin Core | shipped foundation | high | high | server capability and audit boundaries remain mandatory |
| Premium Request Operations | shipped foundation / manual bridge | high | medium | use as learning bridge before broad payment automation |
| Persian Wiki Public Surface | shipped and live | very high | medium | preserve indexing, quality, internal links, and report funnel |
| Wiki CMS and Publishing Queue | shipped foundation | high | high | operate through database state, audit, concurrency and dependency rules |
| Wiki AI Content Guide | shipped foundation | medium-high | medium | guide content; never replace editorial and source review |
| Public User Profiles | future | high | high | selected reports/current state only with explicit visibility controls |
| Public Cohort Pages | deferred | high | high | only after report model; avoid thin or duplicated pages |
| Persian Keyword Clusters | selective future research | high | medium | use live research and map to real page types, not keyword stuffing |
| Sky Pulse Expansion | blocked without verified source | high | high | retain only source-backed behavior |
| Payment and Automatic Entitlement | deferred | high | high | activate after offer, fulfillment, privacy and demand are clearer |
| PDF/Email Export | deferred | medium | medium | revisit after report structure stabilizes |
| Android/Capacitor App | future option | medium-high | medium | reuse the web product after core flows and offline boundaries are defined |
| Workflow Reliability and Speed | active operational seed | high | medium | remove duplicated runner orchestration and narrow impact plans safely |

## 4. Shipped foundations to preserve

These areas should not be reopened without a demonstrated product need or active failure:

- Persian/Jalali chart input and Iranian city/timezone flow.
- Astronomy-based Sun-through-Pluto calculations.
- Local Placidus runtime with explicit polar behavior.
- Calculated main axes and retrograde state.
- Local True/Osculating lunar-node path.
- Guarded technical Lilith output with interpretive narrative disabled while not approved.
- Canonical report-generation contract and safe fallback path.
- Saved report detail/history and account save/read foundations.
- Supabase-backed username/password account direction.
- VPS release directories, atomic current/previous links, service and smoke rollback.
- Public crawlable homepage and Wiki.
- Wiki Article/Breadcrumb metadata, canonical/index policy, sitemap inclusion, and Search Console verification.
- Privacy-conscious public analytics with opt-out and private-route exclusion.
- Secure admin membership, capabilities, audit, report restrictions, and premium-request operations.
- Database-backed Wiki storage, CMS, media, revisions, scheduling, queue operations, priority/position controls, and live content guide.

A shipped foundation may still be improved. “Preserve” means do not replace its architecture casually or repeat a completed migration.

## 5. Active product seeds

### 5.1 Core report value and depth

Goal: make a report feel worth returning to and eventually paying for.

Focus:

- stronger whole-chart synthesis,
- less section-to-section repetition,
- clearer relationship between placements, houses, and aspects,
- better reading sequence,
- practical and human Persian language,
- clear separation of narrative and technical facts,
- honest limits without making the report feel like a debug page,
- strong mobile experience.

Avoid:

- generic filler,
- more sections without more meaning,
- broad UI redesign unrelated to reading,
- changing engine math during copy-only work.

### 5.2 Premium depth and access

Approved direction:

- free users receive useful public reports,
- premium unlocks deeper private content,
- premium reports are private by default,
- users may explicitly publish selected premium reports,
- examples of premium value may include deeper text, planet-to-planet comparison, chart comparison/synastry, and richer technical views,
- admin should eventually control which sections/features require premium.

Sequence:

1. prove report value and stable sections,
2. define entitlement and visibility contracts,
3. add admin-configurable gating,
4. add payment/automatic entitlement only when operational readiness and demand justify it.

### 5.3 Public/free report implementation

Before any report becomes indexable, implement and verify:

- owner/guest identity model,
- public slug and canonical URL,
- publication consent copy,
- optional identifying details,
- birth-detail minimization rules,
- unpublish/delete flow,
- index/noindex transitions,
- sitemap behavior,
- admin restriction without forced publication,
- stale-cache/revalidation behavior,
- public rendering and abuse/privacy review.

Do not use analytics consent as a shortcut.

### 5.4 Wiki as report support

Good Wiki work:

- answers real Persian-language questions,
- uses trustworthy sources,
- links to relevant published articles,
- links naturally toward `/chart` or a report concept,
- supports report vocabulary and trust,
- respects the live queue and dependency/pillar model.

Bad Wiki work:

- thin bulk pages,
- duplicate cohort pages,
- unverified astrology claims,
- keyword stuffing,
- content work chosen only because tooling exists.

## 6. Deferred and blocked seeds

### Sky Pulse expansion

Blocked until a verified transit/calculation source supports the exact claim. Do not hardcode or generate “current sky” facts as if calculated.

### Public profiles

Future profile may expose selected reports, optional birth details, and a “current state” surface. Visibility must be per item and explicit. A profile is not a reason to make every report public.

### Synastry and chart comparison

High-value premium candidate, but do not start before the natal report contract, premium entitlement, and privacy model are stable.

### Payment expansion

Do not build broad checkout/entitlement infrastructure before the offer, pricing, fulfillment, refund/support, privacy, and premium request evidence are clear.

### Cohort SEO and mass page generation

Do not auto-generate city/month/sign combinations at scale. Revisit only with live keyword research, unique useful content, and anti-duplication rules.

### Generic infrastructure and polish

Do not create a platform layer, generic CMS, broad design system rewrite, or docs program unless it fixes a measured failure or enables the selected batch.

## 7. Current operational improvement seed

The project already has `check:plan`, `verify`, an impact registry, and a VPS release workflow. Current friction came mostly from duplicated runner orchestration, stale authority docs, broad Wiki impact mapping, line-ending assumptions, and untracked runner accumulation—not from repeated product defects.

The focused reliability/speed work should:

- make shared verification the only build/check execution path for runners,
- split impact areas by real runtime boundary,
- record guard timing,
- make tag/staged-state checks idempotent and behavior-tested,
- stop treating harmless native stderr as failure,
- keep Windows `.cmd` invocation centralized,
- remove successful runner artifacts from the repository root without staging them,
- retain full build for real runtime impact while avoiding it for proven docs-only changes.

This seed must remain focused. It is not permission for a generic CI or tooling rewrite.

## 8. Next sequence

1. Authority realignment: update this file and `docs/HALLEUS_PROJECT_CONTEXT.md`.
2. Workflow reliability and speed: narrow, evidence-based fixes only.
3. Resume report depth, synthesis, generation, and report-page experience.
4. Preserve the live Wiki; add content only when selected or supporting report value.
5. Implement premium gating and the approved visibility model from explicit contracts.
6. Revisit payment, profiles, synastry, app packaging, and broader SEO only after their prerequisites are met.

## 9. Change rule

Any change to product publication/privacy, report authority, engine source of truth, Wiki public status, or Sky Pulse source rules must update this file in the same approved decision batch. Analytics consent must never be used to alter publication consent.
