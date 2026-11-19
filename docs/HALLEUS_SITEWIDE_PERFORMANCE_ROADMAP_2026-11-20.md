# Halleus — Sitewide Performance & Stability Roadmap

**Status:** PROPOSED / WORK REVIEW ONLY — not approved for implementation or release  
**Created:** 2026-11-20  
**Owner goal:** make the entire Halleus site substantially faster on mobile and desktop, aiming for stable 90+ mobile Lighthouse scores on representative public routes and approaching 95–100 where technically feasible, with **zero accepted visual, functional, privacy or commerce regressions**.  
**Repository:** https://github.com/bleucluod/astro-clean  
**Branch:** `main`  
**Official release engine:** `ops/vps/halleus-release.sh`

> This file is an actionable brief for ChatGPT Work. Its publication approves **documentation only**. It does not authorize editing application code, adding dependencies, creating commits/tags, deploying, changing payments/auth/DB/VPS configuration or activating features. Start with a read-only evidence review; get explicit approval before implementation and a separate explicit approval before the final release.

## 1. Definition of success

1. **Whole-site, not /chart-only.** Improve shared runtime first, then route-specific bottlenecks across homepage, chart, compatibility, sky, wiki, store, products, checkout and user/report experiences.
2. **Stable, measurable results.** Target median mobile Lighthouse Performance **≥90** on each representative public page, aim for **≥95** and possibly ~100 where sustainable. Do not promise 100 universally; measure difficulty and trade-offs per route. Desktop must not regress.
3. **Real-user experience.** Target field Core Web Vitals at p75 when enough valid data exists: LCP ≤2.5s, INP ≤200ms and CLS ≤0.1. For controlled lab tests, aim for TBT <200ms and reduced LCP/FCP. Lab TBT is **not** INP.
4. **Visual and functional equivalence.** Maintain the approved design, content, animations worth keeping, mobile layout and all user journeys. No artificially improved scores by hiding meaningful content, preventing legitimate analytics/commerce activity, changing robots/SEO, or disabling features.
5. **Production safety.** The current working production release remains live until a complete candidate passes validation and its release is explicitly approved. Do not manipulate live data, secrets, env, service, Nginx, or self-hosted Supabase to pursue performance without a separate, evidence-backed approval.
6. **Honest accounting.** Report measured before/after results, caveats, blocked checks, failures and reproducibility. A passed build or static-marker guard is not a substitute for browser tests.

## 2. Verified context, existing failure and baseline discipline

- At document creation, GitHub `main` points to `137b395160d78741eea7732474c83c447c33e262`, tagged `v2026.11.19-chart-trace-perf-137b395`.
- The immediately prior performance commits are `35812b8668564d3420d1650080b700af93edad37` (deferred city directory), `50772eb9699ed0672af1a0169f20c556a753b40e` (first-render DOM/offscreen content) and `137b395160d78741eea7732474c83c447c33e262` (GA script deferral on /chart).
- The `137b395` release built and passed production release smoke checks, **but subsequently exhibited a broken, horizontally enlarged/cropped mobile /chart layout**. The owner rolled production back and reported that mobile appearance was restored; the rolled-back Lighthouse result was **52**. The last confirmed prior release target recorded before rollback was `35812b8668564d3420d1650080b700af93edad37`. **Recheck active/previous release paths and metadata on the VPS before treating any SHA as the current live state.** A GitHub HEAD, checked-out VPS source, and live atomic release are different things.
- The mobile Lighthouse exports saved privately by the owner include:
  
  | Captured (UTC) | Performance | FCP | LCP | TBT | CLS |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | 2026-11-19 18:20 | 38 | 4.17s | 5.03s | 5,655ms | 0 |
  | 2026-11-19 18:49 | 44 | 3.45s | 4.60s | 5,300ms | 0 |
  | 2026-11-19 20:27; problematic deployed candidate | 49 | 2.16s | 5.00s | 4,510ms | 0 |

  All three are mobile lab runs with a 412px emulated viewport, not controlled A/B repetitions. The owner's **52** after rollback is a separate observation, not proof by itself of causation.
