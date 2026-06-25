export const MVP_HARDENING_CHECKPOINT_VERSION = "0.1.53" as const;

export type MvpHardeningStatus = "pass" | "manual" | "watch";

export type MvpHardeningItem = {
  id: string;
  title: string;
  status: MvpHardeningStatus;
  reason: string;
  manualCheck: string;
};

export type MvpHardeningGroup = {
  id: string;
  title: string;
  description: string;
  items: MvpHardeningItem[];
};

export const MVP_HARDENING_GROUPS: MvpHardeningGroup[] = [
  {
    id: "routes",
    title: "Route sanity",
    description:
      "مسیرهای اصلی MVP باید قابل پیدا کردن، قابل build شدن و قابل تست دستی باشند.",
    items: [
      {
        id: "engine-home-links",
        title: "/engine مسیرهای MVP را نشان می‌دهد",
        status: "manual",
        reason:
          "navigation polish اضافه شده و باید بعد از deploy از صفحه‌ی engine دیده شود.",
        manualCheck: "Open /engine and click report flow, report preview, real engine, and reports.",
      },
      {
        id: "report-flow-route",
        title: "/engine/report-flow بالا می‌آید",
        status: "manual",
        reason:
          "این مسیر نزدیک‌ترین نسخه‌ی فعلی به محصول واقعی است: birth input به report-like output وصل می‌شود.",
        manualCheck: "Open /engine/report-flow, change input fields, click the preview button.",
      },
      {
        id: "report-preview-route",
        title: "/engine/report-preview بالا می‌آید",
        status: "manual",
        reason:
          "این مسیر pipeline را بدون input تعاملی نشان می‌دهد و برای debugging سریع مناسب است.",
        manualCheck: "Open /engine/report-preview and confirm bridge panel and Persian copy render.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety and expectation setting",
    description:
      "Halleus باید symbolic و reflective باقی بماند و از ادعای قطعیت یا توصیه‌ی حساس دوری کند.",
    items: [
      {
        id: "prototype-language",
        title: "prototype symbolic flow واضح است",
        status: "pass",
        reason:
          "UI و copy به کاربر می‌گویند این مرحله هنوز محاسبه‌ی نجومی نهایی نیست.",
        manualCheck: "Confirm /engine/report-flow contains prototype/symbolic language.",
      },
      {
        id: "no-sensitive-advice",
        title: "No medical/legal/financial advice",
        status: "pass",
        reason:
          "copy library و report copy صراحتاً می‌گویند گزارش جایگزین تصمیم پزشکی، حقوقی یا مالی نیست.",
        manualCheck: "Confirm the report copy includes the safety limitation block.",
      },
      {
        id: "non-deterministic-copy",
        title: "متن deterministic نیست",
        status: "watch",
        reason:
          "متن‌ها باید به‌جای حکم قطعی، از زبان نمادین، تأملی و قابل بررسی استفاده کنند.",
        manualCheck: "Read the generated copy and flag any sentence that sounds like certainty or prediction.",
      },
    ],
  },
  {
    id: "product-readiness",
    title: "Product readiness",
    description:
      "این فاز هنوز پرداخت/اکانت/دیتابیس production را فعال نمی‌کند، اما باید حس مسیر محصولی بدهد.",
    items: [
      {
        id: "report-copy-depth",
        title: "گزارش نمونه از data library تغذیه می‌شود",
        status: "pass",
        reason:
          "copy library برای نقاط، برج‌ها، خانه‌ها و aspectها به report copy وصل شده است.",
        manualCheck: "Open /engine/report-flow and confirm multiple Persian copy blocks are generated.",
      },
      {
        id: "old-report-fallback",
        title: "گزارش قدیمی crash نمی‌کند",
        status: "manual",
        reason:
          "bridge panel برای reportهایی که chart enrichment ندارند باید fallback امن نشان دهد.",
        manualCheck: "Open an older saved report detail and confirm the page does not crash.",
      },
      {
        id: "deploy-domain-smoke",
        title: "Smoke test روی دامنه اصلی",
        status: "manual",
        reason:
          "بعد از push و Render deploy باید مسیرهای اصلی را روی halleus.ir هم ببینی.",
        manualCheck:
          "After deploy, open /, /engine, /engine/report-flow, /engine/report-preview, and /reports.",
      },
    ],
  },
];

export function getMvpHardeningGroups(): MvpHardeningGroup[] {
  return MVP_HARDENING_GROUPS;
}

export function getMvpHardeningFlatItems(): MvpHardeningItem[] {
  return MVP_HARDENING_GROUPS.flatMap((group) => group.items);
}

export function getMvpHardeningStats() {
  const items = getMvpHardeningFlatItems();

  return {
    total: items.length,
    pass: items.filter((item) => item.status === "pass").length,
    manual: items.filter((item) => item.status === "manual").length,
    watch: items.filter((item) => item.status === "watch").length,
  };
}

export function getMvpHardeningManualChecklist(): string[] {
  return getMvpHardeningFlatItems().map((item) => item.manualCheck);
}
