# Halleus Project Context

Last updated: 2026-06-26

This file is the handoff source of truth for continuing the Halleus project in any future ChatGPT session or with any other assistant. It should be updated after every successful batch or whenever the workflow rules change.

## 1. Project identity

- Project name: Halleus
- Local Windows path: `C:\Projects\astro-clean`
- GitHub repo: `https://github.com/bleucluod/astro-clean.git`
- Branch: `main`
- Package manager: `pnpm`
- Stack: Next.js App Router, TypeScript, React, `astronomy-engine`
- Deploy target: Render / `halleus.ir`

## 2. Product goal

Halleus is a Persian birth-chart and birth-report platform with a soft, human, product-oriented tone. It is intended for non-technical Persian-speaking users.

MVP goal:

1. User enters birth information.
2. User receives a Persian birth-chart report.
3. Report is saved locally for now.
4. User can read saved reports.
5. User has a manual path to order a fuller paid version before online payment/backend are added.

## 3. Current stable Git baseline before this context-file batch

The last known clean product checkpoint before adding this handoff file was:

```text
49d8cc7 (HEAD -> main, tag: v0.1.70-jalali-birth-date-input, origin/main, origin/HEAD) Add Jalali birth date input
6d4d2e6 (tag: v0.1.69-order-entry-links) Link manual order entry points
d8e6a0b (tag: v0.1.68-manual-order-request-shell) Add manual order request page
d473394 (tag: v0.1.67-sales-navigation-polish) Polish sales navigation
d2491bf (tag: v0.1.66-paid-mvp-shell) Add paid MVP shell
```

`git status --short` was clean before the attempted `v0.1.71-report-order-context` runner. After the failed repair runner, tracked files were restored and the remaining status was only untracked helper/context files:

```text
?? _halleus_071_report_order_context.txt
?? halleus-071-patch.cjs
?? halleus-071-repair-patch.cjs
?? halleus-071-report-order-context-repair.ps1
?? halleus-071-report-order-context.ps1
```

This handoff-file batch may add a commit like:

```text
Add Halleus project handoff context
```

Do not treat that commit as a product milestone. The next product milestone can still be `v0.1.71-report-order-context` unless a later context update says otherwise.

## 4. Recent completed product milestones

### v0.1.68-manual-order-request-shell

Completed, committed, tagged, and pushed.

Added:

- New `/order` route.
- Manual order request page.
- `components/ManualOrderRequestForm.tsx`.
- Base CSS for manual order flow.
- Form prepares and copies order text only.
- No real backend or payment.
- Build passed.

### v0.1.69-order-entry-links

Completed, committed, tagged, and pushed.

Added:

- `/order` linked into sales/product/pricing surfaces.
- Manual order path became discoverable.
- Build passed.

### v0.1.70-jalali-birth-date-input

Completed, committed, tagged, and pushed.

Added:

- `/chart` birth-date input changed from Gregorian date picker to Jalali/Persian text input.
- User enters dates like `۱۳۷۸/۰۵/۲۱`.
- Internal `birthDate` contract remains Gregorian ISO `YYYY-MM-DD`.
- Real engine and save flow remained intact.
- Added `lib/date/jalali.ts`.
- Added `scripts/check-jalali-birth-date-input.mjs`.
- Added package script `check:jalali-birth-date-input`.
- Passed targeted checks and `pnpm build`.

Important contract:

- `BirthInput.birthDate` must remain Gregorian ISO `YYYY-MM-DD` internally.
- Jalali is UI/input-facing only for now.
- Do not change real-engine or storage contract to Jalali.

## 5. Current product flow after v0.1.70

1. User opens `/chart`.
2. User enters Jalali birth date, birth time, and city.
3. UI converts Jalali birth date to Gregorian ISO for internal state.
4. Real engine uses `/api/engine/real-chart`.
5. Report is generated and saved.
6. User is routed to `/reports/[reportId]`.
7. User can read saved report.
8. User can find manual order flow through `/order`, product/pricing, and sales navigation.

Important routes:

- `/chart`: report generation with Jalali birth-date UI.
- `/reports`: saved report archive.
- `/reports/[reportId]`: report detail.
- `/product`: product explanation.
- `/pricing`: pricing/manual order entry.
- `/order`: manual order request form.
- `/privacy`: data/privacy explanation.

