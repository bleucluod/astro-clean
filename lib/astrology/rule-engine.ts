import type { MockChart } from "@/types/astro";

export function createInterpretations(chart: MockChart): string[] {
  return [
    `خورشید در ${chart.sunSign.faName} می‌تواند نمادی از شیوه ابراز هویت، انگیزه و انرژی اصلی تو باشد.`,
    `ماه در ${chart.moonSign.faName} می‌تواند به دنیای احساسی، نیازهای درونی و واکنش‌های ناخودآگاه تو اشاره کند.`,
    `رایزینگ ${chart.risingSign.faName} می‌تواند تصویری از نحوه شروع ارتباط با جهان و برداشت اولیه دیگران از تو باشد.`,
    `ترکیب عنصرهای ${chart.sunSign.element}، ${chart.moonSign.element} و ${chart.risingSign.element} یک الگوی نمادین اولیه برای تأمل شخصی می‌سازد.`,
  ];
}

export function createSummary(chart: MockChart): string {
  return `در این چارت mock، خورشید تو در ${chart.sunSign.faName}، ماه تو در ${chart.moonSign.faName} و رایزینگ تو ${chart.risingSign.faName} است. این ترکیب فعلاً محاسبه واقعی نجومی نیست و فقط برای ساخت تجربه MVP استفاده می‌شود.`;
}
