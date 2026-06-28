# Halleus Idea Garden

> Seed inventory for Halleus product ideas across the project chats.
> This document is a planning surface, not implementation evidence.
>
> Rule: a seed is not considered implemented until a later commit/tag explicitly ships it.

## Current checkpoint

- Current project checkpoint when this garden was created: `v0.1.85-context-record-seo-baseline`
- Current commit when this garden was created: `209bfe6`
- Latest completed product/code milestone before this garden: `v0.1.84-technical-seo-baseline`
- This document starts the garden only. It does not change app code, SEO code, astrology logic, reports, or routes.

## How to read seed status

- `untouched`: idea exists, no direct implementation yet.
- `touched`: some visible/product/code work exists, but not complete.
- `shipped`: implemented enough to treat as a completed milestone.
- `deferred`: intentionally postponed.
- `risky`: valuable, but needs careful design before code.

## Decision filter

Before developing any seed, decide:

1. Does it make the product feel more real to a first-time visitor?
2. Does it improve the core flow: birth data -> report -> saved detail -> fuller report request?
3. Can it be shipped as a small safe batch?
4. Does it avoid fake astrology, fake precision, and overclaiming?
5. Does it preserve the rule: astrology calculations/rules are separate from AI text naturalization?

## Seed board

| Seed | Status | Product value | Technical risk | MVP relevance | Best next step |
|---|---:|---:|---:|---:|---|
| Core Birth Report | touched | very high | medium | core | keep improving report clarity and reliability |
| Jalali-first Persian UX | touched | very high | medium | core | keep chart form simple and Persian-first |
| Saved Reports / Report History | touched | high | medium | core | make return-to-report behavior feel trustworthy |
| Report Detail as Product Moment | touched | very high | medium | MVP polish | add stronger proof/value and clearer next step |
| Fuller Report Manual Order | touched | high | medium | monetization bridge | keep order path simple until real payment/backend |
| Product / Pricing / Privacy Pages | touched | medium-high | low-medium | trust/sales | make copy concrete and user-facing |
| Technical SEO Baseline | touched | high | medium | pre-indexing | verify public domain, robots, sitemap, Search Console |
| Render / GitHub / Public State Tracking | touched | very high | low | ops | keep local/GitHub/Render/public states separate |
| Astrology Engine Layer | touched / risky | very high | high | post-MVP depth | design stable data contracts before more UI promises |
| Iran City Dataset | touched | high | medium | birth data foundation | verify completeness and future DB integration |
| Storage Adapter v1 | deferred | high | medium-high | post-local-storage | design after core local flow stays stable |
| Account / Dashboard / Admin / Payment | deferred | high | high | post-MVP | do not start before product flow and payment plan are clear |
| Email Notifications / PDF Export | deferred | medium-high | medium | post-MVP | keep as future retention/export features |
| Multilingual / Content / SEO Ecosystem | deferred | high | high | later growth | start only after Persian product has proof |
| Admin-controlled Feature Flags | touched conceptually | high | medium | platform foundation | keep features toggleable as product grows |
| Sky Pulse / Astro Weather | new / untouched / risky | very high | medium-high | homepage engagement | start with date card, not full transit engine |

---

## Seed details

### 1. Core Birth Report

- Status: `touched`
- Product value: `very high`
- Stage: `MVP core`

The central Halleus flow: the user enters birth date, time, and city; Halleus generates a Persian birth-chart style report; the report can be saved and read later.

Next smallest step:
- Keep improving the report reading experience and reduce anything that feels like a technical prototype.

Do not do yet:
- Do not rewrite the whole report engine while polishing UI.
- Do not make certainty, medical, legal, financial, or scientific claims.

### 2. Jalali-first Persian UX

- Status: `touched`
- Product value: `very high`
- Stage: `MVP core`

Halleus should feel native to a Persian-speaking user: Jalali date input, Persian copy, RTL layout, and no exposure of internal Gregorian/date conversion unless necessary.

