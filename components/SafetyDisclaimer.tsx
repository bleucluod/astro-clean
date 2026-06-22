type SafetyDisclaimerProps = {
  compact?: boolean;
};

export function SafetyDisclaimer({ compact = false }: SafetyDisclaimerProps) {
  return (
    <section className={compact ? "notice safety-disclaimer compact" : "notice safety-disclaimer"}>
      <strong>یادآوری مهم:</strong>{" "}
      تحلیل‌های Astro Clean برای سرگرمی، خودشناسی و تفسیر نمادین هستند. این
      محصول پیش‌بینی قطعی یا توصیه پزشکی، مالی، حقوقی و تصمیم‌گیری جدی ارائه
      نمی‌کند.
    </section>
  );
}
