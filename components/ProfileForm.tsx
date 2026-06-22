"use client";

import { useEffect, useState } from "react";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
} from "@/lib/storage/profile-storage";
import type { PrivacyMode, UserProfile } from "@/types/user";

export function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(loadProfile());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveProfile(profile);
    setMessage("پروفایل در مرورگر ذخیره شد.");
  }

  return (
    <section className="grid">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">پروفایل MVP</span>

          <h1>پروفایل ساده و قابل توسعه</h1>

          <p>
            فعلاً پروفایل فقط در مرورگر همین دستگاه ذخیره می‌شود. هنوز حساب
            کاربری، دیتابیس، ورود، خروج یا پروفایل عمومی واقعی نداریم.
          </p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>نام نمایشی</span>
            <input
              value={profile.displayName}
              onChange={(event) =>
                updateField("displayName", event.target.value)
              }
              placeholder="مثلاً آراز"
            />
          </label>

          <label className="field">
            <span>حالت حریم خصوصی</span>
            <select
              value={profile.privacyMode}
              onChange={(event) =>
                updateField("privacyMode", event.target.value as PrivacyMode)
              }
            >
              <option value="private">خصوصی</option>
              <option value="public">عمومی</option>
            </select>
          </label>

          <label className="field field-wide">
            <span>بیوگرافی کوتاه</span>
            <textarea
              value={profile.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder="چند جمله کوتاه درباره خودت..."
              rows={5}
            />
          </label>
        </div>

        <button className="button" type="submit">
          ذخیره پروفایل
        </button>

        {message ? <p className="success-message">{message}</p> : null}
      </form>

      <div className="card">
        <h2>پیش‌نمایش پروفایل</h2>

        <p>
          <strong>نام:</strong>{" "}
          {profile.displayName.trim() ? profile.displayName : "بدون نام"}
        </p>

        <p>
          <strong>حریم خصوصی:</strong>{" "}
          {profile.privacyMode === "private" ? "خصوصی" : "عمومی"}
        </p>

        <p>
          <strong>بیو:</strong>{" "}
          {profile.bio.trim()
            ? profile.bio
            : "هنوز بیوگرافی نوشته نشده است."}
        </p>
      </div>
    </section>
  );
}
