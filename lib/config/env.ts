import { HALLEUS_CONFIG } from "@/lib/config/halleus";

export type HalleusRuntimeEnv = {
  siteUrl: string;
  brandName: string;
  databaseUrl?: string;
  authSecret?: string;
  paymentProvider?: string;
};

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

export function getHalleusRuntimeEnv(): HalleusRuntimeEnv {
  return {
    siteUrl: getOptionalEnv("NEXT_PUBLIC_HALLEUS_SITE_URL") ?? HALLEUS_CONFIG.canonicalUrl,
    brandName: getOptionalEnv("NEXT_PUBLIC_HALLEUS_BRAND_NAME") ?? HALLEUS_CONFIG.brandName,
    databaseUrl: getOptionalEnv("DATABASE_URL"),
    authSecret: getOptionalEnv("AUTH_SECRET"),
    paymentProvider: getOptionalEnv("PAYMENT_PROVIDER"),
  };
}

export function hasDatabaseConfig() {
  return Boolean(getHalleusRuntimeEnv().databaseUrl);
}

export function hasAuthConfig() {
  return Boolean(getHalleusRuntimeEnv().authSecret);
}
