import {
  getMvpHardeningGroups,
  getMvpHardeningStats,
  MVP_HARDENING_CHECKPOINT_VERSION,
  type MvpHardeningStatus,
} from "../../../src/lib/product/mvp-hardening-checkpoint";

export default function MvpHardeningCheckpointPage() {
  const groups = getMvpHardeningGroups();
  const stats = getMvpHardeningStats();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="rounded-3xl bg-[#3E2F25] p-6 text-[#FFF9F2]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D9B58C]">
          MVP hardening checkpoint
        </p>
        <h1 className="mt-3 text-3xl font-bold">چک‌پوینت آمادگی MVP</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[#F3E7D9]">
          این صفحه برای جمع‌بندی فاز report flow ساخته شده است. هدفش این است که
          قبل از ادامه‌ی توسعه، مسیرهای اصلی، safety language و تست‌های دستی MVP
          یک‌جا دیده شوند.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Pass" value={stats.pass} />
          <StatPill label="Manual" value={stats.manual} />
          <StatPill label="Watch" value={stats.watch} />
          <span className="rounded-full border border-[#D9B58C]/40 px-3 py-1 text-[#F3E7D9]">
            {MVP_HARDENING_CHECKPOINT_VERSION}
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {groups.map((group) => (
          <section
            key={group.id}
            className="rounded-3xl border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm"
          >
            <h2 className="text-2xl font-bold text-[#3E2F25]">{group.title}</h2>
            <p className="mt-2 text-sm leading-8 text-[#6B5A4C]">
              {group.description}
            </p>

            <div className="mt-5 space-y-3">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#ECDCCB] bg-white p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-bold text-[#4A382C]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#6B5A4C]">
                        {item.reason}
                      </p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-3 rounded-2xl bg-[#FFF9F2] p-3 text-sm leading-7 text-[#7A695A]">
                    Manual check: {item.manualCheck}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-[#D9B58C]/40 px-3 py-1 text-[#F3E7D9]">
      {label}: {value}
    </span>
  );
}

function StatusPill({ status }: { status: MvpHardeningStatus }) {
  const label =
    status === "pass" ? "Passed" : status === "manual" ? "Manual QA" : "Watch";

  return (
    <span className="rounded-full border border-[#D8C2AA] bg-[#FFF9F2] px-3 py-1 text-xs font-bold text-[#6A4B35]">
      {label}
    </span>
  );
}
