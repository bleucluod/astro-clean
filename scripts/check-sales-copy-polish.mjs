import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(path, text, label = text) {
  const content = read(path);

  if (!content.includes(text)) {
    throw new Error(`${path} is missing ${label}`);
  }
}

function assertNotIncludes(path, text, label = text) {
  const content = read(path);

  if (content.includes(text)) {
    throw new Error(`${path} still contains ${label}`);
  }
}

assertIncludes(
  "app/page.tsx",
  "گزارش تولد فارسی، آرام، خواندنی و قابل سفارش",
);
assertIncludes(
  "app/page.tsx",
  "از گزارش نمونه تا سفارش نسخه کامل‌تر",
);
assertIncludes(
  "app/page.tsx",
  "درخواست نسخه کامل‌تر با اطلاعات همین گزارش",
);
assertIncludes(
  "app/page.tsx",
  "گزارش تو یک نقطه شروع است",
);
assertIncludes(
  "app/page.tsx",
  "یک گزارش تولد برای خواندن، نگه داشتن و برگشتن به خودت",
);

assertNotIncludes("app/page.tsx", "Halleus Paid MVP Shell", "internal MVP badge");
assertNotIncludes("app/page.tsx", "Paid MVP", "internal paid MVP wording");
assertNotIncludes("app/page.tsx", "نسخه قابل تست فروش", "test-sales wording");
assertNotIncludes("app/page.tsx", "real engine", "engine wording");
assertNotIncludes(
  "app/page.tsx",
  "/chart → /reports/[reportId] → /order",
  "visible route pipeline",
);
assertNotIncludes(
  "app/page.tsx",
  "فروش دستی قبل از پرداخت آنلاین",
  "manual-payment staging copy",
);
assertNotIncludes(
  "app/page.tsx",
  "پرداخت آنلاین هنوز فعال نیست",
  "payment-disabled homepage copy",
);
assertNotIncludes("app/page.tsx", "payment provider", "payment provider wording");

assertIncludes(
  "app/product/page.tsx",
  "Halleus یک مسیر ساده از گزارش تولد تا سفارش نسخه کامل‌تر است",
);
assertIncludes("app/product/page.tsx", "شناسه همان گزارش");
assertIncludes("app/product/page.tsx", "Manual order flow");

assertIncludes(
  "app/pricing/page.tsx",
  "پلن‌ها برای کامل‌تر کردن گزارش تولد Halleus",
);
assertIncludes("app/pricing/page.tsx", "شناسه گزارش آماده می‌کند");
assertIncludes("app/pricing/page.tsx", "Manual order MVP");

assertIncludes(
  "app/order/page.tsx",
  "درخواست سفارش دستی نسخه کامل‌تر گزارش Halleus",
);
assertIncludes("app/order/page.tsx", "initialReportId");
assertIncludes("app/order/page.tsx", "searchParams");

assertIncludes(
  "components/ManualOrderRequestForm.tsx",
  "متن سفارش نسخه کامل‌تر را آماده کن",
);
assertIncludes("components/ManualOrderRequestForm.tsx", "initialReportId");
assertIncludes("components/ManualOrderRequestForm.tsx", "شناسه همان گزارش");

assertIncludes(
  "components/ReportOrderCta.tsx",
  "همین گزارش را مبنای نسخه کامل‌تر قرار بده",
);
assertIncludes("components/ReportOrderCta.tsx", "/order?reportId=");
assertIncludes("components/ReportOrderCta.tsx", "encodeURIComponent(reportId)");

assertIncludes(
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "v0.1.72-sales-copy-polish",
);

const packageJson = JSON.parse(read("package.json"));

if (
  packageJson.scripts?.["check:sales-copy-polish"] !==
  "node scripts/check-sales-copy-polish.mjs"
) {
  throw new Error("package.json is missing check:sales-copy-polish");
}

if (!packageJson.scripts?.["check:project"]?.includes("check:sales-copy-polish")) {
  throw new Error("check:project does not include check:sales-copy-polish");
}

assertNotIncludes("app/product/page.tsx", "این صفحه هنوز نقشه محصول را نگه می‌دارد", "old product map copy");

console.log("sales copy polish check passed");
