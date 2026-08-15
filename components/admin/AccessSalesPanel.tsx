"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminUserSummary } from "@/lib/admin/admin-types";
import {
  DEFAULT_REPORT_ACCESS_POLICY,
  REPORT_ACCESS_PLANET_IDS,
  type ReportAccessPolicy,
} from "@/lib/monetization/access-policy";
import type { HalleusProductPackage } from "@/lib/monetization/product-catalog";
import type { AccountProductAccess } from "@/lib/monetization/product-access-contract";
import styles from "./admin-console.module.css";

type HistoryItem = {
  id: string;
  creditType: string;
  delta: number;
  balanceAfter: number;
  source: string;
  packageCode: string | null;
  reason: string;
  createdAt: string;
};

// HALLEUS_ACCESS_MODE_ADMIN_STATE_BATCH1_R1
type AccessControlState = {
  effectiveMode: "FREE_ALL" | "CONFIGURED";
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  storage: "database" | "fail_safe";
  reportTypes: Array<{
    id: string;
    label: string;
    configuredBehavior: string;
  }>;
};

type Payload = {
  ok?: boolean;
  error?: string;
  policy?: ReportAccessPolicy;
  accessControl?: AccessControlState;
  packages?: HalleusProductPackage[];
  users?: AdminUserSummary[];
  access?: AccountProductAccess | null;
  history?: HistoryItem[];
};

