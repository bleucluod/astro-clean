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
- Ú¯Ø²Ø§Ø±Ø´ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ø¯ÛŒâ€ŒÙ…Ø§Ù‡ÛŒâ€ŒÙ‡Ø§ Ø¯Ø± Ø´ÛŒØ±Ø§Ø²
- ØªØ­Ù„ÛŒÙ„ Ú©Ù„ÛŒ Ù…ØªÙˆÙ„Ø¯ÛŒÙ† ÙØ±ÙˆØ±Ø¯ÛŒÙ† Ø¯Ø± ØªÙ‡Ø±Ø§Ù†
- Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ø¨Ø§ ØªØ§Ú©ÛŒØ¯ Ø±ÙˆÛŒ Ø´Ù‡Ø± ØªÙˆÙ„Ø¯ Ùˆ Ù…Ø§Ù‡ ØªÙˆÙ„Ø¯
- Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù† Ú¯Ø²Ø§Ø±Ø´ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ø¨Ø±Ø§ÛŒ Ù…ØªÙˆÙ„Ø¯ÛŒÙ† ÛŒÚ© Ù…Ø§Ù‡

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
- Article: Ø®Ø§Ù†Ù‡ Ù‡ÙØªÙ… Ø¯Ø± Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ -> CTA to relationship section in personal report.
- Article: ÙˆÙ†ÙˆØ³ Ø¯Ø± Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ -> CTA to love/values reading.
- Article: Ù…Ø±Ú©ÙˆØ±ÛŒ Ø±ØªØ±ÙˆÚ¯Ø±ÛŒØ¯ -> CTA to Sky Pulse and personal timing.
- Article: Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ú†ÛŒØ³Øª -> CTA directly to `/chart`.

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


---

## v0.1.121 Render deploy state note

Decision:

```text
Record Render deploy state separately from GitHub state: fb9c697 is observed live on Render for the astro-clean service/project, but staging DB persistence remains unverified because no visible Postgres service was found and the remote beta API check did not connect.
```

Why:

```text
This keeps deployment progress honest: Render deploy can be verified independently, while database readiness still requires a visible database service, env configuration, migration/table proof, and beta API/UI smoke tests.
```


---

## v0.1.122 Staging DB pass and hosting direction note

Decision:

```text
Treat Render as a staging verification surface for the beta database path, not as the final hosting commitment. The beta DB code path is now proven through migration, API save/read/list, and guarded UI read/archive on https://halleus.ir.
```

Product direction:

```text
Move faster toward finishing the user-facing Halleus product and evaluate an Iranian hosting path for final deployment. Do not keep expanding Render-specific infrastructure unless it directly reduces launch risk or verifies a critical product path.
```

Boundary:

```text
The staging beta DB pass does not enable production persistence, public/indexable reports, paid/private report ownership, auth, or billing.
```


---

## v0.1.123 Manual order process-readiness note

Decision:

```text
Improve the manual order bridge before starting another infrastructure/hosting phase. The order path should feel process-ready even while payment and backend order intake remain intentionally manual.
```

Why:

```text
The database path is now proven in staging, but the commercial bottleneck is the user journey from report to order. A clearer manual order process reduces launch risk faster than moving hosting providers immediately.
```

Boundary:

```text
This is not payment, auth, backend order storage, or production DB persistence. It is a small MVP conversion/readiness step.
```


---

## v0.1.124 Public footer/internal route decision

Decision:

```text
Public footer navigation should focus on user-facing product routes. Dashboard/admin can remain accessible routes, but they should not be promoted as primary public footer links.
```

Reason:

```text
Halleus is moving from technical staging toward a user-facing commercial MVP. Public navigation should guide a normal visitor through chart, product, pricing, report, order, and privacy paths, not internal/admin operations.
```

Implementation boundary:

```text
This decision does not delete /dashboard or /admin.
This decision does not add auth, noindex, sitemap changes, or route protection.
Any footer change must align the existing site-chrome check in the same scoped batch.
```

Workflow note:

```text
Do not abandon the v0.1.124 navigation phase because a runner failed. Continue with smaller inspected line edits after rollback.
```
## Seeds added after v0.1.141 report-page cleanup

- `touched` — Report detail should feel like a personal product reading, not a wiki/article page. Keep the product-style chart card near the top: name, birth city, birth date/time, three core placements, calculated rising, main placements, and major aspects. Hide internal/debug blocks and avoid making copy/download/export the primary path.
- `untouched` — Moon phase and current Moon position: homepage can later show the current Moon position/phase as a living daily moment, while birth reports can include the natal Moon phase and a soft interpretation of its symbolic influence on everyday rhythms.
- `untouched` — Exact age layer in reports: calculate precise age from birth moment, such as years/days/hours, plus time remaining until next birthday. This should be reflective and useful, not gimmicky.
- `untouched` — Rising-sign wiki cluster: create Persian wiki pages for rising-sign interpretation for every zodiac sign, including a general rising-sign overview and internally linked sign-by-sign pages.
- `untouched` — Ancient-knowledge framing: where natural, describe astrology as an old symbolic/ancient interpretive tradition without making scientific, medical, legal, or deterministic claims.
- `deferred` — Paid version is not needed yet. Short-term product can stay free-first; later limits may be usage-based, such as a daily report cap or storage limitations, rather than an immediate paid/private model.

