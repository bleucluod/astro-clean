export default function ReportsPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">گزارش‌های ذخیره‌شده</span>

        <h1>گزارش‌های شخصی تو</h1>

        <p>
          این صفحه بعداً گزارش‌هایی را نشان می‌دهد که کاربر از چارت تولد یا
          تحلیل‌های روزانه، هفتگی و ماهانه ذخیره کرده است.
        </p>

        <p>
          در MVP، گزارش‌ها را فعلاً در localStorage مرورگر نگه می‌داریم تا بدون
          دیتابیس و backend هم تجربه محصول قابل دیدن باشد.
        </p>
      </div>
    </section>
  );
}
