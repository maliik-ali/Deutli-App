"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cardReady } from "./data";

/** "I want Pro": saved so the academy can contact the student. Asking twice is fine. */
export async function requestPro(note: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const n = z.string().trim().max(300).safeParse(note ?? "");
  if (!n.success) return { error: "Keep your note under 300 letters." };
  const supabase = await createClient();
  const { error } = await supabase.from("pro_requests").upsert({ user_id: user.id, note: n.data || null }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) return { error: "We couldn't save your request. Check your internet and try again." };
  revalidatePath("/dashboard/upgrade");
  return { ok: true };
}

// ---- Checkout (student) ------------------------------------------------------------------------


const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please wait a moment and try again.";
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "DT-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");

/** Step 2 -> 3: create the order. The price always comes from the plan in the database, never from the browser. */
export async function createOrder(input: unknown): Promise<{ error: string } | undefined> {
  const user = await requireUser(LEARNERS);
  const p = z.object({ planId: z.string().uuid(), method: z.enum(["card", "bank_wallet"]), agreed: z.literal(true, { error: "Please tick the box to continue." }) }).safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.method === "card" && !cardReady()) return { error: "Card payments are not open yet. Please pay with a bank or wallet." };

  const supabase = await createClient();
  const { data: plan } = await supabase.from("plans").select("id, name, months, price_pkr").eq("id", p.data.planId).eq("active", true).maybeSingle();
  if (!plan) return { error: "This plan is no longer available. Please choose again." };

  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };
  const { data, error } = await admin
    .from("orders")
    .insert({ user_id: user.id, plan_id: plan.id, plan_name: plan.name, months: plan.months, amount_pkr: plan.price_pkr, method: p.data.method, reference: newReference() })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC };
  redirect(`/dashboard/upgrade/order/${data.id}`);
}

/** The student tells us they paid: transaction ID and an optional note. The admin then checks it. */
export async function submitPaymentProof(orderId: unknown, txnId: unknown, note: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser(LEARNERS);
  const p = z.object({ id: z.string().uuid(), txn: z.string().trim().min(4, "Enter the transaction ID from your receipt.").max(80), note: z.string().trim().max(300) }).safeParse({ id: orderId, txn: txnId, note: note ?? "" });
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };
  const { data: order } = await admin.from("orders").select("id, status, method").eq("id", p.data.id).eq("user_id", user.id).maybeSingle();
  if (!order || order.method !== "bank_wallet" || !["pending", "awaiting_review"].includes(order.status)) return { error: GENERIC };
  const { error } = await admin.from("orders").update({ txn_id: p.data.txn, payer_note: p.data.note || null, status: "awaiting_review" }).eq("id", order.id);
  if (error) return { error: GENERIC };
  revalidatePath(`/dashboard/upgrade/order/${order.id}`);
  return { ok: true };
}

export async function cancelOrder(orderId: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser(LEARNERS);
  const id = z.string().uuid().safeParse(orderId);
  if (!id.success) return { error: GENERIC };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };
  await admin.from("orders").update({ status: "cancelled" }).eq("id", id.data).eq("user_id", user.id).eq("status", "pending");
  revalidatePath("/dashboard/upgrade");
  return { ok: true };
}