### Ø§ÛŒØ¯Ù‡ Ø¢ÛŒÙ†Ø¯Ù‡ — Ù…Ù‚Ø§ÛŒØ³Ù‡ Ø¯Ùˆ Ú†Ø§Ø±ØªØŒ Ú†Ø§Ø±Øª Ø±ÙˆÛŒØ¯Ø§Ø¯ Ùˆ Ø³Ø§Ø²Ú¯Ø§Ø±ÛŒ/Ù‡Ù…â€ŒØ²Ù…Ø§Ù†ÛŒ
- Ø¯Ø± Ø¢ÛŒÙ†Ø¯Ù‡ Ù‡Ø§Ù„ÛŒÙˆØ³ ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø§Ù†Ø³Ø§Ù† Ú¯Ø²Ø§Ø±Ø´ Ù†Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯Ø› Ú¯Ø²Ø§Ø±Ø´ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¨Ø±Ø§ÛŒ ÛŒÚ© Ø±ÙˆÛŒØ¯Ø§Ø¯ØŒ Ù„Ø­Ø¸Ù‡ ØªØ§Ø±ÛŒØ®ÛŒØŒ Ø´Ø±ÙˆØ¹ Ø±Ø§Ø¨Ø·Ù‡ØŒ Ø´Ø±ÙˆØ¹ Ù¾Ø±ÙˆÚ˜Ù‡ØŒ Ø²Ù„Ø²Ù„Ù‡ØŒ Ø§Ù†Ù‚Ù„Ø§Ø¨ ØµÙ†Ø¹ØªÛŒ ÛŒØ§ Ù‡Ø± Ù„Ø­Ø¸Ù‡ Ù…Ø¹Ù†ÛŒâ€ŒØ¯Ø§Ø± Ø³Ø§Ø®ØªÙ‡ Ø´ÙˆØ¯.
- Ø¨Ø§ÛŒØ¯ Ø§Ù…Ú©Ø§Ù† Ù…Ù‚Ø§ÛŒØ³Ù‡ Ø¯Ùˆ Ú†Ø§Ø±Øª ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯: Ù…Ø«Ù„Ø§Ù‹ Ø¯Ùˆ ØªÙˆÙ„Ø¯ Ø¨Ø±Ø§ÛŒ Ø±Ø§Ø¨Ø·Ù‡/Ø§Ø²Ø¯ÙˆØ§Ø¬ØŒ ÛŒØ§ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ ÛŒÚ© ÙØ±Ø¯ Ø¨Ø§ Ú†Ø§Ø±Øª ÛŒÚ© Ø±ÙˆÛŒØ¯Ø§Ø¯ ØªØ§Ø±ÛŒØ®ÛŒ.
- Ø®Ø±ÙˆØ¬ÛŒ Ù…Ù‚Ø§ÛŒØ³Ù‡ Ø¨Ø§ÛŒØ¯ Ù†Ù‚Ø§Ø· Ø§Ø´ØªØ±Ø§Ú©ØŒ Ù†Ù‚Ø§Ø· ØªÙ†Ø´ØŒ Ù†Ù‚Ø§Ø· Ù‚ÙˆØªØŒ Ù†Ù‚Ø§Ø· Ø­Ø³Ø§Ø³ Ùˆ Ù¾Ø±Ø³Ø´â€ŒÙ‡Ø§ÛŒ ØªØ£Ù…Ù„ÛŒ Ø±Ø§ Ù†Ø´Ø§Ù† Ø¯Ù‡Ø¯Ø› Ù†Ù‡ Ø­Ú©Ù… Ù‚Ø·Ø¹ÛŒ Ø¨Ø¯Ù‡Ø¯.
- Ø¨Ø±Ø§ÛŒ Ø±ÙˆÛŒØ¯Ø§Ø¯Ù‡Ø§ØŒ Ø³ÛŒØ³ØªÙ… Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ ØªÙˆØ¶ÛŒØ­ Ø¯Ù‡Ø¯ Ø¯Ø± Ø¢Ù† Ù„Ø­Ø¸Ù‡ Ù†Ø´Ø§Ù†Ù‡â€ŒÙ‡Ø§ØŒ Ø³ÛŒØ§Ø±Ù‡â€ŒÙ‡Ø§ØŒ Ø®Ø§Ù†Ù‡â€ŒÙ‡Ø§ ÛŒØ§ ØªØ±Ù†Ø²ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ù…Ù‡Ù… Ú©Ø¬Ø§ Ø¨ÙˆØ¯Ù†Ø¯ Ùˆ Ú†Ù‡ Ø§Ù„Ú¯ÙˆÛŒÛŒ Ø³Ø§Ø®ØªÙ‡â€ŒØ§Ù†Ø¯.
- Ù†Ù…ÙˆÙ†Ù‡â€ŒÙ‡Ø§ÛŒ Ø¢ÛŒÙ†Ø¯Ù‡: Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ø¨Ø§ Ú†Ø§Ø±Øª ÛŒÚ© Ø²Ù„Ø²Ù„Ù‡/Ø§Ù†Ù‚Ù„Ø§Ø¨/Ø´Ø±ÙˆØ¹ Ú©Ø³Ø¨â€ŒÙˆÚ©Ø§Ø±ØŒ Ø¨Ø±Ø±Ø³ÛŒ Ø§ÛŒÙ†Ú©Ù‡ Ú†Ù‡ ØªØ±Ù†Ø²ÛŒØªâ€ŒÙ‡Ø§ÛŒÛŒ ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù†Ø¯ØŒ Ú†Ù‡ Ø²Ù…Ø§Ù†ÛŒ Ø§Ù„Ú¯ÙˆÙ‡Ø§ÛŒ Ù…Ø´Ø§Ø¨Ù‡ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ù†Ø²Ø¯ÛŒÚ© Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ØŒ Ùˆ Ø¢ÛŒØ§ ÛŒÚ© Ø§Ù„Ú¯Ùˆ Ø¯Ø± Ù†Ø³Ø¨Øª Ø¨Ø§ Ú†Ø§Ø±Øª ØªÙˆÙ„Ø¯ Ú©Ø§Ø±Ø¨Ø± Ø­Ø³ ØªÙ‚ÙˆÛŒØªØŒ ÙØ´Ø§Ø± ÛŒØ§ Ø¶Ø¹Ù Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯.
- Ù…Ù‚Ø§ÛŒØ³Ù‡ Ø¯Ùˆ Ú†Ø§Ø±Øª Ùˆ ØªØ­Ù„ÛŒÙ„ ØªØ±Ù†Ø²ÛŒØª/Ø±ÙˆÛŒØ¯Ø§Ø¯ Ø§Ø­ØªÙ…Ø§Ù„Ø§Ù‹ Ø¨Ø§ÛŒØ¯ Ø¨Ø¹Ø¯Ø§Ù‹ Ø¨Ù‡ Ø¹Ù†ÙˆØ§Ù† Ù‚Ø§Ø¨Ù„ÛŒØª Ù¾ÛŒØ´Ø±ÙØªÙ‡ ÛŒØ§ ØºÛŒØ±Ø±Ø§ÛŒÚ¯Ø§Ù† Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆØ¯ØŒ Ù†Ù‡ Ø¯Ø± MVP Ø§ÙˆÙ„ÛŒÙ‡.

## Report detail depth roadmap added after v0.1.145

Source user review: a real report detail sample showed that Halleus now has the right product surface, but the report should expose more of the computed chart in a clearer, more astrology-native way before public/SEO scaling.

