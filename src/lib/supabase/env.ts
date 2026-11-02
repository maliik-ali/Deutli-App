import "server-only";

/**
 * Supabase settings are read at request time (never baked in at build),
 * so the app builds without keys and works once they are set on Vercel.
 */
export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export const NOT_CONFIGURED_MESSAGE =
  "The app isn't connected to its database yet. Please try again later or contact your academy.";
