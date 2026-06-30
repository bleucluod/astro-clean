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
- Latest garden update planned after `v0.1.89-homepage-product-proof`: add public/free report SEO strategy, paid/private report strategy, keyword-cluster research, and wiki-to-report growth funnel as seeds only.

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
| Saved Reports / Report History | touched | high | medium | core | move from local-only history to server-saved report snapshots |
| Report Detail as Product Moment | touched | very high | medium | MVP polish | add stronger proof/value and clearer next step |
| Fuller Report Manual Order | touched | high | medium | monetization bridge | keep order path simple until real payment/backend |
| Product / Pricing / Privacy Pages | touched | medium-high | low-medium | trust/sales | make copy concrete and user-facing |
| Technical SEO Baseline | touched | high | medium | pre-indexing | verify public domain, robots, sitemap, Search Console |
| Render / GitHub / Public State Tracking | touched | very high | low | ops | keep local/GitHub/Render/public states separate |
| Astrology Engine Layer | touched / risky | very high | high | post-MVP depth | design stable data contracts before more UI promises |
| Iran City Dataset | touched | high | medium | birth data foundation | verify completeness and future DB integration |
| Storage Adapter v1 | touched | high | medium-high | database MVP | keep repository contract stable while adding server persistence |
| Account / Dashboard / Admin / Payment | deferred | high | high | post-MVP | do not start before product flow and payment plan are clear |
| Email Notifications / PDF Export | deferred | medium-high | medium | post-MVP | keep as future retention/export features |
| Multilingual / Content / SEO Ecosystem | deferred | high | high | later growth | start only after Persian product has proof |
| Admin-controlled Feature Flags | touched conceptually | high | medium | platform foundation | keep features toggleable as product grows |
| Sky Pulse / Astro Weather | new / untouched / risky | very high | medium-high | homepage engagement | start with date card, not full transit engine |
| Public Free Reports as SEO Surface | new / risky | very high | high | SEO growth + free tier | design consent, nickname, slug, and indexability rules before code |
| Paid Private Reports | new / risky | very high | medium-high | monetization + trust | define private/noindex report behavior and paid upgrade promise |
| Public Cohort Report Pages | new / risky | very high | medium | safer SEO growth | design non-personal pages like Dey-born users in Shiraz |
| Persian Keyword Cluster Research | new / untouched | very high | medium | content/SEO foundation | do live keyword research before writing wiki/report templates |
| Wiki-to-Report SEO Funnel | new / untouched | very high | medium | growth | map each wiki cluster to chart/report CTAs and public report templates |
| Public Report Privacy and Consent System | new / risky | very high | high | trust/compliance | require explicit public-share consent, nickname, and unpublish rules |

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
- Do not add full accounts/auth/public report database complexity before server-saved report persistence is working.

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

### 17. Public Free Reports as SEO Surface

- Status: `new / risky`
- Product value: `very high`
- SEO value: `very high`
- Stage: `growth + free tier strategy`

Free reports can become public, indexable SEO surfaces instead of only private one-off outputs. The free tier may require the user to publish/share an indexable version of the report, while the paid tier can unlock private/noindex reports and deeper personalization.

Core idea:
- Free report: public, indexable, nickname allowed, SEO-friendly.
- Paid report: private option, noindex/private by default, deeper and more personal.
- Public page examples:
  - birth chart report for Dey-born users in Shiraz.
  - astrology report for a nickname, with sensitive details minimized.
  - cohort pages such as Dey-born users in Shiraz, not tied to one individual.

Product rationale:
- Turns each free report into a possible long-tail organic entry point.
- Gives the user value without payment while giving Halleus public content surface.
- Creates a natural paid upgrade: privacy + depth + fuller reading.

Privacy/consent requirements:
- The free flow must explicitly say that the generated free report will be public and indexable.
- The user must be able to use a nickname instead of a real name.
- Do not expose sensitive personal details unnecessarily.
- Consider hiding or generalizing exact birth time on public pages.
- Provide unpublish/delete instructions before relying on this at scale.
- Never make a report public by surprise.

Next smallest step:
- Design the public/private report data contract and consent copy before any public route is created.

Do not do yet:
- Do not index user-generated reports before consent/privacy/product language is clear.
- Do not create public report URLs before engine quality and report structure are more trustworthy.

### 18. Paid Private Reports

- Status: `new / risky`
- Product value: `very high`
- Stage: `monetization + trust`

The paid tier should make privacy and depth part of the value proposition.

Paid/private behavior:
- Private report option.
- Noindex/private status for paid/private reports.
- More detailed interpretation than the public/free version.
- Clearer personal sections and less SEO-shaped text.
- Potential manual order bridge until payment/backend exists.

