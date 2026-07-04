"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import {
  createLocalDataBackup,
  restoreLocalDataBackup,
} from "@/lib/storage/local-data-backup";

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
  window.dispatchEvent(new Event("halleus-data-changed"));
}

function downloadJsonFile(data: unknown) {
  const fileName = `halleus-local-backup-${new Date()
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
    setMessage("فایل بکاپ JSON ساخته شد. این فایل را قبل از migration واقعی نگه دار.");
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
      <span className="badge">Backup before migration</span>

      <h2>خروجی امن داده‌های local-preview</h2>

      <p>
        قبل از هر migration واقعی به account، باید از گزارش‌های local-preview
        خروجی JSON داشته باشی. وارد کردن بکاپ هنوز فقط برای بازیابی local است و
        account import واقعی را اجرا نمی‌کند.
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
          وارد کردن بکاپ local
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
        جایگزین می‌کند. این کار migration به account نیست.
      </p>

      {message ? <p className="success-message">{message}</p> : null}
    </section>
  );
}
