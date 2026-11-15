"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilOrder } from "./fulfil";

const ADMINS = ["academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please wait a moment and try again.";
type Result = { error: string } | { ok: true };
const uuid = z.string().uuid();
const refresh = () => {
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/upgrade");
};

async function db() {
  await requireUser(ADMINS);
  return createAdminClient();
}

const planSchema = z.object({
  name: z.string().trim().min(1, "Give the plan a name.").max(60),
  months: z.coerce.number().int().min(1, "Months must be 1 or more.").max(36),
  price: z.coerce.number().int().min(0, "Enter the price in rupees.").max(1_000_000),
});

export async function addPlan(input: unknown): Promise<Result> {
  const admin = await db();
  const p = planSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!admin) return { error: GENERIC };
  const { error } = await admin.from("plans").insert({ name: p.data.name, months: p.data.months, price_pkr: p.data.price, sort: p.data.months });
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

export async function setPlanActive(id: unknown, active: unknown): Promise<Result> {
  const admin = await db();
  const i = uuid.safeParse(id);
  if (!i.success || typeof active !== "boolean" || !admin) return { error: GENERIC };
  const { error } = await admin.from("plans").update({ active }).eq("id", i.data);
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

const accountSchema = z.object({
  label: z.string().trim().min(1, "Enter the bank or wallet name, e.g. EasyPaisa.").max(40),
  title: z.string().trim().min(1, "Enter the account title (the name on the account).").max(120),
  number: z.string().trim().min(3, "Enter the account or phone number.").max(60),
  note: z.string().trim().max(300),
});

export async function addAccount(input: unknown): Promise<Result> {
  const admin = await db();
  const p = accountSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!admin) return { error: GENERIC };
  const { error } = await admin.from("payment_accounts").insert({ label: p.data.label, account_title: p.data.title, account_number: p.data.number, note: p.data.note || null });
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

export async function deleteAccount(id: unknown): Promise<Result> {
  const admin = await db();
  const i = uuid.safeParse(id);
  if (!i.success || !admin) return { error: GENERIC };
  const { error } = await admin.from("payment_accounts").delete().eq("id", i.data);
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

/** Payment checked and OK: the order is paid and Pro is extended. */
export async function approveOrder(id: unknown): Promise<Result> {
  const admin = await db();
  const i = uuid.safeParse(id);
  if (!i.success || !admin) return { error: GENERIC };
  const r = await fulfilOrder(admin, i.data);
  if ("error" in r) return r;
  refresh();
  return { ok: true };
}

export async function rejectOrder(id: unknown, note: unknown): Promise<Result> {
  const admin = await db();
  const i = uuid.safeParse(id);
  const n = z.string().trim().max(300).safeParse(note ?? "");
  if (!i.success || !n.success || !admin) return { error: GENERIC };
  const { error } = await admin.from("orders").update({ status: "rejected", admin_note: n.data || "We could not find this payment. Please check the transaction ID and try again." }).eq("id", i.data).in("status", ["pending", "awaiting_review"]);
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}
