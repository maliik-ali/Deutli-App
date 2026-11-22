"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { getManagedBatch } from "@/lib/batches/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedMaterial } from "./data";

const GENERIC = "That didn't work. Please try again.";
const BUCKET = "materials";
const uuid = z.string().uuid();
const EXT = ["pdf", "png", "jpg", "jpeg", "webp", "mp3", "m4a", "wav", "ogg", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "zip"];
type Result = { error: string } | { ok: true };

/** One-time upload link; the file then goes straight from the teacher's browser to private storage. */
export async function createMaterialUploadUrl(fileName: unknown): Promise<{ error: string } | { path: string; signedUrl: string }> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  const ext = typeof fileName === "string" ? fileName.split(".").pop()?.toLowerCase() : undefined;
  if (!ws || !admin) return { error: GENERIC };
  if (!ext || !EXT.includes(ext)) return { error: "Use a PDF, image, audio, Word, PowerPoint, Excel, text or zip file." };
  const path = `${ws.workspace.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: GENERIC };
  return { path: data.path, signedUrl: data.signedUrl };
}

const schema = z.object({
  kind: z.enum(["homework", "notes", "file", "link"]),
  title: z.string().trim().min(1, "Give it a title.").max(160),
  body: z.string().trim().max(8000),
  url: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "The link must start with https://"),
  dueOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid due date."),
  filePath: z.string().max(300).optional(),
  fileName: z.string().max(200).optional(),
  batchIds: z.array(uuid).min(1, "Choose at least one batch.").max(50),
});

export async function createMaterial(input: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin) return { error: GENERIC };
  const v = p.data;
  if (v.kind === "link" && !v.url) return { error: "Paste the link." };
  if (v.kind === "file" && !v.filePath) return { error: "Choose a file." };
  if (v.filePath && !v.filePath.startsWith(`${ws.workspace.id}/`)) return { error: GENERIC };

  const batches = (await Promise.all(v.batchIds.map((b) => getManagedBatch(b, user.id)))).filter((b) => !!b && b.academy_id === ws.workspace.id);
  if (batches.length !== v.batchIds.length) return { error: "You can only share with your own batches." };

  const { data, error } = await admin
    .from("materials")
    .insert({ academy_id: ws.workspace.id, owner_id: user.id, kind: v.kind, title: v.title, body: v.body || null, url: v.url || null, file_path: v.filePath ?? null, file_name: v.fileName ?? null, due_on: v.kind === "homework" && v.dueOn ? v.dueOn : null })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC };
  await admin.from("material_batches").insert(v.batchIds.map((b) => ({ material_id: data.id, batch_id: b, academy_id: ws.workspace.id })));
  revalidatePath("/teacher/materials");
  return { ok: true };
}

/** Share an item with one more batch, or take it away from one. One copy, many batches. */
export async function setMaterialBatch(materialId: unknown, batchId: unknown, shared: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const m = uuid.safeParse(materialId);
  const b = uuid.safeParse(batchId);
  const admin = createAdminClient();
  if (!m.success || !b.success || typeof shared !== "boolean" || !admin) return { error: GENERIC };
  const [material, batch] = await Promise.all([getManagedMaterial(m.data, user.id), getManagedBatch(b.data, user.id)]);
  if (!material || !batch || batch.academy_id !== material.academy_id) return { error: GENERIC };
  if (shared) await admin.from("material_batches").upsert({ material_id: material.id, batch_id: batch.id, academy_id: material.academy_id }, { onConflict: "material_id,batch_id", ignoreDuplicates: true });
  else await admin.from("material_batches").delete().eq("material_id", material.id).eq("batch_id", batch.id);
  revalidatePath("/teacher/materials");
  return { ok: true };
}

export async function deleteMaterial(materialId: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const m = uuid.safeParse(materialId);
  const admin = createAdminClient();
  if (!m.success || !admin) return { error: GENERIC };
  const material = await getManagedMaterial(m.data, user.id);
  if (!material) return { error: GENERIC };
  if (material.file_path) await admin.storage.from(BUCKET).remove([material.file_path]);
  await admin.from("materials").delete().eq("id", material.id);
  revalidatePath("/teacher/materials");
  return { ok: true };
}

/** Student: a short-lived link to a file, only for items shared with one of their batches. */
export async function getMaterialLink(materialId: unknown): Promise<{ error: string } | { url: string }> {
  const user = await requireUser(["student", "teacher", "academy_admin", "super_admin"]);
  const id = uuid.safeParse(materialId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC };
  const { data: m } = await admin.from("materials").select("id, file_path, academy_id, owner_id").eq("id", id.data).maybeSingle();
  if (!m?.file_path) return { error: GENERIC };
  let allowed = m.owner_id === user.id || user.role === "super_admin" || user.role === "academy_admin";
  if (!allowed) {
    const [{ data: mb }, { data: mine }] = await Promise.all([
      admin.from("material_batches").select("batch_id").eq("material_id", m.id),
      admin.from("batch_members").select("batch_id").eq("student_id", user.id),
    ]);
    const mineSet = new Set(((mine ?? []) as { batch_id: string }[]).map((r) => r.batch_id));
    allowed = ((mb ?? []) as { batch_id: string }[]).some((r) => mineSet.has(r.batch_id));
  }
  if (!allowed) return { error: GENERIC };
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(m.file_path, 600);
  return data?.signedUrl ? { url: data.signedUrl } : { error: GENERIC };
}

/** Student: tick homework as done (or undo). Only for homework shared with their batches. */
export async function setHomeworkDone(materialId: unknown, done: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const id = uuid.safeParse(materialId);
  const admin = createAdminClient();
  if (!id.success || typeof done !== "boolean" || !admin) return { error: GENERIC };
  const [{ data: mb }, { data: mine }, { data: m }] = await Promise.all([
    admin.from("material_batches").select("batch_id").eq("material_id", id.data),
    admin.from("batch_members").select("batch_id").eq("student_id", user.id),
    admin.from("materials").select("academy_id, kind").eq("id", id.data).maybeSingle(),
  ]);
  const mineSet = new Set(((mine ?? []) as { batch_id: string }[]).map((r) => r.batch_id));
  if (!m || m.kind !== "homework" || !((mb ?? []) as { batch_id: string }[]).some((r) => mineSet.has(r.batch_id))) return { error: GENERIC };
  if (done) await admin.from("material_done").upsert({ material_id: id.data, student_id: user.id, academy_id: m.academy_id }, { onConflict: "material_id,student_id", ignoreDuplicates: true });
  else await admin.from("material_done").delete().eq("material_id", id.data).eq("student_id", user.id);
  revalidatePath("/dashboard/homework");
  revalidatePath("/dashboard/batches", "layout");
  return { ok: true };
}
