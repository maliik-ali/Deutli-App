import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A readable label for each student: the saved name, or the email when the student has not saved a name.
 * Server only (reads emails with the secret key); the caller has already checked who is asking.
 */
export async function studentLabels(admin: SupabaseClient, rows: { id: string; full_name: string | null }[]): Promise<{ id: string; name: string }[]> {
  return Promise.all(
    rows.map(async (r) => {
      if (r.full_name) return { id: r.id, name: r.full_name };
      const email = (await admin.auth.admin.getUserById(r.id)).data.user?.email ?? null;
      return { id: r.id, name: email ?? "Student" };
    }),
  );
}