Implementation sequence:
1. Report card quick UX/copy pass:
   - Make the three core cards read as direct placements first: "Sun in Aquarius", "Moon in Taurus", "Rising Virgo".
   - Keep the explanatory sentence under each card, but make the title easier to scan.
   - Add a Moon-phase card in the same language family and avoid Arabic-feeling wording when a natural Persian phrasing is better.
   - Rewrite or remove machine-like "stored realer data" copy in calculation details.

2. Main placements panel:
   - Default the main placements panel open, while still allowing the user to collapse it.
   - Show retrograde status when the engine provides it.
   - Audit and then add outer/extended points if the engine can compute them: Neptune, Pluto, Lilith / Black Moon, North Node, South Node.

3. Houses and planet-in-house sections:
   - Add a dedicated house-cusp section showing where each house starts by sign and degree.
   - Clearly mark the angles: ASC / house 1, DSC / house 7, IC / house 4, MC / house 10.
   - Add a separate planet-in-house section showing every available planet/point in its house, including North Node if present.

4. Overall chart balance:
   - Add a compact chart-energy summary: element counts (fire, earth, air, water), modality counts (cardinal, fixed, mutable), and polarity counts (masculine/feminine), based on the selected placement set.

5. Aspect UX and interpretation:
   - Show all saved/calculated aspects in the report UI, not only the first five.
   - For each aspect card, foreground the aspect angle in user-friendly language, such as the exact angle or the standard aspect degree, rather than leading with orb.
   - Replace vague phrases such as "soft opportunity" or "harmonious flow" with clearer Persian wording and explain where the user might actually feel the support, tension, or overuse pattern.

6. Final reading evidence labels:
   - Before each final-reading section, add a compact evidence label such as "Sun in Aquarius, house 6" or "Moon in Taurus, house 9", then show the section title smaller.
   - Expand the prose so placements are read as planet + sign + house, not only planet + sign.
   - Eventually include per-planet aspect detail so, for example, the Sun section can mention the Sun's own major relationships to other planets.

7. Zodiac aliases for Persian SEO:
   - Keep existing traditional Persian/Arabic zodiac names, but add common Persian aliases for SEO and user recognition:
     Aries: Hamal / Ghooch.
     Gemini: Jowza / Dogholoo.
     Cancer: Saratan / Kharchang.
     Virgo: Sonboleh / Khosheh.
     Sagittarius: Ghos / Kamandar.
     Pisces: Hoot / Mahi.
   - Do not replace the current labels; add aliases in a controlled display/copy layer.

8. Natal chart wheel:
   - Add a report chart wheel only after the data contract supports it reliably.
   - The wheel should show zodiac signs, house divisions, planet/point positions, aspect lines, North/South Nodes, ASC, DSC, IC, and MC.
   - This is a larger milestone and should not be mixed with copy polish or panel cleanup.

Do not implement yet:
- Do not fake retrograde, Lilith, Nodes, MC/IC/DSC, or a complete chart wheel if the engine does not yet provide reliable data.
- Do not start public/indexable report scaling before the report data surface and consent model are clearer.
- Do not combine all of this into one UI batch.

## Full report completion blueprint added after v0.1.153

Product decision: the complete Halleus birth report is the heart of the product. Future report work should start from real data contracts and engine output before UI polish, public SEO scaling, or paid/private packaging.

Complete report means a saved report can explain the user's natal chart from one canonical real-engine snapshot, with explicit calculation quality and limitations. A section may appear in the user-facing report only when the required data exists in the snapshot.

Required layers for a complete report:
1. Birth data quality: birth date, birth time, city, timezone, coordinates, and clear handling of missing or uncertain birth time.
2. Real chart positions: planets/points with longitude, zodiac sign, degree, and display labels.
3. Houses and angles: house system, 12 houses/cusps, ASC, DSC, MC, and IC. MC/IC must be stored as independent angles and must not be assumed to equal house 10/house 4 in every system.
4. Aspect map: calculated major aspects with angle, orb, participating planets, and interpretation hooks.
5. Chart balance: elements, modalities, and polarity from the selected placement set.
6. Extended factors: retrograde status, lunar nodes, Lilith/Black Moon, and later optional points only after real calculation support exists.
7. Interpretation evidence: every prose section should be traceable to placements, houses, angles, aspects, or explicit quality/limitation data.
8. Product surfaces: ReportCard, final report writer, and chart wheel should consume the same canonical snapshot instead of re-deriving or guessing.

Recommended implementation path:
1. Complete natal chart data contract.
2. House system decision and limits: Whole Sign default for the serious MVP, Placidus/advanced systems later after validation.
3. Real ASC and MC calculation, then DSC and IC derivation with method metadata.
4. Whole Sign 12-house engine output anchored to the calculated Ascendant sign.
5. Natal chart QA fixtures for Tehran, Shiraz, Tabriz, near-midnight births, timezone boundary cases, and missing birth time.
6. Canonical realEngine snapshot that stores placements, houses, angles, aspects, retrogrades, nodes, Lilith, quality, and limitations.
7. Full report writer: planet + sign + house + aspects, then houses, axes, balance, retrogrades/nodes/Lilith when available, and final synthesis.
8. Full ReportCard data sections and real chart wheel only after the snapshot is complete enough to support their claims.

Non-negotiables:
- Do not fake DSC, IC, MC, house cusps, retrograde, nodes, Lilith, or chart-wheel details.
- Do not label scaffolded/approximate house data as production-grade.
- Do not publish indexable user report pages before report reliability and explicit public consent are ready.
- Do not let poetic copy hide missing calculation data; limitations should be visible and calm.

Near-term version intent:
- v0.1.155: complete natal chart data contract.
- v0.1.156: house-system decision and contract hardening.
- v0.1.157: real angles engine path.
- v0.1.158: Whole Sign 12-house engine output.
- v0.1.159: natal chart QA fixtures.
- v0.1.160: canonical realEngine snapshot.
- v0.1.161+: full house/axis prose, retrogrades, nodes, Lilith, full UI sections, and chart wheel foundation.

## v0.1.163 product guard: real special points only

North Node, South Node, and Lilith are desirable for the complete Halleus report, but they must not appear as decorative or guessed content.

Product rule:
- Show Nodes/Lilith only after the engine has real natal point longitudes, QA fixtures, and a documented source method.
- Lilith needs an explicit Mean Lilith versus True Lilith decision before implementation.
- Until then, keep these fields deferred/hidden and avoid SEO/report claims that mention them as available.

## v0.1.164 product decision: special points source path

Product direction for complete reports:

- North Node and South Node are still desirable for the complete Halleus report, but only after real natal longitude support exists.
- Lilith is desirable but lower priority than Nodes because it needs a Mean Lilith versus True Lilith decision and separate validation.
- Do not add a heavy ephemeris dependency just to make the report look complete.
- Do not delay the paid/private/public model forever waiting for Lilith; the complete report can move forward with Nodes first and Lilith later.
- Public copy should not claim Nodes/Lilith are available until the report UI/writer/wheel actually consume real snapshot fields.

## v0.1.165 product decision: Mean Lunar Node first

Product decision:

- Halleus may ship Lunar Nodes first using a transparent Mean Lunar Node model.
- Public/user-facing copy must label this honestly as Mean North Node / Mean South Node, or Persian equivalent, until True/Osculating Node is implemented.
- South Node should be described as the exact opposition of the calculated Mean North Node.
- This is acceptable for the MVP report because Mean and True Node differences are usually small enough that they should not block all Node work, but users should not be misled about the model.
- Lilith remains separate and lower priority; do not bundle it with Mean Node implementation.

Product guard:

- Do not market Halleus as supporting True Node until the engine stores a validated True/Osculating Node longitude.
- Do not mention Lilith availability in public copy until the report UI/writer/wheel consume real Lilith snapshot fields.

## v0.1.167b product wording: Moon Hands

Product wording decision:

- Persian user-facing copy should call Lunar Nodes "Ø¯Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡" rather than "Ú¯Ø±Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡".
- Technical identifiers may stay `lunarNodes`, because the copy decision is product language rather than a schema rename.
- Keep the model disclosure honest: this is Mean Lunar Node, not True/Osculating Node.
- South Node should keep being explained as the exact opposition of the calculated Mean North Node.
- Lilith remains deferred and must not be bundled into this copy change.

## v0.1.168 product note: full report reading polish

Product decision:

- The next report milestone should make the complete report easier to read as a guided Persian self-discovery experience, not a list of calculation facts.
- Keep the report order human-first: identity and emotional rhythm before denser method/accuracy notes.
- Technical honesty remains important, but user-facing copy should explain method limits in calm Persian instead of exposing unnecessary internal words like `snapshot`, `real engine`, or `motion`.
- This is still report-depth work, not monetization, payment, public/private consent, SEO, wiki, Sky Pulse, or admin/content studio work.

## v0.1.169 product note: report synthesis before acquisition

Product decision:

- The next product priority is report synthesis: the generated report should show a coherent picture from Sun, Moon, Rising, aspects, houses, Moon Hands, and accuracy limits.
- Ù‡Ù…Ù‡ Ú†ÛŒØ² ÙØ¹Ù„Ø§Ù‹ Ø±Ø§ÛŒÚ¯Ø§Ù† Ùˆ noindex Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯Ø› paid report, Search Console, SEO launch, public/indexable reports, and Iranian hosting migration are deferred.
- Render is acceptable for current development/testing because the product is intentionally not ready for indexing yet.
- Do not treat 100 unique/day, Iranian hosting, or monetization as active milestones until the report and core website pages are strong enough for public acquisition.
- Website work should come after the report feels usable: homepage story, report preview, privacy/consent language, and report lifecycle before indexing.

## v0.1.170 product note: report depth humanization bundle

Product decision:

- Similar report-depth copy improvements may be bundled when they touch the same writer/check surface and reduce repeated tiny batches.
- The current priority is making aspects, houses, repetition handling, and report endings feel more human, Persian-first, and useful for self-reflection.
- Keep homepage/story, Report Page UX, preview/sample pages, save/share lifecycle, SEO/indexing, payment, and hosting migration as later separate product surfaces.
- Do not make the report sound more complete by hiding limitations or claiming True Node/Lilith support.

## v0.1.171 product note: report page reading UX

Product decision:

- After report synthesis/depth batches, the report page should help users read a long Persian report instead of simply stacking the chart card, full text, and note panel.
- Add a lightweight reading guide, anchors to the full reading and note area, and calmer free/private/noindex copy on report pages.
- Keep this as report-page UX only; homepage story, preview/sample pages, save/share lifecycle, SEO/indexing, payment, and hosting decisions remain separate later surfaces.
- Do not turn the page into a sales flow while Halleus is still free, private/noindex, and product-readiness focused.

## v0.1.172 Homepage architecture decision

Decision:

```text
Homepage should be scalable from the current free-first/no-index product state into the later SEO/Sky Pulse/public-report era without being rewritten from scratch.
```

Implementation direction:

```text
Use a modular homepage shell with public-facing header/footer, product hero, report value grid, how-it-works, report preview slot, Sky Pulse teaser, Moon phase teaser, trust/privacy, future modules, FAQ, and CTA.
```

Current boundaries:

```text
Sky Pulse can appear as a date/pulse card and future slot, not as a fake full transit engine.
Moon phase can appear as a prepared slot, not as an active result until real calculation exists.
Paid report, indexing, Search Console, public reports, and hosting migration remain deferred.
```

## v0.1.173 Idea Garden update — Tehran Moon Pulse now, user location later

Decision:
- Start Sky Pulse with a real lightweight Moon Pulse instead of a placeholder.
- The current homepage implementation should use the existing real chart/astronomy engine for Sun/Moon longitude, Moon sign, Moon phase, and illumination.
- The first public scope is Tehran only. Copy should present it gracefully as a Tehran-tuned reading, not as a broken limitation.
- Show Jalali, Gregorian, and Hijri dates in the daily card.

Deferred:
- User location based Moon Pulse.
- Full daily transit engine.
- Transit importance ranking.
- Personalized daily pulse from the natal chart.
- Natal Moon phase inside the full report.

Reason:
- This removes demo-feeling placeholders while keeping the product honest and scoped.

## v0.1.174 Idea Garden update — Homepage app-feel polish before new features

Decision:
- After shipping the real Tehran Moon Pulse, the next priority is visual/product polish rather than adding a new feature.
- The homepage should feel like a real Persian astrology app: clearer header spacing, stronger CTA hierarchy, app-like daily card, polished FAQ, and less internal/demo wording.
- Existing real features should be visually completed before adding more roadmap promises.

Implementation direction:
- Use visual polish and copy cleanup only.
- Keep Sky Pulse scope as Tehran Moon Pulse.
- Keep user-location Moon Pulse, full transit ranking, personalized daily pulse, payment, SEO/indexing, hosting, and public report consent as later work.

Reason:
- This reduces demo-feeling and protects product trust without expanding risky scope.

## v0.1.175 Idea Garden update — Real report preview as a product surface