Next smallest step:
- Keep `/chart` calm, clear, and user-facing.

Do not do yet:
- Do not replace public `/chart` with engine/workbench/lab UI.

### 3. Saved Reports / Report History

- Status: `touched`
- Product value: `high`
- Stage: `MVP core`

Saved reports make Halleus feel like a product, not a one-time form.

Next smallest step:
- Improve the user's sense that reports are preserved and can be revisited.

Do not do yet:
- Do not add accounts/database until local report flow remains stable.

### 4. Report Detail as Product Moment

- Status: `touched`
- Product value: `very high`
- Stage: `MVP polish`

The report detail page is where the user should feel the value of Halleus. Recent work made it more product-like, but it can still become more emotionally clear, structured, and convincing.

Next smallest step:
- Add better proof/value, clearer sections, and a natural path to a fuller report.

Do not do yet:
- Do not touch `ReportCard` unless absolutely necessary.

### 5. Fuller Report Manual Order

- Status: `touched`
- Product value: `high`
- Stage: `MVP monetization bridge`

Manual order flow lets Halleus test paid interest before real payment/backend.

Next smallest step:
- Keep the flow simple: report -> request fuller version -> manual follow-up.

Do not do yet:
- Do not add real payment before privacy, pricing, fulfillment, and backend decisions are clear.

### 6. Product / Pricing / Privacy Pages

- Status: `touched`
- Product value: `medium-high`
- Stage: `trust/sales`

These pages help users understand what Halleus is, what is free, what is fuller/paid, and how privacy works.

Next smallest step:
- Make the copy specific and concrete, with less internal/MVP wording.

Do not do yet:
- Do not over-explain technical architecture to end users.

### 7. Technical SEO Baseline

- Status: `touched in v0.1.84`
- Product value: `high`
- Stage: `pre-indexing`

The project now has a stronger technical SEO baseline: metadata/canonical direction, public sitemap route choices, and a safer default site URL.

Next smallest step:
- Verify the deployed public site: `/robots.txt`, `/sitemap.xml`, canonical URLs, and latest Render deploy.

Still open:
- Render/public domain verification.
- Search Console verification.
- Sitemap submission.
- Decide if internal/debug routes need `noindex` policy.

Do not do yet:
- Do not assume GitHub push equals Render deploy.
- Do not assume `Halleus.ir` is live/indexed unless verified.

### 8. Render / GitHub / Public State Tracking

- Status: `touched`
- Product value: `very high`
- Stage: `ops`

Local state, GitHub state, Render deploy state, and public site state must always be tracked separately.

Next smallest step:
- Add public verification after SEO baseline.

Do not do yet:
- Do not mark a milestone public/live unless the public URL is smoke-tested.

### 9. Astrology Engine Layer

- Status: `touched / risky`
- Product value: `very high`
- Stage: `post-MVP depth`

Direction: Astronomy Engine can provide sky/planet data; Halleus needs its own astrology layer for zodiac mapping, degrees, houses, aspects, chart normalization, interpretation mapping, safety copy, and Persian wording.

Next smallest step:
- Define stable data contracts before adding more features to UI.

Do not do yet:
- Do not let AI invent astrology calculations.
- Do not mix calculation rules with text naturalization.
- Do not promise precise transit/personal timing before the engine is ready.

### 10. Iran City Dataset

- Status: `touched`
- Product value: `high`
- Stage: `birth data foundation`

A strong city dataset supports better birth location input and future chart accuracy.

Next smallest step:
- Verify the city dataset and keep it stable before database migration.

Do not do yet:
- Do not rebuild location input without checking the existing dataset and chart form.

### 11. Storage Adapter v1

- Status: `deferred`
- Product value: `high`
- Stage: `post-local-storage foundation`

A storage adapter can help move from local-only data toward a future backend without rewriting product surfaces.

Next smallest step:
- Design the adapter only after core local flows are stable.

