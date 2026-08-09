import { HALLEUS_CONFIG } from "@/lib/config/halleus";

export type HalleusRuntimeEnv = {
  siteUrl: string;
  brandName: string;
  databaseUrl?: string;
  authSecret?: string;
  paymentProvider?: string;
  betaPersistenceEnabled: boolean;
  betaPersistenceUserId?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseAuthStubEnabled: boolean;
  supabaseLoginEnabled: boolean;
  accountStorageEnabled: boolean;
  accountReportSaveEnabled: boolean;
  wikiPublisherSecret?: string;
  telegramBridgeUrl?: string;
  telegramBridgeSecret?: string;
  telegramPublisherSecret?: string;
  adminDirectUsername?: string;
  adminDirectPasswordHash?: string;
  adminDirectSessionSecret?: string;
  adminDirectUserId?: string;
  telegramBotUsername?: string;
  telegramChannelUrl?: string;
};

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function isEnabledEnv(name: string) {
  return getOptionalEnv(name)?.toLowerCase() === "true";
}

export function getHalleusRuntimeEnv(): HalleusRuntimeEnv {
  return {
    siteUrl: getOptionalEnv("NEXT_PUBLIC_HALLEUS_SITE_URL") ?? HALLEUS_CONFIG.canonicalUrl,
    brandName: getOptionalEnv("NEXT_PUBLIC_HALLEUS_BRAND_NAME") ?? HALLEUS_CONFIG.brandName,
    databaseUrl: getOptionalEnv("DATABASE_URL"),
    authSecret: getOptionalEnv("AUTH_SECRET"),
    paymentProvider: getOptionalEnv("PAYMENT_PROVIDER"),
    betaPersistenceEnabled: isEnabledEnv("HALLEUS_ENABLE_BETA_PERSISTENCE"),
    betaPersistenceUserId: getOptionalEnv("HALLEUS_BETA_PERSISTENCE_USER_ID"),
    supabaseUrl: getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseAuthStubEnabled: isEnabledEnv("HALLEUS_ENABLE_SUPABASE_AUTH_STUB"),
    supabaseLoginEnabled: isEnabledEnv("NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN"),
    accountStorageEnabled: isEnabledEnv("HALLEUS_ENABLE_ACCOUNT_STORAGE"),
    accountReportSaveEnabled: isEnabledEnv("NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE"),
    wikiPublisherSecret: getOptionalEnv("HALLEUS_WIKI_PUBLISHER_SECRET"),
    telegramBridgeUrl: getOptionalEnv("HALLEUS_TELEGRAM_BRIDGE_URL"),
    telegramBridgeSecret: getOptionalEnv("HALLEUS_TELEGRAM_BRIDGE_SECRET"),
    telegramPublisherSecret: getOptionalEnv("HALLEUS_TELEGRAM_PUBLISHER_SECRET"),
    adminDirectUsername: getOptionalEnv("HALLEUS_ADMIN_DIRECT_USERNAME"),
    adminDirectPasswordHash: getOptionalEnv("HALLEUS_ADMIN_DIRECT_PASSWORD_HASH"),
    adminDirectSessionSecret: getOptionalEnv("HALLEUS_ADMIN_DIRECT_SESSION_SECRET"),
    adminDirectUserId: getOptionalEnv("HALLEUS_ADMIN_DIRECT_USER_ID"),
    telegramBotUsername: getOptionalEnv("HALLEUS_TELEGRAM_BOT_USERNAME"),
    telegramChannelUrl: getOptionalEnv("HALLEUS_TELEGRAM_CHANNEL_URL"),
  };
}

export function hasDatabaseConfig() {
  return Boolean(getHalleusRuntimeEnv().databaseUrl);
}

export function hasAuthConfig() {
  return Boolean(getHalleusRuntimeEnv().authSecret);
}

export function hasSupabasePublicConfig() {
  const env = getHalleusRuntimeEnv();

  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasSupabaseServerConfig() {
  const env = getHalleusRuntimeEnv();

  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

export function canUseSupabaseAuthStub() {
  const env = getHalleusRuntimeEnv();

  return env.supabaseAuthStubEnabled && hasSupabasePublicConfig();
}

export function canUseRealSupabaseLogin() {
  const env = getHalleusRuntimeEnv();

  return env.supabaseLoginEnabled && hasSupabasePublicConfig();
}

export function canUseAccountStorage() {
  const env = getHalleusRuntimeEnv();

  return env.accountStorageEnabled && hasDatabaseConfig() && hasAuthConfig();
}

export function canUseAccountReportSavePath() {
  const env = getHalleusRuntimeEnv();

  return (
    env.accountReportSaveEnabled &&
    env.accountStorageEnabled &&
    canUseRealSupabaseLogin() &&
    hasDatabaseConfig() &&
    hasAuthConfig() &&
    hasSupabaseServerConfig()
  );
}