Decision:
- Move the homepage report preview from a future placeholder into an active product surface.
- The preview should show the shape of a real Halleus reading: core threads, houses, aspects, Moon Hands, synthesis, and a reflective question.
- Keep the preview general and non-indexable for now; do not start public report SEO, public/private consent, payment, or report sharing in this batch.
- The preview should reduce uncertainty for first-time users before they enter birth data, while staying aligned with the real report engine and writer direction.

Next later surfaces:
- A fuller sample report page can come later after the homepage preview proves useful.
- Public/indexable report examples still require explicit consent and indexing strategy before implementation.

## v0.1.176 Idea Garden update — App-like chart creation flow

Decision:
- The chart creation page should feel like a focused product form, not a test/demo surface.
- Keep the visible form compact: only the data needed for a real birth chart/report should remain prominent.
- Name is optional and should be communicated inside the field.
- Birth date should default to Jalali, with Gregorian as an alternate entry mode.
- Birth time should have a clear unknown-time option.
- Birth city should not be prefilled with Tehran; suggestions should be short and focused after typing.
- Do not add payment, SEO/indexing, public report sharing, or account lifecycle work in this batch.

Later:
- User-location and richer place search can be improved after the core creation flow feels trustworthy.

## Near-term UI polish notes after v0.1.176

Small product polish items to include in the next suitable UI batch:

- Header CTA: remove the secondary line `Ø´Ø±ÙˆØ¹ Ø±Ø§ÛŒÚ¯Ø§Ù†` under `Ø³Ø§Ø®Øª Ú¯Ø²Ø§Ø±Ø´ ØªÙˆÙ„Ø¯` so the header action stays compact and less oversized.
- Global page utility: add a small fixed `Ù¾Ø±Ø´ Ø¨Ù‡ Ø¨Ø§Ù„Ø§` button at the bottom-left of the viewport on both desktop and mobile. It should stay subtle, app-like, and not compete with the main CTA.

Scope:
- These are UI polish items only.
- Do not turn them into a broad navigation redesign.
- Do not start payment, SEO/indexing, public report sharing, hosting, or report engine work for these items.
## v0.1.177 Idea Garden update — Trust, return flow, and global UI polish

Decision:
- Merge Product page alignment, Privacy page alignment, Reports list return-flow polish, header CTA cleanup, and the small back-to-top utility into one speed-focused UI/trust batch.
- Product and Privacy pages should describe the real current state: free-first, private-first, report-quality focused, and not public/indexable without explicit consent.
- Reports list should feel like a return surface, not a lab archive.
- Keep this batch away from payment, SEO/indexing, public report sharing, hosting, full transit Sky Pulse, and report engine/writer changes.

## v0.1.178 Idea Garden update — Chart flow mobile QA

Decision:
- Treat the chart creation page as a core app surface that must feel usable on mobile before moving to larger growth work.
- Keep the form compact, keep Jalali-first date entry, preserve Gregorian as an alternate mode, and keep the unknown-time path visible.
- City search should use short controlled suggestions instead of a noisy browser autocomplete surface.
- Loading, error, and success states should feel like product feedback, not debug output.

Later:
- Richer place search, user account lifecycle, and public/private report publishing remain separate future surfaces.

## v0.1.179 Idea Garden update — Account-ready reports dashboard

Decision:
- Move user-facing report lifecycle toward a real panel before implementing auth/database.
- Treat `/dashboard` as the future home for saved reports, account state, and migration guidance.
- Keep the current storage honest: local-preview, private, noindex, and browser-bound.
- Persistent reports, auth provider selection, and local-to-account migration are the next product foundation after this dashboard/lifecycle surface.

Not now:
- No public/indexable reports.
- No payment gating.
- No SEO launch.
- No real auth or database migration until provider/storage choice is explicit.


## v0.1.180 Idea Garden update — persistent reports/auth decision

Decision:
- Supabase-first is the selected direction for account-backed private reports.
- Keep local-preview as the active product mode until real auth/storage are implemented and verified.
- All migrated reports must remain private/noindex by default.
- Public/indexable report sharing remains a separate future consent system.

Not now:
- No real login UI.
- No production database write switch.
- No payment gating.
- No SEO/public report launch.
- No hosting migration.


## v0.1.181 Idea Garden update — Supabase auth stub and repository prep

Decision:
- Prepare Supabase Auth and account-storage contracts without activating them.
- Keep local-preview reports as the working user experience.
- Keep real account writes blocked until migration UX and real session ownership are ready.
- Treat this as product foundation, not an auth launch.

Not now:
- No real login.
- No Supabase client package install.
- No database write switch.
- No public/indexable reports.
- No payment gating or SEO launch.


## v0.1.182 Idea Garden update — account save contract and migration preflight

Decision:
- Make the account report save path explicit before enabling any real writes.
- Show migration preflight in dashboard so users understand how local-preview reports will move to accounts later.
- Keep export/backup as the only safe user action before migration is implemented.
- Preserve private/noindex as the default for all future account reports.

Not now:
- No real login.
- No database write switch.
- No migration execution.
- No public/indexable reports.
- No payment gating or SEO launch.


## v0.1.183 Idea Garden update — real login shell and migration review

Decision:
- Combine real Supabase email/password login shell with migration review/backup shell.
- Keep account report writes blocked until user-owned storage is implemented.
- Keep migration execution blocked until imported/skipped review and backup flow are complete.
- Keep private/noindex as the default for future account reports.

Not now:
- No account report write path.
- No migration execution.
- No public/indexable reports.
- No payment gating or SEO launch.

## v0.1.184 seed update — Saved Reports / Report History

Status update:
- Saved Reports / Report History moves closer to account-backed storage through a guarded user-owned account report save path.
- This is not public report SEO and not local-to-account migration.
- New saves may create an account copy only with login, storage flags, database config, and server Supabase verification.
- The local-preview fallback remains, and reports stay private/noindex.

Next smallest step:
- After verifying account saves locally, add an explicit migration execution flow with backup, imported/skipped counts, and user confirmation.


## v0.1.185 seed update - account report read foundation

Decision:
- Continue the Saved Reports / Report History path by adding a small account report read foundation first.
- This supports future account report list/detail UI without introducing migration or deletion risk.
- Keep local-preview fallback as the safe visible experience until account reads are wired and verified.

Not now:
- No local-to-account migration execution.
- No deletion of browser-local reports.
- No public/indexable reports.
- No SEO launch.
- No payment gating.

## Seed update — username-first account identity

