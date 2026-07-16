import { createClient } from "@supabase/supabase-js";
import { getHalleusRuntimeEnv } from "@/lib/config/env";

export async function setSupabaseAccountSuspended(
  userId: string,
  suspended: boolean,
) {
  const env = getHalleusRuntimeEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase server administration is not configured.");
  }

  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? "876000h" : "none",
  });

  if (error) {
    throw new Error(error.message);
  }
}