- The 49-score report attributes approximately **4.89s to JS evaluation** and **3.99s to Style/Layout** within main-thread work; the Google Analytics script accounts for ~**1.55s total CPU time** in the boot-up audit. These figures use different attribution categories and **must not be added together**.
- The problematic Lighthouse report includes an LCP H1 bounding box about **750px wide**, extending beyond the emulated **412px** viewport. An added CSS rule in `app/chart/chart-shell.module.css` uses `contain-intrinsic-size: auto 760px` for offscreen informational sections. This is a **high-priority suspected** grid intrinsic-sizing / horizontal-overflow regression; reproduce and isolate the cause rather than assert it as proven. The old trace guard `scripts/check-chart-trace-first-render.mjs` checked static markers, not viewport geometry.
- Existing chart performance experiments did improve FCP in the measured runs but failed to demonstrate an acceptable end-to-end result. **Do not redeploy them wholesale or optimize from the defective main branch without reconciling it against the working production layout.**
- Private Lighthouse/Chrome trace artifacts exist outside the public app repository. Read only through authorized access; keep individual visitor/session identifiers, exports and production secrets out of public GitHub, logs and drafts.

## 3. Scope and representative route matrix

Start with representative URL families, then expand to other important routes that share components. Include both mobile and desktop; use safe, synthetic test accounts/data where sign-in is needed.

| Family | Examples | Primary failure risks |
| --- | --- | --- |
| Shared shell | header, menu, footer, CTA, analytics and route navigation across all pages | shared JS, event listeners, prefetch, icon/image cost, layout stability |
| Home | `/` | LCP media/hero, fonts, live sky, product previews, shared JS |
| Birth chart | `/chart` | horizontal overflow, initial hydration, form DOM, city lookup, mobile date/time pickers and submit |
| Comparison | `/compare` | form and chart calculations, submission correctness |
| Sky | `/sky` and representative dated page | live/dynamic content, fetches, animation/update behavior |
| Wiki | `/wiki`, representative `/wiki/[slug]` and category | long content, image priority, interactive CTAs, content layout, editorial visibility |
| Shop | `/shop`, product detail including `/shop/[slug]` | galleries, image sizes, critical content, current prices and availability |
| Checkout / commerce | `/shop/cart`, `/shop/checkout`, relevant order/tracking paths | pricing correctness, auth/session boundaries, no double-submit or payment disruption |
| Account and report | `/profile`, `/reports`, representative owned/shared report | privacy, auth state, sensitive data, complex chart rendering |
| Operational/admin regression | relevant admin UI where shared shell/config changes can affect it | permissions and private data; no speculative optimization of privileged routes |

Before measurement, verify that each concrete URL actually exists, is reachable, and represents the intended route. Do not assume all example pages are publicly accessible.

## 4. Eight required workstreams

### W1 — Sitewide performance audit and reproducible baseline

- Verify exact GitHub origin/branch/HEAD, recent commits and tags, and production `current`/`previous` release metadata separately.
- Capture lab baselines for route families using the same Chrome/Lighthouse version, viewport, network/CPU throttling and cache state. Use at least **three** comparable lab runs per candidate/route and compare medians plus distributions.
- Gather LCP element and subparts, FCP, TBT, CLS, Speed Index, transferred/decoded bytes, JS execution, layout/style time, blocking requests and server response. Examine INP and other p75 field CWV only where real data is sufficient and privacy-safe.
- Inspect original traces and their main-thread long tasks; distinguish server delay, network, third-party execution, hydration and CSS layout costs.
- Produce a ranked, evidence-linked opportunity list with estimated benefit, risk, affected routes and proof needed. No guessed Lighthouse-point uplift.

**Exit:** traceable baseline matrix and specific high-impact root causes for major route families.

### W2 — JavaScript, bundle and hydration reduction

- Inspect actual Next.js production client bundles and route dependency graphs; identify largest first-load chunks, duplicate libraries and code used only after interaction.
- Reduce client boundaries: preserve Server Components for static/editorial output; move only actual interaction into small client islands without changing product behavior.
- Split/defer heavy date/city selectors, chart interactions, optional dialogs, previews and other route-specific widgets only when genuinely absent from first interaction.
- Evaluate script parsing/evaluation, hydration and event-handler overhead before and after; avoid merely moving tasks a few hundred milliseconds later.
- Verify no changed engine output, incorrect validation, hydration mismatch, inaccessible control, keyboard/touch regressions or unnecessary network round trips.

**Exit:** measured lower initial JS execution/TBT and complete functional parity.

### W3 — Shared shell, navigation, tracking and prefetch

