import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type Material = {
  id: string;
  academy_id: string;
  owner_id: string;
  kind: "homework" | "notes" | "file" | "link";
  title: string;
  body: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  due_on: string | null;
  created_at: string;
};
export const MATERIAL_COLS = "id, academy_id, owner_id, kind, title, body, url, file_path, file_name, due_on, created_at";
export const KIND_LABEL: Record<Material["kind"], string> = { homework: "Homework", notes: "Notes", file: "File", link: "Link" };

/** The teacher's materials with the batches each one is shared with and how many students ticked it done. */
export async function listTeacherMaterials(userId: string, academyId: string, seeAll: boolean) {
  const admin = createAdminClient();
  if (!admin) return [] as (Material & { batches: { id: string; name: string }[]; done: number; students: number })[];
  let q = admin.from("materials").select(MATERIAL_COLS).order("created_at", { ascending: false }).limit(100);
  q = seeAll ? q.eq("academy_id", academyId) : q.eq("owner_id", userId);
  const { data } = await q;
  const rows = (data ?? []) as Material[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: mb }, { data: dn }] = await Promise.all([
    admin.from("material_batches").select("material_id, batch_id, batches(name)").in("material_id", ids),
    admin.from("material_done").select("material_id").in("material_id", ids),
  ]);
  const batchesOf = new Map<string, { id: string; name: string }[]>();
  const batchIds = new Set<string>();
  for (const r of (mb ?? []) as unknown as { material_id: string; batch_id: string; batches: { name: string } | null }[]) {
    batchesOf.set(r.material_id, [...(batchesOf.get(r.material_id) ?? []), { id: r.batch_id, name: r.batches?.name ?? "Batch" }]);
    batchIds.add(r.batch_id);
  }
  const done = new Map<string, number>();
  for (const r of (dn ?? []) as { material_id: string }[]) done.set(r.material_id, (done.get(r.material_id) ?? 0) + 1);
  // How many students each item reached (distinct students over its batches).
  const students = new Map<string, number>();
  if (batchIds.size) {
    const { data: bm } = await admin.from("batch_members").select("batch_id, student_id").in("batch_id", [...batchIds]);
    for (const r of rows) {
      const bs = new Set((batchesOf.get(r.id) ?? []).map((b) => b.id));
      students.set(r.id, new Set(((bm ?? []) as { batch_id: string; student_id: string }[]).filter((x) => bs.has(x.batch_id)).map((x) => x.student_id)).size);
    }
  }
  return rows.map((r) => ({ ...r, batches: batchesOf.get(r.id) ?? [], done: done.get(r.id) ?? 0, students: students.get(r.id) ?? 0 }));
}

export async function getManagedMaterial(id: string, userId: string): Promise<Material | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("materials").select(MATERIAL_COLS).eq("id", id).maybeSingle();
  const m = data as Material | null;
  if (!m) return null;
  if (m.owner_id === userId) return m;
  const { data: mem } = await admin.from("academy_members").select("role").eq("academy_id", m.academy_id).eq("user_id", userId).maybeSingle();
  return mem && (mem.role === "owner" || mem.role === "admin") ? m : null;
}

/** Materials for one batch, as a student or teacher sees them. */
export async function listBatchMaterials(batchId: string, studentId: string | null) {
  const admin = createAdminClient();
  if (!admin) return [] as (Material & { done: boolean })[];
  const { data: mb } = await admin.from("material_batches").select("material_id").eq("batch_id", batchId);
  const ids = ((mb ?? []) as { material_id: string }[]).map((r) => r.material_id);
  if (!ids.length) return [];
  const { data } = await admin.from("materials").select(MATERIAL_COLS).in("id", ids).order("created_at", { ascending: false });
  const doneSet = new Set<string>();
  if (studentId) {
    const { data: d } = await admin.from("material_done").select("material_id").eq("student_id", studentId).in("material_id", ids);
    for (const r of (d ?? []) as { material_id: string }[]) doneSet.add(r.material_id);
  }
  return ((data ?? []) as Material[]).map((m) => ({ ...m, done: doneSet.has(m.id) }));
}

/** All homework for a student across their batches. */
export async function listMyHomework(studentId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as (Material & { done: boolean; batchName: string })[];
  const { data: bm } = await admin.from("batch_members").select("batch_id, batches(name)").eq("student_id", studentId);
  const batches = (bm ?? []) as unknown as { batch_id: string; batches: { name: string } | null }[];
  if (!batches.length) return [];
  const { data: mb } = await admin.from("material_batches").select("material_id, batch_id").in("batch_id", batches.map((b) => b.batch_id));
  const links = (mb ?? []) as { material_id: string; batch_id: string }[];
  const ids = [...new Set(links.map((l) => l.material_id))];
  if (!ids.length) return [];
  const [{ data }, { data: d }] = await Promise.all([
    admin.from("materials").select(MATERIAL_COLS).in("id", ids).eq("kind", "homework"),
    admin.from("material_done").select("material_id").eq("student_id", studentId).in("material_id", ids),
  ]);
  const doneSet = new Set(((d ?? []) as { material_id: string }[]).map((r) => r.material_id));
  const batchName = new Map(batches.map((b) => [b.batch_id, b.batches?.name ?? "Batch"]));
  return ((data ?? []) as Material[]).map((m) => ({ ...m, done: doneSet.has(m.id), batchName: batchName.get(links.find((l) => l.material_id === m.id)?.batch_id ?? "") ?? "Batch" }));
}

/** Who did a homework (names), for the teacher. */
export async function listDoneBy(materialId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as string[];
  const { data } = await admin.from("material_done").select("student_id").eq("material_id", materialId);
  const ids = ((data ?? []) as { student_id: string }[]).map((r) => r.student_id);
  if (!ids.length) return [];
  const { data: p } = await admin.from("profiles").select("full_name").in("id", ids);
  return ((p ?? []) as { full_name: string | null }[]).map((r) => r.full_name ?? "Student");
}
