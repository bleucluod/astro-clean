"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listAccountReportSummaries } from "@/lib/storage/account-report-read-client";
import type { ReportRecordSummary } from "@/types/storage";

const PAGE_SIZE = 25;

export function AccountReportTitleList() {
  const [reports, setReports] = useState<ReportRecordSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("در حال خواندن گزارش‌ها…");

  useEffect(() => {
    let active = true;

    void listAccountReportSummaries(page).then((result) => {
      if (!active) return;
      setReports(result.summaries);
      setTotal(result.total);
      setMessage(
        result.summaries.length > 0
          ? ""
          : result.status === "not-authenticated"
            ? "برای دیدن گزارش‌ها وارد حساب خودت شو."
            : "هنوز گزارشی در این حساب نیست.",
      );
    });

    return () => {
      active = false;
    };
  }, [page]);

  if (message) {
    return <p className="card">{message}</p>;
  }

  return (
    <section className="card" aria-label="فهرست گزارش‌های حساب">
      <ul className="report-title-list">
        {reports.map((report) => (
          <li key={report.id}>
            <Link prefetch={false} href={`/reports/${report.id}?source=account`}>
              {report.title ?? "گزارش ذخیره‌شده"}
            </Link>
          </li>
        ))}
      </ul>

      {total > PAGE_SIZE ? (
        <nav className="actions" aria-label="صفحه‌بندی گزارش‌ها">
          <button
            className="button secondary"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            صفحهٔ قبل
          </button>
          <span>صفحهٔ {page.toLocaleString("fa-IR")}</span>
          <button
            className="button secondary"
            type="button"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage((current) => current + 1)}
          >
            صفحهٔ بعد
          </button>
        </nav>
      ) : null}
    </section>
  );
}