const planetLabels: Record<string, string> = {
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// HALLEUS_ACCESS_SALES_ADMIN_PANEL_R1
export function AccessSalesPanel({ accessToken }: { accessToken: string }) {
  const [policy, setPolicy] = useState<ReportAccessPolicy>(
    DEFAULT_REPORT_ACCESS_POLICY,
  );
  const [accessControl, setAccessControl] = useState<AccessControlState | null>(null);
  const [packages, setPackages] = useState<HalleusProductPackage[]>([]);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [userId, setUserId] = useState("");
  const [accountAccess, setAccountAccess] =
    useState<AccountProductAccess | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reason, setReason] = useState("");
  const [adjustType, setAdjustType] =
    useState<"full_report_credit" | "relationship_credit">(
      "full_report_credit",
    );
  const [adjustDelta, setAdjustDelta] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = useMemo(
    () => ({
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    }),
    [accessToken],
  );

  async function load(options?: { search?: string; userId?: string }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options?.search) params.set("search", options.search);
      if (options?.userId) params.set("userId", options.userId);
      const response = await fetch(
        `/api/admin/monetization${params.size ? `?${params.toString()}` : ""}`,
        {
          cache: "no-store",
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "دسترسی و فروش دریافت نشد.");
      }
      if (payload.policy) setPolicy(payload.policy);
      if (payload.accessControl) setAccessControl(payload.accessControl);
      if (payload.packages) setPackages(payload.packages);
      setUsers(payload.users ?? []);
      setAccountAccess(payload.access ?? null);
      setHistory(payload.history ?? []);
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "دریافت اطلاعات انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [accessToken]);

  async function mutate(body: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/monetization", {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "ذخیره انجام نشد.");
      }
      setMessage("ذخیره شد.");
      await load({ userId: userId || undefined });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "ذخیره انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.accessSalesWorkspace}>
      <section className={styles.accessSalesHero}>
        <span className={styles.eyebrow}>دسترسی و فروش</span>
        <h3>رایگان، اعتبارها و بسته‌ها</h3>
        <p>
          موتور گزارش و داده نجومی اینجا تغییر نمی‌کنند؛ فقط سیاست نمایش و اعتبار حساب مدیریت می‌شود.
        </p>
      </section>

      {error ? <p className={styles.inlineError}>{error}</p> : null}
      {message ? <p className={styles.inlineSuccess}>{message}</p> : null}

      <section className={styles.accessPreview} data-access-mode-admin="batch1-r1">
        <strong>حالت مؤثر دسترسی گزارش‌ها</strong>
        <label>
          حالت اجرا
          <select
            value={policy.monetizationMode}
            onChange={(event) =>
              setPolicy({
                ...policy,
                monetizationMode: event.target.value as ReportAccessPolicy["monetizationMode"],
              })
            }
          >
            <option value="FREE_ALL">FREE_ALL — همهٔ گزارش‌ها بدون مصرف اعتبار</option>
            <option value="CONFIGURED">CONFIGURED — قوانین اعتبار فعلی</option>
          </select>
        </label>
        <p>
          پیش‌نمایش قبل از ذخیره: {policy.monetizationMode === "FREE_ALL"
            ? "گزارش کامل و تحلیل رابطه بدون خرید و بدون مصرف اعتبار اجرا می‌شوند؛ موجودی و تاریخچه دست‌نخورده می‌مانند."
            : "قوانین فعلی بسته‌ها، اعتبار گزارش کامل و اعتبار تحلیل رابطه دوباره اعمال می‌شوند."}
        </p>
        <p>
          نسخه تنظیمات: {(accessControl?.version ?? policy.version).toLocaleString("fa-IR")}
          {accessControl?.updatedAt ? " · آخرین تغییر: " + formatDate(accessControl.updatedAt) : ""}
          {" · تغییر دهنده: " + (accessControl?.updatedBy ?? "سیستم")}
        </p>
        {accessControl?.storage === "fail_safe" ? (
          <p className={styles.inlineError}>منبع تنظیمات در دسترس نیست؛ حالت ایمن CONFIGURED نمایش داده می‌شود.</p>
        ) : null}
        <div>
          {(accessControl?.reportTypes ?? []).map((reportType) => (
            <p key={reportType.id}>
              <strong>{reportType.label}</strong> — {reportType.configuredBehavior}
            </p>
          ))}
        </div>
      </section>

      <details className={styles.adminDisclosure} open>
        <summary>چه چیزهایی در گزارش رایگان دیده می‌شوند؟</summary>
        <div className={styles.accessPolicyGrid}>
          {[
            ["topStoriesFreeCount", "داستان‌های اصلی رایگان", 12],
            ["importantHousesFreeCount", "خانه‌های مهم رایگان", 12],
            ["importantAspectsFreeCount", "جنبه‌های مهم رایگان", 12],
            ["weeklyActionsFreeCount", "اقدام‌های هفتگی رایگان", 6],
          ].map(([key, label, max]) => (
            <label key={String(key)}>
              {String(label)}
              <input
                type="number"
                min={0}
                max={Number(max)}
                value={policy[key as keyof ReportAccessPolicy] as number}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
          <label>
            محور رشد
            <select
              value={policy.nodeAxis}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  nodeAxis: event.target.value as ReportAccessPolicy["nodeAxis"],
                })
              }
            >
              <option value="hidden">مخفی</option>
              <option value="teaser">تیزر</option>
              <option value="free_full">کامل رایگان</option>
              <option value="premium">فقط کامل</option>
            </select>
          </label>
          <label>
            تعادل انرژی
            <select
              value={policy.energyBalance}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  energyBalance:
                    event.target.value as ReportAccessPolicy["energyBalance"],
                })
              }
            >
              <option value="hidden">مخفی</option>
              <option value="teaser">تیزر</option>
              <option value="free_full">کامل رایگان</option>
              <option value="premium">فقط کامل</option>
            </select>
          </label>
          {REPORT_ACCESS_PLANET_IDS.map((planetId) => (
            <label key={planetId}>
              {planetLabels[planetId]}
              <select
                value={policy.planetChapters[planetId]}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    planetChapters: {
                      ...policy.planetChapters,
                      [planetId]: event.target.value as
                        | "free"
                        | "teaser"
                        | "premium",
                    },
                  })
                }
              >
                <option value="free">رایگان</option>
                <option value="teaser">خلاصه</option>
                <option value="premium">فقط کامل</option>
              </select>
            </label>
          ))}
          <label>
            شواهد
            <select
              value={policy.evidence}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  evidence: event.target.value as ReportAccessPolicy["evidence"],
                })
              }
            >
              <option value="compact_free">خلاصه رایگان</option>
              <option value="full_free">کامل رایگان</option>
              <option value="premium_full">کامل فقط نسخه Full</option>
            </select>
          </label>
          <label>
            جزئیات فنی
            <select
              value={policy.technical.appendix}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  technical: {
                    ...policy.technical,
                    appendix: event.target.value as "free" | "premium",
                  },
                })
              }
            >
              <option value="free">رایگان</option>
              <option value="premium">فقط کامل</option>
            </select>
          </label>
        </div>

        <div className={styles.accessCopyOverrides}>
          <label>
            تیتر کارت ارتقا
            <input
              value={policy.upgradeTitle ?? ""}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  upgradeTitle: event.target.value || null,
                })
              }
              placeholder="خالی = متن خودکار"
            />
          </label>
          <label>
            متن دکمه
            <input
              value={policy.upgradeCtaLabel ?? ""}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  upgradeCtaLabel: event.target.value || null,
                })
              }
              placeholder="خالی = متن خودکار"
            />
          </label>
          <label>
            جمله پشتیبان
            <textarea
              rows={3}
              value={policy.upgradeSupportSentence ?? ""}
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  upgradeSupportSentence: event.target.value || null,
                })
              }
            />
          </label>
        </div>

        <div className={styles.accessPreview}>
          <strong>پیش‌نمایش Free</strong>
          <p>
            {policy.topStoriesFreeCount.toLocaleString("fa-IR")} داستان،
            {" "}
            {policy.importantHousesFreeCount.toLocaleString("fa-IR")} خانه،
            {" "}
            {policy.importantAspectsFreeCount.toLocaleString("fa-IR")} جنبه و
            {" "}
            {policy.weeklyActionsFreeCount.toLocaleString("fa-IR")} اقدام.
          </p>
          <strong>{policy.upgradeTitle ?? "ادامهٔ همین گزارش کامل"}</strong>
          <p>کارت ارتقا فقط آیتم‌هایی را می‌گوید که واقعاً قفل‌اند.</p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void mutate({ action: "save_policy", policy })}
        >
          ذخیره حالت و سیاست گزارش
        </button>
      </details>

      <details className={styles.adminDisclosure}>
        <summary>بسته‌ها و قیمت‌ها</summary>
        <div className={styles.packageAdminGrid}>
          {packages.map((item) => (
            <article key={item.code}>
              <strong>{item.code}</strong>
              <label>
                نام
                <input
                  value={item.name}
                  onChange={(event) =>
                    setPackages((current) =>
                      current.map((candidate) =>
                        candidate.code === item.code
                          ? { ...candidate, name: event.target.value }
                          : candidate,
                      ),
                    )
                  }
                />
              </label>
              <label>
                فعال
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(event) =>
                    setPackages((current) =>
                      current.map((candidate) =>
                        candidate.code === item.code
                          ? { ...candidate, active: event.target.checked }
                          : candidate,
                      ),
                    )
                  }
                />
              </label>
              <label>
                قیمت (تومان)
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={Math.round(item.priceMinor / 10)}
                  onChange={(event) =>
                    setPackages((current) =>
                      current.map((candidate) =>
                        candidate.code === item.code
                          ? {
                              ...candidate,
                              priceMinor:
                                Math.max(0, Number(event.target.value)) * 10,
                            }
                          : candidate,
                      ),
                    )
                  }
                />
              </label>
              <label>
                اعتبار گزارش
                <input
                  type="number"
                  min={0}
                  value={item.fullReportCredits}
                  onChange={(event) =>
                    setPackages((current) =>
                      current.map((candidate) =>
                        candidate.code === item.code
                          ? {
                              ...candidate,
                              fullReportCredits: Number(event.target.value),
                            }
                          : candidate,
                      ),
                    )
                  }
                />
              </label>
              <label>
                اعتبار رابطه
                <input
                  type="number"
                  min={0}
                  value={item.relationshipCredits}
                  onChange={(event) =>
                    setPackages((current) =>
                      current.map((candidate) =>
                        candidate.code === item.code
                          ? {
                              ...candidate,
                              relationshipCredits: Number(event.target.value),
                            }
                          : candidate,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void mutate({ action: "save_package", package: item })
                }
              >
                ذخیره این بسته
              </button>
            </article>
          ))}
        </div>
      </details>

      <details className={styles.adminDisclosure}>
        <summary>اعتبار حساب‌ها</summary>
        <div className={styles.creditSearchRow}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ایمیل، نام یا شناسه حساب"
          />
          <button
            type="button"
            disabled={loading || !search.trim()}
            onClick={() => void load({ search: search.trim() })}
          >
            جست‌وجو
          </button>
        </div>

        <div className={styles.creditUserList}>
          {users.map((user) => (
            <button
              type="button"
              key={user.id}
              data-active={user.id === userId}
              onClick={() => {
                setUserId(user.id);
                void load({ userId: user.id });
              }}
            >
              <strong>{user.displayName || user.email || user.id}</strong>
              <small>{user.email ?? user.id}</small>
            </button>
          ))}
        </div>

        {userId && accountAccess ? (
          <div className={styles.creditAccountPanel}>
            <div className={styles.creditBalanceGrid}>
              <div>
                <span>گزارش کامل</span>
                <strong>
                  {accountAccess.balances.fullReport.toLocaleString("fa-IR")}
                </strong>
              </div>
              <div>
                <span>تحلیل رابطه</span>
                <strong>
                  {accountAccess.balances.relationship.toLocaleString("fa-IR")}
                </strong>
              </div>
            </div>

            <label>
              دلیل عملیات
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="برای grant یا adjustment الزامی است"
              />
            </label>

            <div className={styles.packageGrantActions}>
              {packages.filter((item) => item.active).map((item) => (
                <button
                  type="button"
                  key={item.code}
                  disabled={loading || !reason.trim()}
                  onClick={() =>
                    void mutate({
                      action: "grant_package",
                      userId,
                      packageCode: item.code,
                      reason: reason.trim(),
                    })
                  }
                >
                  + {item.name}
                </button>
              ))}
            </div>

            <div className={styles.creditAdjustment}>
              <select
                value={adjustType}
                onChange={(event) =>
                  setAdjustType(
                    event.target.value as
                      | "full_report_credit"
                      | "relationship_credit",
                  )
                }
              >
                <option value="full_report_credit">گزارش کامل</option>
                <option value="relationship_credit">تحلیل رابطه</option>
              </select>
              <input
                type="number"
                value={adjustDelta}
                onChange={(event) =>
                  setAdjustDelta(Number(event.target.value))
                }
              />
              <button
                type="button"
                disabled={loading || !reason.trim() || !adjustDelta}
                onClick={() =>
                  void mutate({
                    action: "adjust_credit",
                    userId,
                    creditType: adjustType,
                    delta: adjustDelta,
                    reason: reason.trim(),
                  })
                }
              >
                اعمال تغییر اعتبار
              </button>
            </div>

            <div className={styles.creditHistory}>
              {history.map((item) => (
                <article key={item.id}>
                  <strong>
                    {item.delta > 0 ? "+" : ""}
                    {item.delta.toLocaleString("fa-IR")}
                  </strong>
                  <span>{item.creditType}</span>
                  <span>{item.source}</span>
                  <small>{item.reason}</small>
                  <time>{formatDate(item.createdAt)}</time>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </details>
    </div>
  );
}
