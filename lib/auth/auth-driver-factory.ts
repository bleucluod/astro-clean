import { getHalleusRuntimeEnv } from "@/lib/config/env";
import type { AuthDriver } from "@/types/auth";
import { createPreviewAuthDriver } from "./preview-auth-driver";

export function getAuthDriver(): AuthDriver {
  const env = getHalleusRuntimeEnv();

  void env;

  return createPreviewAuthDriver();
}