- Audit `components/AppShell.tsx`, `components/SiteHeader.tsx`, `components/IntentPrefetchLink.tsx`, `components/AnalyticsConsent.tsx` and `components/HalleusAnalyticsTracker.tsx` against the deployed runtime.
- Consolidate redundant scroll/resize/visibility work if profiles show a meaningful impact. Keep header hiding/returning, mobile menu, focus behavior and animations intact.
- Check always-loaded shared images, CTA bootstrap, route-aware footer controls and prefetch strategy. Avoid speculative global rewrites.
- Quantify GA4 and first-party analytics cost. Keep public-route gates, consent revocation, non-personalized defaults, and report/private-route exclusions; don't silently disable measurement to raise scores.
- Keep navigation fast in both warm client transitions and cold page loads.

**Exit:** shared overhead demonstrably decreases without changing analytics/privacy semantics or shared UI behavior.

### W4 — Images, fonts and critical rendering path

- Audit above-the-fold LCP images, hero media, header/logo, product/gallery images and wiki illustrations by route and viewport.
- Correct `sizes`, intrinsic dimensions/aspect ratios, priority/`fetchPriority`, format/compression and below-fold loading; do not crop, recolor or regenerate approved product artwork.
- Inspect Vazirmatn and Dana actual usage: the /chart Lighthouse reports requested both. Remove only objectively redundant font requests and retain Persian readability, weight/fallback and visual geometry.
- Remove truly unused blocking CSS where safe; scope CSS to routes, avoid large global selector changes and preserve print/editorial content.
- Analyze request chains and verify improvement to the actual LCP element; image bytes are not always the dominant cause.

**Exit:** improved measured LCP/FCP and stable images/fonts/CLS across viewports.

### W5 — CSS, layout, compositing and mobile correctness

- Reproduce the 412px defect from the problematic /chart candidate. Identify the exact element increasing `scrollWidth` and its ancestor/min-content/containment behavior.
- Treat `contain-intrinsic-size: auto 760px` as a candidate culprit to test; use an explicitly height-only safe alternative **only if** confirmed or remove the optimization.
- Audit large-grid min sizes, fixed widths, `100vw` misuse, nested overflow, dialogs, sticky elements, animations, paint and forced reflow on heavy pages.
- Check rendering during initial load, after hydration, while scrolling, with input focus/keyboard, with dialogs open and after navigation.
- Preserve the design system and animation identity; favor reduced CPU/compositor work rather than indiscriminately removing visual features.

**Exit:** no unintended horizontal page overflow or clipping at 320/360/390/412/430/768px and desktop; visual review of screenshots against the approved production baseline.

### W6 — Server rendering, caching and dynamic data

- Audit server rendering, static/ISR/dynamic route boundaries, TTFB and cache invalidation per family. Respect Next.js 16.2.9 current source and documented APIs; do not infer behavior from older versions.
- Retain suitable pre-rendering for public wiki/editorial pages where supported; optimize truly slow server data reads only when measured.
- Audit image optimization/cache and repeat requests without making user-specific, price, order, checkout, auth, or personal report data publicly cacheable.
- Before any DB/Auth/Supabase/VPS change inspect `docs/HALLEUS_PROJECT_CONTEXT.md`, related authorities, actual env **names** (never expose values), deployment configuration and `ops/vps/halleus-release.sh`. Production Supabase is **self-hosted** on the VPS; no assumptions about a cloud pooler, ports, hostnames or topology.
- Do not introduce CDN/proxy/caching/infrastructure work or new monitoring services by default: propose only after measured need and separate explicit approval.

**Exit:** latency reductions with proven freshness, privacy and billing boundaries.

### W7 — Family-specific optimizations

- **Chart:** lightweight first paint, precise mobile viewport, city directory only on demand, correct DOB/time pickers, submission/real-engine output unchanged.
- **Compare:** shared form fixes only after its route is profiled; protect compatibility and result behavior.
- **Sky:** defer visuals that do not affect first view while preserving source freshness and time-sensitive data.
- **Wiki:** low-JS editorial HTML, image priority, intact reading order, anchors, CTA triggers and accessibility.
- **Shop/products:** optimized gallery media and catalog rendering, no changes to product art/text/price/availability semantics.
- **Checkout:** preserve cart, totals, payment initiation, return/cancel, idempotency and authentication. Do **not** execute a real payment in tests.
- **Reports/account:** no access-control/privacy leaks, no calculation or content regressions, no personal data in public builds.

