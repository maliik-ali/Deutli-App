import "server-only";

import { createClient } from "@/lib/supabase/server";

export const AVATAR_BUCKET = "avatars";

/** Short-lived link to a profile picture (private bucket), or null. */
export async function getAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60 * 3);
  return data?.signedUrl ?? null;
}

/** Signed links for several profile pictures at once (path → link). Paths without a picture are skipped. */
export async function getAvatarUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(unique, 60 * 60 * 3);
  for (const row of data ?? []) if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  return map;
}
