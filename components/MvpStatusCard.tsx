export function MvpStatusCard() {
  return (
    <section className="card">
      <span className="badge">MVP Status</span>

      <h2>وضعیت نسخه فعلی</h2>

      <div className="status-grid">
        <div className="mini-card">
          <strong>Frontend MVP</strong>
          <span>Stable</span>
        </div>

        <div className="mini-card">
          <strong>Lint</strong>
          <span>Passed</span>
        </div>

        <div className="mini-card">
          <strong>Build</strong>
          <span>Passed</span>
        </div>

        <div className="mini-card">
          <strong>Backend</strong>
          <span>Not included</span>
        </div>
      </div>

      <p>
        این نسخه برای دمو و ادامه polish آماده است. هنوز دیتابیس، ورود کاربر،
        backend واقعی یا محاسبات واقعی نجومی ندارد.
      </p>
    </section>
  );
}
