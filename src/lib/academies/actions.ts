"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeSlug } from "./personal";

const ADMINS = ["academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };

const createSchema = z.object({
  name: z.string().trim().min(2, "Give the workspace a name.").max(120),
  kind: z.enum(["teacher", "school"]),
  ownerEmail: z.string().trim().toLowerCase().email("Enter the owner's email."),
  planId: z.string().uuid("Choose a plan."),
});

/** Admin: create a workspace by hand (concierge setup), with an owner found by email and a plan. */
export async function createWorkspace(input: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const p = createSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };

  const { data: plan } = await admin.from("plans").select("id, kind").eq("id", p.data.planId).maybeSingle();
  if (!plan || plan.kind !== p.data.kind) return { error: `Choose a ${p.data.kind} plan for a ${p.data.kind} workspace.` };

  // Find the owner by email (fine at pilot size; the list is read one page at a time).
  let ownerId: string | null = null;
  for (let page = 1; page <= 20 && !ownerId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { error: GENERIC };
    ownerId = data.users.find((u) => u.email?.toLowerCase() === p.data.ownerEmail)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!ownerId) return { error: "No account with that email. Ask them to sign up first." };

  const { data: academy, error } = await admin
    .from("academies")
    .insert({ name: p.data.name, kind: p.data.kind, owner_id: ownerId, plan_id: p.data.planId, slug: makeSlug(p.data.name) })
    .select("id")
    .single();
  if (error || !academy) return { error: GENERIC };
  await admin.from("academy_members").insert({ academy_id: academy.id, user_id: ownerId, role: "owner" });
  // The owner works in this workspace; a student keeps their role.
  const { data: owner } = await admin.from("profiles").select("role").eq("id", ownerId).maybeSingle();
  if (owner?.role === "student") await admin.from("profiles").update({ role: "teacher" }).eq("id", ownerId);
  await admin.from("profiles").update({ academy_id: academy.id }).eq("id", ownerId);

  revalidatePath("/admin/academies");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  discountPercent: z.coerce.number().int().min(0, "Discount is 0 to 100.").max(100, "Discount is 0 to 100."),
  discountUntil: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")]),
  showPoweredBy: z.boolean(),
});

/** Admin: change a workspace's plan, founding discount and "Powered by Deutli". Checked on the server. */
export async function updateWorkspace(input: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const p = updateSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };

  const [{ data: academy }, { data: plan }] = await Promise.all([
    admin.from("academies").select("kind").eq("id", p.data.id).maybeSingle(),
    admin.from("plans").select("kind, features").eq("id", p.data.planId).maybeSingle(),
  ]);
  if (!academy || !plan || plan.kind === "student") return { error: GENERIC };
  // A teacher workspace can't sit on a school plan until it is upgraded (kind changes with the plan).
  const kind = plan.kind as "teacher" | "school";
  if (!p.data.showPoweredBy && !(plan.features as string[]).includes("remove_branding")) {
    return { error: "This plan can't remove \"Powered by Deutli\". Choose School Pro or higher." };
  }
  if (p.data.discountPercent > 0 && !p.data.discountUntil) return { error: "Choose the date the discount ends." };

  const { error } = await admin
    .from("academies")
    .update({
      plan_id: p.data.planId,
      kind,
      show_powered_by: p.data.showPoweredBy,
      discount_percent: p.data.discountPercent,
      discount_until: p.data.discountPercent > 0 ? p.data.discountUntil : null,
    })
    .eq("id", p.data.id);
  if (error) return { error: GENERIC };
  revalidatePath("/admin/academies");
  return { ok: true };
}
