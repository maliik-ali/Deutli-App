"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cardReady } from "./data";
import { getStripe, stripeCurrency } from "./stripe";

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

/** Creates the order. The price always comes from the plan in the database, never from the browser. */
async function makeOrder(userId: string, planId: string, method: "card" | "bank_wallet"): Promise<{ error: string } | { id: string }> {
  if (method === "card" && !cardReady()) return { error: "Card payments are not open yet. Please pay with a bank or wallet." };

  const supabase = await createClient();
  const { data: plan } = await supabase.from("plans").select("id, name, months, price_pkr").eq("id", planId).eq("active", true).maybeSingle();
  if (!plan) return { error: "This plan is no longer available. Please choose again." };

  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };

  // Already started this payment (same plan, same way, still waiting, same price)? Carry on with that order
  // instead of piling up duplicates every time the student taps the button again.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: waiting } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .eq("method", method)
    .eq("status", "pending")
    .eq("amount_pkr", plan.price_pkr)
    .gt("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (waiting) return { id: waiting.id as string };

  const { data, error } = await admin
    .from("orders")
    .insert({ user_id: userId, plan_id: plan.id, plan_name: plan.name, months: plan.months, amount_pkr: plan.price_pkr, method, reference: newReference() })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC };
  return { id: data.id };
}

/** Step 2 -> 3: create the order, then show its page (bank details or card button). */
export async function createOrder(input: unknown): Promise<{ error: string } | undefined> {
  const user = await requireUser(LEARNERS);
  const p = z.object({ planId: z.string().uuid(), method: z.enum(["card", "bank_wallet"]), agreed: z.literal(true, { error: "Please tick the box to continue." }) }).safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const order = await makeOrder(user.id, p.data.planId, p.data.method);
  if ("error" in order) return order;
  redirect(`/dashboard/upgrade/order/${order.id}`);
}

/** "Get Pro" on the plans page: create the card order and go straight to Stripe's payment page. */
export async function buyProWithCard(input: unknown): Promise<{ error: string } | { url: string }> {
  const user = await requireUser(LEARNERS);
  const p = z.object({ planId: z.string().uuid(), agreed: z.literal(true, { error: "Please tick the box to continue." }) }).safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const order = await makeOrder(user.id, p.data.planId, "card");
  if ("error" in order) return order;
  return startCardPayment(order.id);
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

/** Opens Stripe's secure payment page for a card order. Returns the address to go to. */
export async function startCardPayment(orderId: unknown): Promise<{ error: string } | { url: string }> {
  const user = await requireUser(LEARNERS);
  const id = z.string().uuid().safeParse(orderId);
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC };
  if (!stripe) return { error: "Card payments are not open yet. Please pay with a bank or wallet." };

  const { data: o } = await admin.from("orders").select("id, plan_name, months, amount_pkr, method, status, reference, stripe_session_id").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (!o || o.method !== "card" || o.status !== "pending") return { error: GENERIC };

  const site = (process.env.SITE_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
  try {
    // Tapped again while Stripe's page for this order is still open: send them back to that same page. A second page
    // would replace the first one on the order, and paying on the first would then not be recognised.
    if (o.stripe_session_id) {
      const prev = await stripe.checkout.sessions.retrieve(o.stripe_session_id).catch(() => null);
      if (prev?.status === "open" && prev.url) return { url: prev.url };
      if (prev?.status === "complete") return { error: "We already received your payment and are confirming it. Please refresh this page in a moment." };
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: o.id,
      customer_email: user.email ?? undefined,
      metadata: { order_id: o.id, reference: o.reference },
      line_items: [{ quantity: 1, price_data: { currency: stripeCurrency(), unit_amount: o.amount_pkr * 100, product_data: { name: `Deutli Pro · ${o.plan_name}` } } }],
      success_url: `${site}/dashboard/upgrade/order/${o.id}?card=done`,
      cancel_url: `${site}/dashboard/upgrade/order/${o.id}?card=cancelled`,
    });
    if (!session.url) return { error: GENERIC };
    await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", o.id);
    return { url: session.url };
  } catch {
    return { error: "We couldn't open the card payment page. Please try again in a moment." };
  }
}