## 6. Current file findings for report/order area

These findings came from the context collected before the failed `v0.1.71-report-order-context` attempt.

### `app/reports/[reportId]/page.tsx`

Current structure:

- Server route imports `ReportDetail`.
- `params` is typed as a Promise containing `reportId`.
- It awaits params and renders:

```tsx
return <ReportDetail reportId={reportId} />;
```

### `components/ReportDetail.tsx`

Current structure:

- Client component.
- Imports `Link`, React state/effect, `EmptyState`, `ReportCard`, share text, and `getReportRepository`.
- Uses:

```ts
const reportRepository = getReportRepository();
```

- Loads a report with:

```ts
const selectedRecord = await reportRepository.getReport(reportId);
setReport(selectedRecord?.report ?? null);
setNote(selectedRecord?.note ?? "");
setIsFavorite(selectedRecord?.favorite ?? false);
```

- Has export JSON, export TXT, notes, empty state, and detail card.
- Renders `ReportCard report={report}`.
- This is the safest place to add a CTA to `/order?reportId=...` because it has both `reportId` and the loaded `report`.
- Avoid touching `ReportCard` unless necessary; it is marker-sensitive and has many checks attached.

### `components/ReportCard.tsx`

Current structure:

- Client component.
- Receives `report: AstrologyReport`.
- Uses `createShareText`.
- Contains product/report UI markers used by checks, including:
  - `report-product-card`
  - `report-product-hero`
  - `report-core-card`
  - `report-calculation-section`
  - `report-aspect-card`
  - `report.realEngine?.aspects`
  - `aspect.narrative`
  - `PLANET_LABELS_FA`
  - `SIGN_LABELS_FA`

Do not casually rewrite this file.

### `app/order/page.tsx`

Current structure before the failed patch:

- Server component.
- Imports `Metadata`, `Link`, and `ManualOrderRequestForm`.
- Does not read query params yet.
- Renders:

```tsx
<ManualOrderRequestForm />
```

For report-order context, this page should read `searchParams.reportId` and pass it to the form as a prop.

### `components/ManualOrderRequestForm.tsx`

Current structure before the failed patch:

- Client component.
- No props yet.
- Internal state type:

```ts
type ManualOrderForm = {
  name: string;
  contact: string;
  plan: (typeof planOptions)[number];
  reportLink: string;
  notes: string;
};
```

- `initialForm.reportLink` is empty.
- `requestText` is built with `useMemo` and copied with `navigator.clipboard.writeText(requestText)`.
- No backend, no payment, no submit-to-server.

For report-order context:

- Add prop `initialReportId?: string`.
- Initialize `reportLink` from `initialReportId`.
- Optional but useful: inside the client component, use `getReportRepository().getReport(initialReportId)` to load local report details and include name/date/time/city in request preview.
- Because `/order` is server-side, any localStorage/report repository read must happen in the client form, not in `app/order/page.tsx`.

### Storage and types

`types/astro.ts` includes:

```ts
export type BirthInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthCountry: string;
  birthCityId?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezone?: string;
};

export type AstrologyReport = {
  id: string;
  createdAt: string;
  input: BirthInput;
  chart: MockChart;
  realEngine?: RealEngineReportSnapshot;
  summary: string;
  interpretations: string[];
  safetyNote: string;
};
```

Storage findings:

- `lib/storage/report-write-service.ts` saves via `getReportRepository().saveReport(reportWithEngine)` and notifies local data changes.
- `lib/storage/report-repository.ts` currently returns `localReportRepository`.
- `lib/storage/reports-storage.ts` still has lower-level localStorage helpers (`loadReports`, `saveReport`, `deleteReport`, `clearReports`).
- Prefer the repository API used by `ReportDetail`, not old direct storage helpers, unless exact current context says otherwise.

## 7. Failed `v0.1.71-report-order-context` runner attempts

Two runner attempts failed because the patchers used brittle markers inside `ManualOrderRequestForm.tsx`.

### First failure

Command:

```powershell
powershell -ExecutionPolicy Bypass -File .\halleus-071-report-order-context.ps1
```

Failure:

```text
Error: ManualOrderRequestForm insert position after reportLink not found.
```

