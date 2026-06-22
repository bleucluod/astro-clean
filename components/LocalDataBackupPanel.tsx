"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import {
  createLocalDataBackup,
  restoreLocalDataBackup,
} from "@/lib/storage/local-data-backup";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function downloadJsonFile(data: unknown) {
  const fileName = `astro-clean-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function LocalDataBackupPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");

  function handleExport() {
    const backup = createLocalDataBackup();
    downloadJsonFile(backup);
    setMessage("فایل بکاپ JSON ساخته شد.");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsedBackup: unknown = JSON.parse(text);
      const result = restoreLocalDataBackup(parsedBackup);

      setMessage(result.message);

      if (result.ok) {
        notifyLocalDataChanged();
      }
    } catch {
      setMessage("خواندن فایل بکاپ ناموفق بود. لطفاً یک فایل JSON معتبر انتخاب کن.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="card">
      <span className="badge">Local Backup</span>

      <h2>خروجی و ورودی داده‌های محلی</h2>

      <p>
        چون این MVP هنوز backend و دیتابیس ندارد، گزارش‌ها و پروفایل فقط در
        مرورگر ذخیره می‌شوند. از این بخش می‌توانی یک بکاپ JSON بگیری یا بکاپ
        قبلی را دوباره وارد کنی.
      </p>

      <div className="actions">
        <button className="button" type="button" onClick={handleExport}>
          گرفتن خروجی JSON
        </button>

        <button
          className="button secondary"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          وارد کردن بکاپ
        </button>
      </div>

      <input
        ref={inputRef}
        className="hidden-file-input"
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
      />

      <p className="file-hint">
        وارد کردن بکاپ، گزارش‌ها و پروفایل فعلی localStorage را با محتوای فایل
        جایگزین می‌کند.
      </p>

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