- Status: touched / near-term account foundation.
- Decision: account signup should ask for a user-chosen username and a mobile phone number.
- mobile-required: collect phone numbers from the beginning for customer/contact value.
- Guardrail: mobile is not the username, and email is optional/secondary rather than the user-facing identifier.
- Near-term path: keep account report save/read private/noindex and continue UI work before migration.
- Migration note: local-to-account migration is deferred because Halleus has not had real users yet.
## Account reports UI integration

Decision: account report list/read UI should come before any local migration work.

- `/reports?source=account` may show saved account reports for the signed-in user.
- `/reports/[reportId]?source=account` may open the private saved account copy.
- The UI must keep account reports private/noindex.
- Migration from local-preview to account is deferred because the product has not had real users yet.
- Do not use this step to start SEO, public report pages, payment, hosting migration, or broader engine work.


### v0.1.188 real account flow test readiness

- Account testing should focus on the real new-user flow: username + mobile signup, login, create report, account save, account reports list/read.
- Mobile is valuable customer/contact/auth data but must not become the username.
- Email remains optional/secondary.
- Local-to-account migration is deferred because the website has not had real users yet.
- Keep account reports private/noindex and do not start public SEO report surfaces from this account-readiness work.

### v0.1.189 account dashboard/profile polish

- Keep the near-term account UX centered on username + mobile signup, account save, and account reports list/read.
- Dashboard/profile should explain the real-account test path without starting migration work.
- Username remains user-chosen; mobile is collected but is not the username.
- Continue to keep account reports private/noindex and defer public SEO report surfaces.

## v0.1.190 real account flow lock

Decision: lock the near-term account model as username + mobile + password, where username is user-chosen, mobile is required customer/contact/auth data in E.164 format, and email remains optional/secondary. Mobile must not become the username.

## Seed update — Halleus sun-gold logo/favicon package

Status: touched

- Use the approved sun-gold Halleus logo/favicon package as the current site brand asset source.
- The brand mark should support the Persian-first product identity without changing the core roadmap.
- Logo/favicon batches are brand polish only and must not interrupt the near account path: username/password account bridge, real smoke tests, then report-depth improvements.

## v0.1.192 Idea Garden update — username/password account bridge

Decision:
- Keep the product-facing account model username-first.
- Signup should collect username + mobile + password.
- Login should use username + password.
- Mobile is required customer/contact data at signup, but it must not become the username or the login identifier.
- Email remains optional/secondary.

Implementation note:
- Supabase Auth can be bridged internally with a deterministic private credential derived from username, but that credential is not the user's email and should not appear in UI.
- Account reports remain private/noindex with local-preview fallback.

Not now:
- No local-to-account migration execution.
- No deletion of browser-local reports.
- No public/indexable reports.
- No SEO launch.
- No payment or hosting work.
- No report engine/report-depth work in this batch.


### Account UX polish after real account smoke test

- Status: `touched`
- Product value: `high`
- Stage: `post-account-smoke polish`
- Target milestone: `v0.1.194 Account UX Polish`

After the real account smoke test passed, the next small product step is account/profile/dashboard polish after real account smoke test: make signup/login/profile/dashboard feel calmer and more user-facing without changing auth logic, storage logic, schema, payment, SEO, public reports, or report engine.

UX constraints:
- Login copy should say `username + password`.
- Signup copy should say `username + mobile + password`.
- Mobile is customer/contact/account data and is not the username.
- Email stays optional/secondary.
- Account reports stay private/noindex.
- Local reports are not deleted and local-to-account migration stays deferred.

## v0.1.195 product note: Report Depth + First Synthesis

Product decision:
- Bundle report depth and first synthesis into one larger value-focused milestone instead of spending separate tiny batches on each.
- The next report improvement should make the generated reading feel more personal, Persian-first, and useful: stronger Sun/Moon/Rising interpretation, clearer house/planet/aspect language, and a first synthesis layer.
- The first synthesis layer should include main personality threads, central chart tension, growth language, and one short weekly reflection practice.
- Account stability remains reactive only; the completed account foundation should not expand unless a real report/save bug appears.
- Keep reports private/noindex by default and do not start SEO, public/indexable reports, payment, hosting/deploy, Sky Pulse, wiki/content studio, or admin work in this milestone.

Roadmap decision after this note:
```text
v0.1.195 — Report Depth + First Synthesis
v0.1.196 — Report Detail UX + Trust QA
v0.1.197 — Beta Readiness + Deploy Smoke
v0.1.198 — Private/Public Consent Design
After that — Persian SEO Strategy, Paid Private Reports, Wiki/Content Studio/Admin, then Sky Pulse only with a real transit source.
```

## Official Cool Palette Direction v0.1.200

Decision: Halleus now uses a cool, bright, trustworthy, sky-like visual system.

Use:
- `#F8FAFC` as the dominant background.
- `#D9EAFD` for soft panels and calm surface separation.
- `#BCCCDC` for borders, inactive details, dividers, input borders, and minor chart lines.
- `#9AA6B2` for logo, primary actions, active states, important links, key icons, and chart main lines.
- `#243447`, `#3A4A5C`, and `#64748B` for readable text hierarchy.

Avoid warm cream, gold, beige, orange, yellow-tinted accents, dark mystical purple, heavy navy, pure black, and any styling that makes Halleus look like fortune-telling, tarot, magic, or a dark occult product.

Implementation priority: keep the whole website visually consistent with this palette before moving into public/private consent, SEO, or wiki work.


## v0.1.222 Idea Garden update — account save bridge hardening

Decision:
- Continue the account-backed report lifecycle by hardening the existing save-generated-report bridge rather than introducing a broader account or migration redesign.
- The report save flow should stay local-first: generation/opening must still work even if account or server persistence fails.
- When a signed-in save has a Supabase session retrieval error before an access token exists, keep the local fallback and skip account persistence instead of silently treating that attempt as an unauthenticated public save.
- Preserve the existing public/noindex fallback path for direct-open report URLs, but do not present it as user-owned account storage.
- Account-owned reports remain private/noindex by default.

Not now:
- No local-to-account migration execution.
- No inline signup inside `/chart`.
- No auth driver or database schema change.
- No public/indexable report SEO launch.
- Payment remains paused: no pricing, checkout, paid/private implementation, or monetization mechanics.
## v0.1.223a Idea Garden update — report QA alignment before value upgrade

