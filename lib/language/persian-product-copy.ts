import type { PersianCopyEntry } from "@/types/language";

export const PERSIAN_PRODUCT_COPY: PersianCopyEntry[] = [
  {
    key: "product.reportOutputV2.title",
    value: "گزارش بخش‌بندی‌شده",
    description: "عنوان بخش خروجی جدید گزارش.",
  },
  {
    key: "product.reportOutputV2.description",
    value:
      "این نسخه خروجی را به بخش‌های روشن تقسیم می‌کند تا گزارش قابل خواندن‌تر، قابل نگهداری‌تر و آماده اتصال به موتور واقعی چارت باشد.",
    description: "توضیح کاربرپسند برای خروجی V2.",
  },
  {
    key: "action.downloadV2Txt",
    value: "دانلود TXT نسخه V2",
    description: "دکمه دانلود خروجی متنی گزارش.",
  },
  {
    key: "action.copyV2Text",
    value: "کپی متن V2",
    description: "دکمه کپی خروجی گزارش.",
  },
  {
    key: "status.symbolicSafety",
    value:
      "این گزارش نمادین و تأملی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی نیست.",
    description: "یادآوری ایمنی برای گزارش‌ها.",
  },
  {
    key: "navigation.language",
    value: "زبان محصول",
    description: "لینک صفحه زبان و فارسی‌سازی.",
  },
];

export function getPersianCopy(key: string, fallback = key) {
  return PERSIAN_PRODUCT_COPY.find((entry) => entry.key === key)?.value ?? fallback;
}

export function getPersianCopyRegistry() {
  return PERSIAN_PRODUCT_COPY;
}
