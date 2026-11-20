import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Counts one try for `key` and says if it is still allowed (at most `max` per `windowSeconds`).
 * Backed by the database function `check_rate_limit`, so it works across all server instances.
 * If the check itself breaks (e.g. the migration was not run yet) we let the request through and log it:
 * a broken limiter must not lock real students out.
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const { data, error } = await admin.rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}