Decision:
- Before the larger report-value/synthesis upgrade resumes, keep a small QA-alignment milestone that protects the current report writer contract.
- The report writer and sample QA should agree on the weekly-practice markers used by generated reports.
- The next value upgrade should be allowed to improve synthesis, chapter summaries, and reflection prompts, but not by silently breaking existing report QA expectations.

Not now:
- No rewrite of report narrative copy in this alignment batch.
- No account/auth/database change.
- No chart inline signup.
- No public/indexable report SEO launch.
- No payment, pricing, checkout, paid/private implementation, or monetization mechanics.


## v0.1.223b Idea Garden update — report value synthesis lite

Decision:
- Resume report value work in a smaller, guard-safe form after the v0.1.223 rollback and v0.1.223a QA alignment.
- Add chapter-level summaries to the real-engine report narrative so each section has a faster entry point before the existing `Ú†Ø·ÙˆØ± Ø¨Ø®ÙˆØ§Ù†ÛŒ` and `Ø¨Ø±Ø§ÛŒ ØªØ£Ù…Ù„` cues.
- Preserve the current weekly-practice markers used by sample QA instead of renaming headings or changing the report contract.
- Treat this as a report-value improvement, not a new account, payment, SEO, or content-system milestone.

Not now:
- No broad rewrite of the report writer.
- No account/auth/database change.
- No chart inline signup.
- No public/indexable report SEO launch.
- No payment, pricing, checkout, paid/private implementation, or monetization mechanics.


## Implemented decision — v0.1.224 consent/sharing clarity

Status: implemented in `v0.1.224-consent-sharing-clarity`.

Decision:
- Treat report lifecycle language as three separate user-facing states: local/private browser copy, account private/noindex copy, and public/noindex direct-link copy.
- Public/noindex is not the same as private: anyone with the direct link can view it, but it is not an indexable public-report SEO model.
- The post-report prompt should invite account use for future saved reports without embedding inline signup into `/chart`.

Non-goals:
- No payment, pricing, checkout, public/indexable SEO report model, or old local-to-account migration.
- No report narrative rewrite in this batch.

## v0.1.225 — Inline signup prompt inside chart

Decision:
- Add an optional sign-in/sign-up panel inside the chart page, but keep chart generation independent from account creation.
- If the user ignores the panel, the report still generates and opens through the existing local/private fallback.
- If the user signs in before generating, the existing account save bridge can keep the report as account/private/noindex.
- No payment, pricing, checkout, database schema, auth driver, or public/indexable SEO consent mechanics are introduced here.

## v0.1.225a Idea Garden update - product checkpoint before more milestones

Decision:
- After v0.1.225, Halleus should pause automatic feature batching and move to a product QA checkpoint.
- The recent sequence already covered account ownership UX, save-to-account bridge, report QA alignment, report value-lite chapter summaries, consent/sharing clarity, and optional inline chart signup.
- The next milestone must be selected from real product observations rather than continuing a version loop.

Next-chat operating style:
- Continue in the same concise recovery style established at the end of the v0.1.225 chat.
- Use compact Safety Gates, exact live status, and small context ZIPs.
- Avoid broad roadmap restatements, long terminal snippets, and automatic follow-on milestones.
- If the user asks where the project stands, answer from the latest tag and what changed since the last checkpoint, not from an old roadmap.
- Keep chat weight low: summarize, do not replay; ask for targeted outputs only; avoid long pasted files/logs.

Product QA checkpoint should answer:
- Can an anonymous user generate a chart and open a report?
- Does the optional signup prompt help without blocking the chart flow?
- Can a signed-in user save a report to account private/noindex storage?
- Do dashboard and reports pages show saved reports clearly?
- Do local/private, account private/noindex, and public/noindex states remain understandable?
- Does the generated report feel personal enough to be the core product value?

Possible next milestone depends on QA:
- If the report feels shallow: report synthesis second safe slice.
- If the reading experience feels hard to use: report detail reading UX polish.
- If account persistence fails: account save real-flow QA repair.
- If sharing/privacy is confusing: public/private consent foundation.

Not now:
- No payment, pricing, checkout, paid/private report implementation, or monetization mechanics.
- No public/indexable SEO launch before explicit consent design is real.
- No Persian SEO/wiki/content system until report value and consent are strong enough.
- No Sky Pulse until a real transit source is ready.

## v0.1.228 product decision: True Node vector candidate stays gated

- Halleus can explore Method C for True/Osculating Lunar Node because the vector candidate is executable without adding Swiss Ephemeris or another runtime dependency.
- The candidate osculating node remains a validation harness, not a product feature.
- Mean Node remains the product output until independent True/Osculating Node reference fixtures pass.
- Do not market, display, store, or write True/Osculating Node values from the vector candidate until the fixture gate is complete.

## v0.1.230 product decision: True Node helper remains internal

Halleus can calculate a local True/Osculating Node candidate internally, but it should remain invisible to public reports and product UI until approval.
No external API or runtime Swiss Ephemeris dependency should be introduced for this candidate path.
Production-facing astrology should continue to say Mean Node until the True Node model is independently validated and intentionally promoted.
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

## v0.1.248 Sky Pulse homepage API bridge

- Public homepage Sky Pulse advanced from probe done to data bridge done: `/api/sky-pulse/today` now includes real sky-only transit calculation data from `src/lib/chart/sky-only-transit-probe.ts` while preserving the existing homepage response shape.
- The bridge remains Iran/Tehran-only, free/no-login, public sky-only, and does not start natal-to-transit, report narrative, account, payment, API dependency, user-location, or non-Iran timezone work.
- Persian interpretation copy is still the next layer; the API bridge exposes real calculation data without adding deterministic, scary, fake, or horoscope-like daily claims.
- Stage status: Foundation done, Probe done, Data bridge done; User-visible interpretation/UI polish/hardening still remain for v0.1.249-v0.1.251.

## v0.1.249 Sky Pulse Persian interpretation layer

- Sky Pulse / Astro Weather moved forward without resetting roadmap: contract, product scope, calculation probe, and homepage API bridge were already done; this milestone adds the Persian interpretation layer on top of the real sky-only transit output.
- The interpretation is technical + inspirational Persian copy for public homepage Sky Pulse and keeps SEO wording aligned with آسمان امروز, ترنزیت امروز, ترنزیت روزانه, وضعیت آسمان امروز, and حال و هوای آسمان امروز.
- The layer must remain non-fatalistic, non-scary, non-deterministic, and must not create fake daily claims when no valid aspect exists.
- This is still public/free/no-login and Iran/Tehran-only. It does not start personal natal-to-transit, paid/private segmentation, user-location, report narrative, full SEO pages, houses, angles, lunar nodes, or Lilith transits.
- Next smallest step: v0.1.250 should polish homepage display of this existing API content without changing calculation scope.

