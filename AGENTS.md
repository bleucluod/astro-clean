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

## قانون پایدار تحویل: GitHub-first و Pull-first (۲۰۲۶-۱۱-۱۰)

- **ترجیح قطعی مالک در تمام کارهای هالیوس:** هر تغییر مجاز تا حد امکان مستقیماً در GitHub آماده و با بررسی مناسب تأیید شود؛ مالک فقط نسخهٔ جدید را دریافت کند، یا در صورت لزوم انتشار رسمی VPS را اجرا کند. دادن ZIP، Patch، بستهٔ منبع یا PowerShell Runner به‌عنوان روش پیش‌فرض ممنوع است.
- قبل از ویرایش، مخزن/شاخه/HEAD و سورس و قراردادهای واقعی را بررسی کن؛ پیش از هر Commit/Push از مجوز صریح همان مرز مطمئن شو. «شروع کن» به‌معنای مجوز خودکار Commit میانی، Migration، Tag، Deploy یا فعال‌سازی پرداخت نیست.
- پس از Commit مجاز در GitHub، فقط شناسهٔ Commit، فایل‌های متأثر، شواهد تست و **یک فرمان کوتاه و امن دریافت نسخه** ارائه بده. از کاربر نخواه تغییراتِ موجود در GitHub را خودش با Runner دوباره اعمال کند.
- قبل از پیشنهاد Pull، وضعیت محلی شاخه، Index، فایل‌های تغییرکرده و فایل‌های ثبت‌نشده را بسنج. هرگز Reset/Clean/Stash خودکار، Force، حذف یا بازنویسی کاندیدهای نامرتبط نکن. اگر Pull روی محیط فعلی امن نیست، مسیر ایزولهٔ کم‌دردسر مانند Worktree تمیز بده؛ برای Detached HEAD دستور Pull عادی صادر نکن.
- اگر به دلیل فنی واقعی، تغییر مستقیم در GitHub امن یا ممکن نیست، دلیل را روشن بگو و فقط همان‌وقت با توضیح و تأیید لازم روش جایگزین را انتخاب کن. بستهٔ Runner فقط **fallback استثنایی** است.
- Pull کد مساوی انتشار VPS نیست؛ انتشار فقط پس از مجوز جداگانه با اسکریپت رسمی پروژه، کنترل نسخهٔ فعال/قبلی و Smoke انجام شود. هیچ رمز API یا دادهٔ خصوصی وارد GitHub نشود.
- این سیاست بر تمام رودمپ‌ها و عامل‌های آینده حاکم است، بدون اینکه ترتیب مراحل فعال، تأیید طراحی هر صفحه یا گیت‌های امنیت/پرداخت را دور بزند.
