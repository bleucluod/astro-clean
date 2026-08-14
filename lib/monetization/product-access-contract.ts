import type { ReportAccessPolicy } from "@/lib/monetization/access-policy";
import type { HalleusProductPackage } from "@/lib/monetization/product-catalog";

export type AccountCreditBalances = {
  fullReport: number;
  relationship: number;
};

export type AccountProductAccess = {
  authenticated: boolean;
  balances: AccountCreditBalances;
  reportUnlocked: boolean;
  policy: ReportAccessPolicy;
  activePackages: HalleusProductPackage[];
};

export const EMPTY_ACCOUNT_CREDIT_BALANCES: AccountCreditBalances = {
  fullReport: 0,
  relationship: 0,
};
