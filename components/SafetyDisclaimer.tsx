type SafetyDisclaimerProps = {
  compact?: boolean;
};

export function SafetyDisclaimer({ compact = false }: SafetyDisclaimerProps) {
  return (
    <section className={compact ? "notice safety-disclaimer compact" : "notice safety-disclaimer"}>
      <strong>یادآوری آرام:</strong>{" "}
      هالیوس زبان نمادین آسمان را برای خودشناسی و تأمل روایت می‌کند؛ این خوانش‌ها
      حکم قطعی یا جایگزین مشورت تخصصی در تصمیم‌های پزشکی، مالی، حقوقی یا زندگی
      نیستند.
    </section>
  );
}
