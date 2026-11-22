import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspacePlan = {
  id: string;
  code: string;
  kind: "teacher" | "school";
  name: string;
  max_students: number | null;
  max_teachers: number | null;
  features: string[];
  eur_cents: number | null;
  pkr_minor: number | null;
};

export type Workspace = {
  id: string;
  name: string;
  kind: "teacher" | "school";
  slug: string | null;
  owner_id: string | null;
  plan_id: string | null;
  show_powered_by: boolean;
  discount_percent: number;
  discount_until: string | null;
  created_at: string;
};

export const WORKSPACE_COLUMNS = "id, name, kind, slug, owner_id, plan_id, show_powered_by, discount_percent, discount_until, created_at";

/** Money in minor units (cents / paisa) as text, e.g. 1900 EUR -> "€19", 290000 PKR -> "Rs. 2,900". */
export function formatMinor(minor: number | null | undefined, currency: "EUR" | "PKR"): string {
  if (minor == null) return "On request";
  const major = minor / 100;
  if (currency === "EUR") return `€${Number.isInteger(major) ? major : major.toFixed(2)}`;
  return `Rs. ${major.toLocaleString("en-PK")}`;
}

/** All teacher and school plans with their EUR and PKR prices. Server only; the caller has checked the role. */
export async function getWorkspacePlans(): Promise<WorkspacePlan[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("plans")
    .select("id, code, kind, name, max_students, max_teachers, features, sort, plan_prices(region, amount_minor)")
    .in("kind", ["teacher", "school"])
    .order("sort");
  type Row = Omit<WorkspacePlan, "eur_cents" | "pkr_minor"> & { plan_prices: { region: string; amount_minor: number }[] };
  return ((data ?? []) as unknown as Row[]).map(({ plan_prices, ...p }) => ({
    ...p,
    eur_cents: plan_prices.find((x) => x.region === "global")?.amount_minor ?? null,
    pkr_minor: plan_prices.find((x) => x.region === "south_asia")?.amount_minor ?? null,
  }));
}

/**
 * Students that belong to a workspace: attached to it, or taught by one of its members.
 * (Counted as "students" for now. "Active" students need homework and tests, which are not built yet.)
 */
export async function countWorkspaceStudents(academyIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(academyIds.map((id) => [id, 0]));
  const admin = createAdminClient();
  if (!admin || academyIds.length === 0) return out;

  const [members, attached] = await Promise.all([
    admin.from("academy_members").select("academy_id, user_id").in("academy_id", academyIds),
    admin.from("profiles").select("id, academy_id").eq("role", "student").in("academy_id", academyIds),
  ]);
  const sets = new Map<string, Set<string>>(academyIds.map((id) => [id, new Set()]));
  for (const r of (attached.data ?? []) as { id: string; academy_id: string }[]) sets.get(r.academy_id)?.add(r.id);

  const memberRows = (members.data ?? []) as { academy_id: string; user_id: string }[];
  const teacherIds = [...new Set(memberRows.map((m) => m.user_id))];
  if (teacherIds.length) {
    const { data } = await admin.from("profiles").select("id, teacher_id").eq("role", "student").in("teacher_id", teacherIds);
    for (const s of (data ?? []) as { id: string; teacher_id: string }[]) {
      for (const m of memberRows) if (m.user_id === s.teacher_id) sets.get(m.academy_id)?.add(s.id);
    }
  }
  for (const [id, set] of sets) out.set(id, set.size);
  return out;
}

export type MyWorkspace = { workspace: Workspace; plan: WorkspacePlan | null; students: number; teachers: number; role: "owner" | "admin" | "teacher" };

/** The workspace a teacher belongs to (their own first). Null if they have none yet. */
export async function getMyWorkspace(userId: string): Promise<MyWorkspace | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: rows } = await admin.from("academy_members").select("academy_id, role").eq("user_id", userId);
  const mine = (rows ?? []) as { academy_id: string; role: "owner" | "admin" | "teacher" }[];
  if (mine.length === 0) return null;
  const { data: list } = await admin.from("academies").select(WORKSPACE_COLUMNS).in("id", mine.map((m) => m.academy_id));
  const all = (list ?? []) as Workspace[];
  // Prefer a workspace the person owns.
  const pick = all.find((w) => mine.find((m) => m.academy_id === w.id)?.role === "owner") ?? all[0];
  if (!pick) return null;
  const [plans, counts, teachers] = await Promise.all([
    getWorkspacePlans(),
    countWorkspaceStudents([pick.id]),
    admin.from("academy_members").select("user_id", { count: "exact", head: true }).eq("academy_id", pick.id),
  ]);
  return {
    workspace: pick,
    plan: plans.find((p) => p.id === pick.plan_id) ?? null,
    students: counts.get(pick.id) ?? 0,
    teachers: teachers.count ?? 1,
    role: mine.find((m) => m.academy_id === pick.id)!.role,
  };
}
