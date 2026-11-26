import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type OpenBatch = { id: string; name: string; level: string | null; exam: string | null; startsOn: string | null; endsOn: string | null; seats: number | null; seatsLeft: number | null };

/** A teacher's batches that are listed for new students: not archived, not finished, with seats left if there is a limit. */
export async function listOpenBatches(admin: Admin, teacherId: string): Promise<OpenBatch[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin.from("batches").select("id, name, level, exam, starts_on, ends_on, seats").eq("teacher_id", teacherId).eq("is_listed", true).eq("archived", false).order("starts_on", { nullsFirst: false });
  const rows = ((data ?? []) as { id: string; name: string; level: string | null; exam: string | null; starts_on: string | null; ends_on: string | null; seats: number | null }[]).filter((b) => !b.ends_on || b.ends_on >= today);
  if (!rows.length) return [];
  const { data: m } = await admin.from("batch_members").select("batch_id").in("batch_id", rows.map((r) => r.id));
  const used = new Map<string, number>();
  for (const r of (m ?? []) as { batch_id: string }[]) used.set(r.batch_id, (used.get(r.batch_id) ?? 0) + 1);
  return rows.map((b) => ({ id: b.id, name: b.name, level: b.level, exam: b.exam, startsOn: b.starts_on, endsOn: b.ends_on, seats: b.seats, seatsLeft: b.seats == null ? null : Math.max(0, b.seats - (used.get(b.id) ?? 0)) }));
}