Next smallest step:
- Define report visibility states: `public_free`, `private_paid`, `unlisted`, `draft`, `unpublished`.

Do not do yet:
- Do not implement payment/private storage before the report model and consent UX are designed.

### 19. Public Cohort Report Pages

- Status: `new / risky`
- Product value: `very high`
- SEO value: `very high`
- Stage: `safer SEO growth`

A safer alternative or companion to individual public reports: generate pages around cohorts instead of one person's report.

Examples:
- گزارش چارت تولد دی‌ماهی‌ها در شیراز
- تحلیل کلی متولدین فروردین در تهران
- چارت تولد با تاکید روی شهر تولد و ماه تولد
- راهنمای خواندن گزارش چارت تولد برای متولدین یک ماه

Why this matters:
- Cohort pages can target long-tail keywords without exposing one person's full report.
- They can link into `/chart` as a personalized next step.
- They can become part of the wiki/content system.

Next smallest step:
- Design URL and title patterns for cohort pages separately from individual report pages.

Do not do yet:
- Do not auto-generate thin/duplicate pages at scale.
- Do not create pages that feel like spam or keyword stuffing.

### 20. Persian Keyword Cluster Research

- Status: `new / untouched`
- Product value: `very high`
- Stage: `content and SEO foundation`

Before serious indexing or wiki scaling, Halleus needs live keyword research around Persian astrology, birth chart, transit, zodiac, houses, planets, and report intent.

Research goals:
- Find Persian long-tail clusters.
- Separate informational intent from report-generation intent.
- Map each cluster to a page type:
  - wiki article
  - public cohort page
  - public free report template
  - chart/report CTA page
- Use keywords naturally inside report and wiki copy.
- Avoid keyword stuffing.

Important rule:
- Do not invent "latest Google clusters" from memory. This must be a live research batch using current search results, search suggestions, and competitor/content patterns.

Next smallest step:
- Run a dedicated keyword research batch and produce a cluster map before writing large wiki content.

Do not do yet:
- Do not publish a large wiki cluster based only on assumptions.

### 21. Wiki-to-Report SEO Funnel

- Status: `new / untouched`
- Product value: `very high`
- Stage: `growth architecture`

Wiki content should not be isolated. Each article should connect to the report product.

Funnel examples:
- Article: خانه هفتم در چارت تولد -> CTA to relationship section in personal report.
- Article: ونوس در چارت تولد -> CTA to love/values reading.
- Article: مرکوری رتروگرید -> CTA to Sky Pulse and personal timing.
- Article: چارت تولد چیست -> CTA directly to `/chart`.

Next smallest step:
- Design article template with internal links, product CTA blocks, and related-report links.

Do not do yet:
- Do not write many articles before the template and keyword map exist.

### 22. Public Report Privacy and Consent System

- Status: `new / risky`
- Product value: `very high`
- Stage: `trust foundation`

Public/free SEO reports require explicit consent and strong user-facing language.

Required UX concepts:
- Public/free choice explained before submit.
- Nickname field instead of real-name requirement.
- "This report may be public and indexable" checkbox.
- Paid/private alternative explained clearly.
- Unpublish/delete request path.
- No accidental indexing of private reports.

Next smallest step:
- Draft the consent copy and report visibility states before route/code work.

Do not do yet:
- Do not build public indexable user pages until this seed is designed and accepted.


## Suggested next sequence

1. `v0.1.90-idea-garden-public-report-seo`
   - Record public/free report SEO strategy, paid/private report strategy, consent risk, keyword-cluster research, and wiki-to-report funnel in this garden.
   - Docs only.

2. `v0.1.91-engine-reality-audit`
   - Audit what the astrology/report engine actually calculates now.
   - Separate real computed data from copy/naturalization.
   - Identify gaps: houses, aspects, degrees, retrograde, timezone/city accuracy, public report readiness.

3. `v0.1.92-report-visibility-and-seo-model`
   - Design report visibility states: public free, private paid, unlisted, unpublished.
   - Design consent copy, nickname behavior, noindex/private behavior, and public slug fields.
   - No public route yet.

4. `v0.1.93-public-report-url-and-cohort-plan`
   - Design URL patterns for public reports and cohort pages.
   - Compare individual public report pages vs safer cohort pages like Dey-born users in Shiraz.
   - Define sitemap/noindex rules.

5. `v0.1.94-persian-keyword-cluster-research`
   - Live keyword research for Persian astrology/search intent.
   - Produce cluster map for wiki, public report templates, and chart/report CTAs.
   - Do not rely on memory for "latest Google clusters."

6. `v0.1.95-wiki-content-system`
   - Build article data model, wiki index, article template, internal linking, and CTA blocks.
   - Keep it cluster-driven.