Do not do yet:
- Do not introduce backend complexity before the MVP product flow is convincing.

### 12. Account / Dashboard / Admin / Payment

- Status: `deferred`
- Product value: `high`
- Stage: `post-MVP platform`

Future platform features: user accounts, dashboard, admin tools, real database, real payment, fulfillment tracking.

Next smallest step:
- Keep the manual order bridge until the product offer is clear.

Do not do yet:
- Do not start auth/payment/admin before launch-readiness and fulfillment logic are clear.

### 13. Email Notifications / PDF Export

- Status: `deferred`
- Product value: `medium-high`
- Stage: `retention/export`

Future useful features: send report links, export reports, generate PDF, notify users about fuller reports.

Next smallest step:
- Revisit after reports and manual orders feel valuable.

Do not do yet:
- Do not add email or PDF before report structure stabilizes.

### 14. Multilingual / Content / SEO Ecosystem

- Status: `deferred`
- Product value: `high`
- Stage: `growth`

Long-term vision: Persian-first platform that can grow into content, social, SEO, possibly multilingual pages and educational astrology material.

Next smallest step:
- Make the Persian core product lovable first.

Do not do yet:
- Do not start content sprawl before the main product converts.

### 15. Admin-controlled Feature Flags

- Status: `touched conceptually`
- Product value: `high`
- Stage: `platform foundation`

The user wants capabilities to be admin-toggleable and scalable over time.

Next smallest step:
- Keep this as an architecture rule when adding future modules.

Do not do yet:
- Do not build a full admin system now.

### 16. Sky Pulse / Astro Weather

- Status: `new / untouched / risky`
- Product value: `very high`
- Stage: `homepage engagement + future report depth`

A living homepage section that shows today's date and a compact sky/astrology weather pulse. This can make Halleus feel alive instead of static.

Desired user-facing behavior:
- Show today's date on the homepage.
- Prefer Persian/Jalali date presentation, with Gregorian only if useful.
- Mention leap-year context when relevant.
- Give a very short pulse for the current month, week, or day.
- Show important transits briefly.
- For each transit: short influence, how to use the energy, and what not to do.
- Keep the homepage version compact.
- Put fuller personalized interpretation inside the chart report later.

Architecture direction:
1. `Today/date module`: runtime current date, Jalali date, leap-year awareness.
2. `Sky pulse data model`: important transits with date range, intensity, theme, use-this-energy, avoid-this.
3. `Astrology calculation/source layer`: eventually compute real transits; do not fake them as calculated.
4. `Copy layer`: short Persian user-facing explanations.
5. `Homepage card`: compact teaser.
6. `Report section`: fuller personalized version later.

Next smallest step:
- Start with a homepage date/pulse placeholder card that is honest and does not claim real transit calculation yet.

Do not do yet:
- Do not hardcode fake transits as if they are real.
- Do not implement the full transit engine before defining data contracts.
- Do not overload the homepage with a full report.

---

## Suggested next sequence

1. `v0.1.87-homepage-sky-pulse-date-card`
   - Add a small living date card to the homepage.
   - Show today/Jalali/leap-year-aware copy.
   - No real transit claims yet.

2. `v0.1.88-sky-pulse-transit-model`
   - Define a safe data model for future transit summaries.
   - Keep calculations/source separate from copy.

3. `v0.1.89-homepage-real-product-proof`
   - Add proof/sample/value to the homepage.
   - Clarify free vs fuller report.
   - Make homepage feel like a real product.

4. Render/public SEO verification
   - Verify deployed URL, `/robots.txt`, `/sitemap.xml`, canonical URLs, and Search Console readiness.

## Not implemented yet

The following are ideas only at the time this file was created:

- `Sky Pulse / Astro Weather`
- Real transit calculation
- Personalized transit report section
- Search Console verification/submission
- Real payment/backend/account system
- Full admin system
- PDF/export/email notifications

