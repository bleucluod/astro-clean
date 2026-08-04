# Pre-Deploy Checklist

Run this checklist before pushing code to production.

## Local checks

Run:

- pnpm lint
- pnpm build
- git status

## UI checks

Open locally:

- http://localhost:3000
- http://localhost:3000/chart
- http://localhost:3000/reports
- http://localhost:3000/roadmap
- http://localhost:3000/wiki

Check:

- Persian text is readable
- No mojibake such as O-slash style broken text
- No literal unicode strings such as backslash-u Persian codes
- Chart form works
- Report page opens
- No console-breaking UI issue

## Encoding checks

Run:

Select-String -Path lib\astro-engine\*.ts,lib\astrology\*.ts,components\*.tsx -Pattern "Ã˜|Ã™|Ã›|Ãš|Ã¢â‚¬|\\u06"

This should return no unexpected output.

## Git checks

Run:

- git status
- git --no-pager log --oneline --decorate -5

## Deploy checks

After push:

1. Wait 1 to 3 minutes.
2. Open Render Deploys.
3. Confirm latest commit is building or live.
4. If auto deploy does not start, use Manual Deploy -> Deploy latest commit.
5. Test production in Incognito.

Production URL:

- https://halleus.ir


## Automated project checks

Run this before every production push:

- pnpm run check:project

This command cleans temporary batch files, runs the encoding guard, runs lint, and builds the app.
