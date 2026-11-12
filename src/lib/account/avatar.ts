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