It partially modified:

```text
 M app/order/page.tsx
 M components/ReportDetail.tsx
```

### Repair runner failure

Command:

```powershell
powershell -ExecutionPolicy Bypass -File .\halleus-071-report-order-context-repair.ps1
```

Failure:

```text
Error: ManualOrderRequestForm state block marker not found.
```

The repair runner restored tracked files back to `HEAD`. Remaining files were untracked helper/context files only.

Lesson:

- Do not build another marker-heavy patcher for this batch.
- Next implementation should use full-file replacement for `ManualOrderRequestForm.tsx` and possibly `app/order/page.tsx`, or a very small and verified patch on exact current file content.
- If a runner modifies files before failing, it must always rollback tracked files before exiting unless a commit has already succeeded.

## 8. Working rules for future assistants

Language:

- Respond in Persian unless the user explicitly asks for English.

User workflow:

- User downloads a ZIP, extracts it elsewhere, and copies the runner/helper files into `C:\Projects\astro-clean`.
- Runner must work when executed from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\runner-name.ps1
```

Runner rules:

- Keep runners small and single-purpose.
- Before each batch, collect exact current file context for touched files.
- Do not guess file structure.
- Avoid fragile markers, especially in files with Persian/mojibake text or frequently changed UI.
- Prefer full-file replacement for client forms/pages when the file is short and exact current content is known.
- Avoid nested PowerShell -> embedded JS -> TSX/template quoting.
- Use external helper files in ZIP when needed.
- PS1 should mostly orchestrate; complex patch logic should live in a separate `.cjs` file.
- Fail fast.
- If any step fails before a successful commit, restore tracked files touched by that runner.
- Do not create tags until after a successful commit.
- Do not rollback after a successful commit/tag.
- Handle empty git outputs safely.
- Allow the runner itself and known helper files to be untracked.
- Do not ignore unknown dangerous untracked files if they look relevant to source changes.

Checks:

- Use targeted checks for touched areas.
- Run `pnpm build` only when TypeScript/runtime risk exists.
- Reserve full `check:project` for grouped milestones/pre-deploy.
- For doc-only/context changes, `pnpm run check:encoding` is enough unless source code changes.

PowerShell notes:

- If the prompt becomes `>>`, a quote is probably open. Press `Ctrl+C`.
- If git opens pager with `(END)`, press `q`.
- Windows `LF will be replaced by CRLF` warning is not an error.

## 9. Next product batch still desired

### Planned product milestone

`v0.1.71-report-order-context`

Product goal:

- Add a CTA in report detail: `سفارش نسخه کامل‌تر این گزارش`.
- Link to `/order?reportId=<report.id>`.
- Make `/order` read `reportId` and pass it to `ManualOrderRequestForm`.
- Make the manual order form include the report id in the prepared order text.
- If safe, load report details client-side and include:
  - report id
  - name from `report.input.name`
  - birth date from `report.input.birthDate`
  - birth time from `report.input.birthTime`
  - city/country from `report.input.birthCity` / `birthCountry`
- Do not add backend or payment.
- Do not change the internal `birthDate` contract.

Suggested implementation approach after this context file exists:

1. Ask user for exact current content of:
   - `components/ManualOrderRequestForm.tsx`
   - `app/order/page.tsx`
   - `components/ReportDetail.tsx`
   - `package.json`
2. Use full-file replacement for `ManualOrderRequestForm.tsx` if needed.
3. Use a tiny verified replacement for `ReportDetail` actions area or add a small order CTA card after `ReportCard`.
4. Add `scripts/check-report-order-context.mjs`.
5. Add `check:report-order-context` to `package.json`.
6. Run:

```powershell
pnpm run check:report-order-context
pnpm run check:report-detail-product-ui
pnpm run check:real-report-save-flow
pnpm run check:encoding
pnpm build
```

7. Commit:

```text
Link reports to manual order context
```

8. Tag:

```text
v0.1.71-report-order-context
```

## 10. Update protocol for this file

After every successful batch, update this file in the same commit or a nearby commit with:

- new Git commit hash and tag
- changed files
- checks run
- product behavior changed
- known risks or deferred work
- next planned batch

This file exists so future chats should not need to ask the user to reconstruct history from memory.