7. `v0.1.96-engine-depth-foundation`
   - Make the report engine deeper before scaling public/indexable reports.
   - Improve report structure around computed placements/aspects/houses if available.

8. `v0.1.97-public-free-report-prototype`
   - First public/free report prototype with explicit consent and nickname.
   - Not before report visibility and privacy rules are accepted.

## Not implemented yet

The following are ideas only at the time this file was created:

- `Sky Pulse / Astro Weather`
- Real transit calculation
- Personalized transit report section
- Search Console verification/submission
- Public/free indexable report pages
- Paid/private report mode
- Public report consent system
- Public cohort pages such as month/city pages
- Persian keyword cluster research
- Wiki-to-report SEO funnel
- Large wiki content cluster
- Real payment/backend/account system
- Full admin system
- PDF/export/email notifications



---

## v0.1.106 Database MVP decision

Decision:

```text
Proceed with Database MVP as server-saved report persistence.
Do not treat this as the final user profile, auth, payment, or public report schema.
The first database implementation should store versioned report snapshots and keep reports private/noindex by default.
Manual fuller-report requests can be persisted after report save/read works.
Public/indexable report behavior remains blocked until explicit consent UX and public/private route design are accepted.
```

Reason:

```text
The local report flow is stable enough to justify persistence work.
Persistence is now more launch-critical than more UI/report-copy polish.
A snapshot-first database model keeps the project scalable while report depth and profile design continue evolving.
```

Next smallest step:

- Choose and implement the database connection/driver behind the existing contracts.

Do not do yet:

- Do not implement final profiles/accounts/payment/public reports in the first database batch.


---

## v0.1.109 Database repository implementation note

Decision:

```text
Continue Database MVP by implementing the database repository behind the existing storage contract.
Do not switch active UI storage to database yet.
Do not add profiles/auth/payment/public reports in this repository batch.
```

Why:

```text
The core flow needs server persistence, but the browser product flow should remain stable until a controlled server save/read path is verified.
```


---

## v0.1.110 Server persistence service note

Decision:

```text
Continue Database MVP by adding a controlled server persistence service before touching the active UI.
Do not add auth/profile/payment/public reports in this service batch.
Do not replace local report history until the server save/read path is explicitly verified.
```

Why:

```text
This creates a narrow bridge between generated reports and database storage while keeping the product flow stable.
```


---

## v0.1.111 Guarded beta API note

Decision:

```text
Add a disabled-by-default guarded beta API route for server report persistence.
Do not connect the active report UI to the route yet.
Do not add auth/profile/payment/public reports in this API batch.
```

Why:

```text
This creates a testable server save/read surface while preserving the local-first product flow.
```


---

## v0.1.112 Beta API verification note

Decision:

```text
Before UI database wiring, add and follow a beta API verification runbook.
The runbook must use local/staging data only and must not expose secrets or real user birth data.
```

Why:

```text
This keeps the Database MVP path scalable and avoids switching the user-facing flow before server persistence is actually verified.
```


---

## v0.1.113 Safe beta API preflight note

Decision:

```text
Add a safe preflight script before running beta API verification against local/staging database config.
Do not connect UI to database storage until preflight and runbook pass.
```

Why:

```text
The project needs proof that env, migration, and table readiness are correct without exposing secrets or real user data.
```


---

## v0.1.114 Local beta API verification note

Decision:

```text
Treat the guarded beta report persistence API as locally verified after Docker Postgres migration, preflight, POST save, GET read, and list all passed with synthetic data.
Continue to block active UI database wiring until a separate guarded step designs the user-facing/manual beta save path.
```

Why:

```text
The project now has proof that the server persistence path can store and read report snapshots through the database, while keeping the public/local product flow stable.
```


---

## v0.1.115 FK-safe beta persistence note

Decision:

```text
For the guarded beta API only, bootstrap the configured beta persistence user before saving a report.
Do not treat this as account/auth/profile implementation.
Keep active UI database wiring blocked until a separate guarded step.
```

Why:

```text
Local verification proved the persistence path works, but a fresh database can fail on report save if the configured beta user does not exist.
The narrow bootstrap keeps beta verification simple without weakening the future privacy/auth model.
```


---

## v0.1.120 Staging beta DB verification note

Decision:

```text
Before treating the guarded beta DB flow as staging-ready, record Render service/deploy facts and run a staging-safe beta verification checklist.
Keep the DB flow guarded and local-first by default.
Do not treat GitHub push as deployed or staging-verified.
```

Why:

```text
The local beta DB flow is now usable for save/read/archive checks, but the project still needs proof that the same guarded path works on the actual deployed environment without exposing secrets or real user data.
```
