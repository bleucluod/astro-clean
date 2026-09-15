"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserAuthClient } from "@/lib/auth/supabase-browser-client";
import { parseJalaliDateInput } from "@/lib/date/jalali";
import {
  filterHalleusCities,
  findHalleusCityById,
  getHalleusCityDisplayName,
} from "@/lib/locations/cities";
import type { AccountProfileSnapshot } from "@/types/account-profile";

import styles from "@/app/profile/profile-page.module.css";

function formatJalaliInput(value: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(new Date(`${value}T12:00:00.000Z`));
  } catch {
    return "";
  }
}

export function AccountProfileEditor() {
  const [profile, setProfile] = useState<AccountProfileSnapshot | null>(null);
  const [birthDateJalali, setBirthDateJalali] = useState("");
  const [residenceQuery, setResidenceQuery] = useState("");
  const [residenceCityId, setResidenceCityId] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const suggestions = useMemo(() => {
    if (residenceCityId || residenceQuery.trim().length < 2) return [];
    return filterHalleusCities(residenceQuery).slice(0, 8);
  }, [residenceCityId, residenceQuery]);

  async function accessToken() {
    const client = getSupabaseBrowserAuthClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadProfile() {
    const token = await accessToken();
    setAuthReady(Boolean(token));
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch("/api/account/profile", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        profile?: AccountProfileSnapshot | null;
        error?: string;
      };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "پروفایل دریافت نشد.");
      const next = payload.profile ?? null;
      setProfile(next);
      setBirthDateJalali(formatJalaliInput(next?.birthDate ?? null));
      setResidenceCityId(next?.residenceCityId ?? "");
      if (next?.residenceCityId) {
        const city = findHalleusCityById(next.residenceCityId);
        setResidenceQuery(city ? getHalleusCityDisplayName(city) : [next.residenceCity, next.residenceCountry].filter(Boolean).join("، "));
      } else {
        setResidenceQuery([next?.residenceCity, next?.residenceCountry].filter(Boolean).join("، "));
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "پروفایل دریافت نشد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timer);
    // The editor intentionally reloads from the authenticated account once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const token = await accessToken();
    if (!token) {
      setAuthReady(false);
      setError("برای ویرایش پروفایل اول وارد حساب شو.");
      return;
    }

    const body: { birthDate?: string; residenceCityId?: string } = {};
    if (birthDateJalali.trim()) {
      const parsed = parseJalaliDateInput(birthDateJalali);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      body.birthDate = parsed.gregorianIso;
    }
    if (residenceCityId) body.residenceCityId = residenceCityId;
    if (!body.birthDate && !body.residenceCityId) {
      setError("تاریخ تولد یا شهر محل سکونت را وارد کن.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        profile?: AccountProfileSnapshot;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.profile) {
        throw new Error(payload.error ?? "ذخیرهٔ پروفایل کامل نشد.");
      }
      setProfile(payload.profile);
      setBirthDateJalali(formatJalaliInput(payload.profile.birthDate));
      setMessage("اطلاعات پروفایل ذخیره شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیرهٔ پروفایل کامل نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.accountProfileEditor} aria-labelledby="account-profile-editor-title">
      <div className={styles.sectionIntro}>
        <span className={styles.eyebrow}>اطلاعات من</span>
        <h2 id="account-profile-editor-title">تاریخ تولد و محل سکونت</h2>
        <p>
          اولین تاریخ تولدی که در حساب ثبت می‌کنی، اگر این فیلد خالی باشد به‌عنوان مقدار اولیه نگه داشته می‌شود؛ هر زمان خواستی می‌توانی اینجا اصلاحش کنی. تغییر پروفایل گزارش‌های قبلی را عوض نمی‌کند.
        </p>
      </div>

      {!authReady ? (
        <p className={styles.profileEditorHint}>برای دیدن و ویرایش این اطلاعات وارد حساب هالیوس شو.</p>
      ) : (
        <div className={styles.profileEditorGrid}>
          <label>
            <span>تاریخ تولد (شمسی)</span>
            <input
              value={birthDateJalali}
              onChange={(event) => setBirthDateJalali(event.target.value)}
              placeholder="مثلاً ۱۳۷۸/۰۵/۲۱"
              inputMode="numeric"
            />
          </label>

          <label className={styles.profileCityField}>
            <span>شهر محل سکونت</span>
            <input
              value={residenceQuery}
              onChange={(event) => {
                setResidenceQuery(event.target.value);
                setResidenceCityId("");
              }}
              placeholder="مثلاً تهران، تورنتو یا برلین"
              autoComplete="off"
            />
            {suggestions.length ? (
              <div className={styles.profileCitySuggestions} role="listbox" aria-label="شهرهای پیشنهادی">
                {suggestions.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      setResidenceCityId(city.id);
                      setResidenceQuery(getHalleusCityDisplayName(city));
                    }}
                  >
                    <strong>{city.faName}</strong>
                    <small>{city.countryCode === "IR" ? city.regionFaName : `${city.regionFaName}، ${city.countryFaName}`}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>
      )}

      {authReady ? (
        <div className={styles.profileEditorActions}>
          <button type="button" onClick={() => void save()} disabled={loading}>
            {loading ? "در حال ذخیره…" : "ذخیره اطلاعات"}
          </button>
          {profile?.profileUpdatedAt ? <small>اطلاعات حساب قابل ویرایش است و از گزارش‌های قبلی جدا نگه داشته می‌شود.</small> : null}
        </div>
      ) : null}
      {message ? <p className={styles.profileEditorSuccess}>{message}</p> : null}
      {error ? <p className={styles.profileEditorError}>{error}</p> : null}
    </section>
  );
}