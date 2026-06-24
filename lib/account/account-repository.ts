import { previewAccountRepository } from "@/lib/account/preview-account-repository";
import type { AccountRepository } from "@/lib/account/account-storage-contract";

export function getAccountRepository(): AccountRepository {
  return previewAccountRepository;
}
