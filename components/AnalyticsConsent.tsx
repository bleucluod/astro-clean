"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  analyticsConfig,
  isAnalyticsPublicPath,
  type AnalyticsConsentChoice,
} from "@/lib/config/analytics";

import styles from "./analytics-consent.module.css";

const OPEN_ANALYTICS_SETTINGS_EVENT = "halleus:open-analytics-settings";
const GA_DISABLE_KEY = `ga-disable-${analyticsConfig.measurementId}`;

type StoredAnalyticsConsent = {
  choice: AnalyticsConsentChoice;
  version: number;
};

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function getAnalyticsWindow(): AnalyticsWindow {
  return window as AnalyticsWindow;
}

function setAnalyticsDisabled(disabled: boolean): void {
  const analyticsWindow = getAnalyticsWindow();
  (analyticsWindow as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = disabled;
}

function ensureGoogleAnalyticsLoaded(): void {
  const analyticsWindow = getAnalyticsWindow();

  if (!analyticsWindow.gtag) {
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };

    analyticsWindow.gtag("consent", "default", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "granted",
    });
    analyticsWindow.gtag("js", new Date());
    analyticsWindow.gtag("config", analyticsConfig.measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
    });
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-halleus-analytics="${analyticsConfig.measurementId}"]`,
  );

  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.dataset.halleusAnalytics = analyticsConfig.measurementId;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.measurementId}`;
  document.head.appendChild(script);
}

function sendPublicPageView(pathname: string): void {
  const analyticsWindow = getAnalyticsWindow();
  const pageLocation = `${window.location.origin}${pathname}`;

  analyticsWindow.gtag?.("event", "page_view", {
    page_location: pageLocation,
    page_path: pathname,
    page_title: document.title,
  });
}

function deleteAnalyticsCookies(): void {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => name.startsWith("_ga"));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.halleus.ir; SameSite=Lax`;
  }
}

function readStoredChoice(): AnalyticsConsentChoice | null {
  try {
    const rawValue = window.localStorage.getItem(analyticsConfig.consentStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredAnalyticsConsent>;
    if (
      parsed.version !== analyticsConfig.consentVersion ||
      (parsed.choice !== "granted" && parsed.choice !== "denied")
    ) {
      return null;
    }

    return parsed.choice;
  } catch {
    return null;
  }
}

function storeChoice(choice: AnalyticsConsentChoice): void {
  const storedValue: StoredAnalyticsConsent = {
    choice,
    version: analyticsConfig.consentVersion,
  };

  try {
    window.localStorage.setItem(
      analyticsConfig.consentStorageKey,
      JSON.stringify(storedValue),
    );
  } catch {
    // The current in-memory choice still applies when storage is unavailable.
  }
}

function revokeAnalytics(): void {
  setAnalyticsDisabled(true);
  getAnalyticsWindow().gtag?.("consent", "update", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
  });
  deleteAnalyticsCookies();
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    setChoice(readStoredChoice());
    setIsReady(true);

    const openSettings = () => setIsSettingsOpen(true);
    window.addEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings);

    return () => {
      window.removeEventListener(OPEN_ANALYTICS_SETTINGS_EVENT, openSettings);
    };
  }, []);

  useEffect(() => {
    if (!isReady || choice !== "granted") {
      if (isReady && choice === "denied") {
        revokeAnalytics();
      }
      return;
    }

    if (!isAnalyticsPublicPath(pathname)) {
      setAnalyticsDisabled(true);
      return;
    }

    setAnalyticsDisabled(false);
    ensureGoogleAnalyticsLoaded();
    getAnalyticsWindow().gtag?.("consent", "update", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "granted",
    });

    if (lastTrackedPath.current !== pathname) {
      sendPublicPageView(pathname);
      lastTrackedPath.current = pathname;
    }
  }, [choice, isReady, pathname]);

  const choose = (nextChoice: AnalyticsConsentChoice) => {
    storeChoice(nextChoice);
    setChoice(nextChoice);
    setIsSettingsOpen(false);
    lastTrackedPath.current = null;

    if (nextChoice === "denied") {
      revokeAnalytics();
    }
  };

  if (!isReady || (choice !== null && !isSettingsOpen)) {
    return null;
  }

  return (
    <section
      aria-label="انتخاب آمار بازدید"
      aria-live="polite"
      className={styles.banner}
    >
      <div className={styles.copy}>
        <strong>کمک می‌کنی هالیوس را بهتر بفهمیم؟</strong>
        <p>
          فقط با اجازهٔ تو، بازدید صفحه‌های عمومی و اطلاعات فنی پایهٔ مرورگر
          را به‌صورت آماری می‌سنجیم. دادهٔ تولد، محتوای گزارش، نام، شماره،
          ایمیل و شناسهٔ گزارش ارسال نمی‌شود.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.allowButton} onClick={() => choose("granted")} type="button">
          اجازه می‌دهم
        </button>
        <button className={styles.denyButton} onClick={() => choose("denied")} type="button">
          فعلاً نه
        </button>
      </div>
    </section>
  );
}

export function AnalyticsPreferencesLink({
  className,
  label = "تنظیم آمار بازدید",
}: {
  className?: string;
  label?: string;
}) {
  const openSettings = () => {
    window.dispatchEvent(new Event(OPEN_ANALYTICS_SETTINGS_EVENT));
  };

  return (
    <button
      className={[styles.preferenceButton, className].filter(Boolean).join(" ")}
      onClick={openSettings}
      type="button"
    >
      {label}
    </button>
  );
}
