# Recovery Notes

Date: 2026-06-24
Project: Astro Clean

## What happened

During the engine/UI batches, several generated PowerShell scripts modified TSX and TypeScript files with unsafe text handling.

The production site showed broken Persian text in two forms:

- Mojibake, for example: Ø®ÙˆØ±Ø´ÛŒØ¯
- Literal unicode escapes, for example: \u0633\u0627\u062E\u062A

The unstable UI changes were rolled back from main. Then the stable Persian engine encoding fixes were reapplied.

## Current stable state

Production is stable again on halleus.ir.

Current stable recovery tag:

- v0.1.5-stable-recovery

The current safe scope includes:

- Public domain is live
- Chart form is usable again
- Local report generation works
- Engine text encoding is fixed again
- UI is back to a stable baseline

## Root causes

1. Large regex-based TSX patches were too risky.
2. PowerShell script encoding caused Persian text corruption.
3. Some unicode escapes were written as literal text instead of decoded strings.
4. Multiple batches were applied out of order during debugging.
5. Reverts also reverted useful UTF-8 fixes, so stable fixes had to be reapplied.

## Rules going forward

1. Do not use large regex patches on TSX files.
2. Do not use Set-Content -Encoding ascii for files containing Persian text.
3. Do not place literal \uXXXX strings directly inside JSX text.
4. Inspect files before every UI patch.
5. Keep each batch to one small goal.
6. Run pnpm lint and pnpm build before every commit.
7. Push only after local build is green.
8. Test production in Incognito after each deploy.
9. Prefer documentation or isolated engine files over UI changes when possible.
10. For UI changes, edit small blocks only and verify with file inspection.
