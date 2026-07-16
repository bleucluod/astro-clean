<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Impact-based verification

Use the shared impact registry in `config/halleus-check-impact.json` before handing off a change:

- `pnpm run check:plan` prints the plan for tracked and untracked worktree changes against `HEAD`.
- `pnpm run check:plan -- path/to/file another/file` previews an explicit set of paths.
- `pnpm run check:plan -- --base <ref> --head <ref>` previews a Git range.
- `pnpm run verify` executes the planned guards and then runs lint and a production build only when the plan requires them.

Pull requests use the same planner through `.github/workflows/halleus-verify.yml`. Keep path-to-guard decisions in the registry instead of duplicating them in local scripts or CI. Documentation-only changes skip lint and build; application runtime changes require both. Unregistered paths deliberately fall back to baseline guards, lint, and build.

Text files are UTF-8. Repository defaults are LF, with CRLF reserved for Windows command files as defined by `.gitattributes` and `.editorconfig`. Do not mass-normalize unrelated existing files while making a focused change.

## قواعد پایدار ارتباط با کاربر

- همهٔ توضیحات، گزارش‌های پیشرفت و پرسش‌های مجوز باید فارسی و خوانا باشند.
- هیچ فرمان، نام فایل، مسیر، برچسب، متغیر یا عبارت لاتین نباید در میانهٔ جملهٔ فارسی قرار بگیرد.
- هر مورد لاتین باید در خطی جداگانه و داخل بلوک کد نوشته شود.
- در پرسش مجوز، ابتدا توضیح فارسی نوشته شود و فرمان مربوط در بلوک کد جداگانه بیاید.
