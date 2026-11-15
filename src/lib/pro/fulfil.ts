import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/**
 * The order is paid: extend Pro (from today, or from the end of the current Pro) and close the order.
 * Safe to call twice: an order that is already paid is skipped. Used by the admin's Approve and by the Stripe webhook.
 */
export async function fulfilOrder(admin: SupabaseClient, orderId: string): Promise<{ ok: true } | { error: string }> {
  const { data: o } = await admin.from("orders").select("id, user_id, months, status").eq("id", orderId).maybeSingle();
  if (!o) return { error: "Order not found." };
  if (o.status === "paid") return { ok: true };
  if (!["pending", "awaiting_review"].includes(o.status)) return { error: "This order was already handled." };

  // Close the order first, only if nobody else did meanwhile (stops a double extension).
  const { data: closed } = await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", o.id).in("status", ["pending", "awaiting_review"]).select("id");
  if (!closed?.length) return { ok: true };

  const { data: prof } = await admin.from("profiles").select("pro_until").eq("id", o.user_id).maybeSingle();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const start = prof?.pro_until && prof.pro_until > today ? prof.pro_until : today;
  const { error } = await admin.from("profiles").update({ pro_until: addMonths(start, o.months) }).eq("id", o.user_id);
  if (error) {
    await admin.from("orders").update({ status: "awaiting_review", paid_at: null }).eq("id", o.id); // let an admin retry
    return { error: "Could not turn Pro on." };
  }
  return { ok: true };
}
