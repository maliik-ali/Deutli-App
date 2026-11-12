import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client with the secret key: skips Row Level Security.
 * Server code only, and only for jobs students must not do themselves
 * (writing the shared word dictionary, counting translations).
 * Returns null when SUPABASE_SECRET_KEY is not set.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !secret) return null;
  return createClient(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