**Exit:** route-specific improvements measured independently; no accepted regressions in dependent flows.

### W8 — Regression prevention, verification and release

- Establish responsive browser checks (real browser, not static source-string checks) at 320/360/390/412/430px, tablet and 1280/1440px; compare screenshots and assert `document.documentElement.scrollWidth <= window.innerWidth` when page-level horizontal scrolling is not intentionally part of the design.
- Assert correct form/touch/keyboard/dialog/navigation flows, chart/compare engine inputs/outputs, article reading, gallery/product pages, cart/checkout, authentication and access controls.
- Run the repo's existing impact-plan and focused guard/test/lint/type/build checks appropriate to each change. Do not turn a small fix into an unrelated full-repo audit by default.
- Compare repeated Lighthouse runs and at least one actual browser trace per major bottleneck after each materially changed candidate. Reject regressions in viewport, user journeys, critical CWV, privacy or commercial behavior even if a single Performance score improves.
- Perform a full safe independent failure-discovery pass on the first integrated candidate (`R1`), gather root causes, repair related failures in one candidate (`R2`) and resume unaffected passed checks rather than rebuilding from scratch.
- Only after **all** items pass, provide changed files, actual diff summary, baseline-versus-candidate matrix, passed/not-run/blocked/external evidence, known trade-offs, risk, rollback plan and production impact.
- Await explicit release approval. Commit/tag/push/deploy only at the authorized boundary; use `ops/vps/halleus-release.sh` exclusively for production activation and verify `current`, `previous`, service state and live smoke. A plain Git Pull does **not** activate a versioned release.

**Exit:** approval-ready single release candidate, production untouched until permission.

## 5. Prioritization, guardrails and acceptance gates

**Preferred order:** verify safety/baseline → fix known mobile regression before inheriting defective code → profile and optimize sitewide shared JS/hydration → critical CSS/media/fonts → route-family bottlenecks → protected server/cache improvements when justified → integrated responsive and performance acceptance → separately approved release.

- Prioritize by demonstrated main-thread milliseconds, LCP bottleneck and number of routes affected, not by how sophisticated a technique sounds.
- Classify effort per **actual change slice**: L1 tiny UI; L2 contained flow; L3 shared/cross-route/performance contracts; L4 auth/privacy/payment/production-critical. Select smallest reliable checks and stricter gates for L4.
- No unrelated SEO/editorial work, redesigns, sweeping rewrites, infrastructure polish, new GitHub Actions, experimental PRs, Base64 source generation, speculative dependencies or hidden product functionality changes.
- Preserve product palette, typography, header logo/animation identity, wheel readability and approved artwork. Never use `overflow-x: hidden` or viewport zoom restrictions merely to mask real overflow.
- Compare with the **working production version**, not only with defective GitHub `main`. Never reset unrelated work, force-push or mutate the production checkout manually.
- Allow a route to remain below the aspirational 90+ goal only with a documented measured blocker and explicit acceptance; don't claim completion by changing the measurement profile.
- Keep field data and per-user analytics privacy-safe; no personal health/birth data, auth tokens, private reports, secrets or full private traces in public artifacts.

## 6. Work's first response / expected deliverables

**First pass is READ-ONLY.** Inspect real GitHub repo, current branch/HEAD, relevant authority files, current scoped source and user-provided performance reports (where access is authorized). Verify user-reported rollback state if live VPS access is available; otherwise explicitly mark it as unverified.

Return:
1. A short executive diagnosis of why 38–49 scores occurred and what the confirmed vs suspected causes are, including the mobile 750px overflow case.
2. A prioritized whole-site work plan with real affected files/components, estimated blast radius, risks, and measurable acceptance tests.
3. A route-by-route **baseline collection protocol** and what Work can run autonomously versus what needs live/browser/test-account access, including limitations.
4. A proposed cohesive implementation candidate that starts from a safe code baseline and does not inherit the broken layout; list any decisions requiring owner approval.
5. A realistic upper bound/uncertainty discussion for approaching 90–100, not a guarantee; show which routes and metrics are likely hardest.
6. A clear permission boundary: **do not change source, create a commit/tag, push, deploy or touch production** during the first response. Wait for explicit approval for implementation; wait separately for final release.

**Roadmap completion means all eight workstreams are actually executed and verified, and (if final deployment is explicitly included/authorized) released and smoke-tested. Creating or reviewing this Markdown file does not complete the roadmap.**