## v0.1.250 Homepage Sky Pulse UI polish

- Sky Pulse / Astro Weather moved forward without roadmap reset: contract, product scope, calculation probe, homepage API bridge, and Persian interpretation layer were already done; this milestone makes the interpretation visible in the homepage card.
- The homepage copy now names آسمان امروز and ترنزیت روزانه تهران more clearly while keeping the reading technical + inspirational, public/free/no-login, and Iran/Tehran-only.
- The UI must not imply personal natal-to-transit, paid/private segmentation, user-location, houses, angles, lunar nodes, Lilith transits, or a fake daily claim.
- Next smallest step: v0.1.251 should harden public Sky Pulse with guards for fake/hardcoded copy, Tehran-only scope, no-login/free status, SEO wording, and visible route/UI integration.

## v0.1.251 Public Sky Pulse QA hardening

- Public Sky Pulse / Astro Weather has completed the first visible public path: real Tehran sky-only calculation, homepage API bridge, Persian interpretation, homepage UI, and hardening guard.
- The hardened scope remains عمومی، رایگان و بدون لاگین، فقط ایران/تهران، with SEO wording around آسمان امروز، ترنزیت امروز، ترنزیت روزانه، وضعیت آسمان امروز، and حال و هوای آسمان امروز.
- The QA guard protects against fake/hardcoded daily claims, personal natal-to-transit drift, payment/account gating, user-location expansion, and scary/deterministic copy.
- Stage status: User-visible, hardened public Sky Pulse. Next smallest product path after this is the locked roadmap item for personal transit contract, not broad SEO/indexing or payment work.

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

- Product decision: the next active product work is report-detail completion. Every real engine/report feature already built should either be visible in the report detail page or explicitly tracked as deferred.
- Required report-detail items now tracked:
  - The placements-in-houses table must show motion/retrograde inline, for example Saturn in a house with retrograde status beside it.
  - A clear standalone Moon sign / `neshan-e mah-e tavalod` entry must be added.
  - The report must deepen natal chart vs today's/transit chart comparison without silently defaulting personal transit location to Tehran.
  - Each house should show which sign and degree it starts from when the available house/cusp data is honest enough to display.
  - Standalone planet-placement sections must appear before planet relationship/aspect sections, with headings such as Sun in Sagittarius or Moon in Aquarius.
  - Standalone aspect relationship sections must follow placement sections, with headings such as Sun sextile Moon.
  - Placement explanations should be understandable for non-experts and may include positive/challenging traits, interests, examples, and symbolic anatomy/health correlations where appropriate.
- Guardrail: do not force details without real/supportable data. Health/anatomy copy must stay symbolic and non-diagnostic; no disease prediction or medical certainty.
- This milestone is audit/guard only. UI implementation is deferred to smaller componentized batches after this guard.

## v0.1.258 Report detail visible facts panel

- Report-detail completion now begins with visible, user-friendly facts that make existing engine data easier to find.
- Added the direction that report pages should surface standalone Moon sign, retrograde/motion status, and each house cusp's degree/sign before deeper placement/aspect narrative batches.
- This supports the user's requested report-page roadmap while keeping medical/anatomy language out of this facts-only batch. Any future anatomy/health wording must remain symbolic, non-diagnostic, and only appear where the interpretation layer can support it.

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

## v0.1.263 Report narrative quality pass
- Added a narrative-quality pass across the report reading components so the detail page feels less like disconnected cards and more like a guided reading path.
- The synthesis section now explains how to move from core cards to placements, aspect relationships, special points, and personal transit as one layered report.
- Placement, aspect, Lilith/Nodes, and Personal Transit sections now include bridge copy that connects each layer to the previous and next layer while keeping non-fatalistic, non-medical trust boundaries.
- This is report-detail narrative work only: no astrology calculation, transit math, Sky Pulse, account/payment/private, SEO/indexing, or broad redesign changes.
<!-- report narrative quality pass -->

## v0.1.264 Report Structure Order Polish
- Applied the selected app-like report order: synthesis, quick facts, personal transit, core cards, planet placements, aspect relationships, special points, and technical chart details at the end.
- Technical chart data remains available under `جزئیات فنی چارت` instead of interrupting the main reading path.
- No engine math, Lilith/Node calculation, transit calculation, account/payment, or SEO behavior changed.
- Marker: report structure order polish

## v0.1.265 Report Trust Safety Language QA
- report trust safety language qa
- User choice: keep safety language very light and show it once for the whole report page, not repeated inside every narrative card.
- Product copy rule: the page-level note says the report is for inspiration/reflection, not prediction or a final ruling; interpretation and use stay with the reader.
- Scope: copy and guards only; no astrology engine math, transit calculation, report order rollback, public/private model, account/payment, or SEO behavior changed.

## v0.1.265b live report detail route source

Product note: the current user-visible report detail page is `/reports/[reportId]` and its live render path is `ReportDetail -> ReportV3Experience -> report-v3`, not `ReportCard`. Future report UX, trust copy, Lilith, lunar-node, and transit work must target/guard that live path before it is considered product-visible.

## v0.1.265d - live report feature reconciliation

- Roadmap correction: report-depth work must now prioritize the live /reports/[reportId] path, not the older ReportCard/preview path.
- Live report feature reconciliation sequence: guard/reality cleanup, structure + facts, placements + aspects, Lilith + Nodes, Personal Transit, then final sample QA.
- Lilith deep narrative and Personal Transit remain product goals, but they must not be claimed live until ReportDetail renders them or report-v3/writer exposes them in the live path.

## v0.1.266 live report structure + facts

- v0.1.266 brings the quick facts panel into the live /reports/[reportId] path through ReportDetail, not ReportCard.
- ReportDetailFactsPanel is now live for moon sign, retrograde status, and house cusp facts.
- This step is limited to live report structure + facts; Lilith deep narrative, personal transit, placements, and aspects remain separate reconciliation steps.
- v0.1.267: Live report placements/aspects bridge is now wired through ReportDetail for /reports/[reportId]; Lilith deep narrative is now live in ReportDetail; personal transit remains explicitly not live yet.
- v0.1.268: Lilith deep narrative is now live in ReportDetail for /reports/[reportId] through ReportSpecialPointsNarrativeSection; lunar-node narrative remains live through the writer and the live special-points bridge. Personal transit is not live yet.
