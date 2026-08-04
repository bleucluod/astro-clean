# Next Steps

Project: Astro Clean

## Immediate priority

Keep production stable.

Do not reintroduce large UI batches until the recovery baseline is protected.

## Recommended next batches

### Batch A: Documentation checkpoint

Add recovery notes and next-step plan. No UI changes.

### Batch B: Safer chart form defaults

Goal:
- Default country: Iran
- Default city: Tehran

Rules:
- Small manual edit only
- No regex replacement on full JSX blocks
- No Persian text rewriting unless inspected first

### Batch C: Engine v0 stable branch

Goal:
- Continue engine work in isolated engine files
- Avoid ReportCard UI rewrites for now

### Batch D: Export and QA

Goal:
- Improve JSON/text export
- Add safety and version notes
- Avoid visual UI rewrites

### Batch E: Future Persian UX

Later, not now:
- Jalali birth date input
- Iran city database
- city latitude/longitude/timezone
- real astrology chart calculation interface

## Development workflow

1. Create or inspect one small target.
2. Make one small change.
3. Run:
   pnpm lint
   pnpm build
4. Commit.
5. Push.
6. Confirm Render deploy.
7. Test halleus.ir in Incognito.

## Current risk areas

- Persian text encoding in generated scripts
- TSX block replacement
- LocalStorage holding old broken reports
- Render/Cloudflare cache confusion
- Detached HEAD or wrong Git branch

## Safe baseline

Use tag v0.1.5-stable-recovery as the known stable recovery point.
