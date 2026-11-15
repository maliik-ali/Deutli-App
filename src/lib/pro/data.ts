import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Plan = { id: string; name: string; months: number; price_pkr: number; active: boolean; sort: number };
export type PayAccount = { id: string; label: string; account_title: string; account_number: string; note: string | null; active: boolean; sort: number };
export type Order = {
  id: string;
  user_id: string;
  plan_name: string;
  months: number;
  amount_pkr: number;
  method: "card" | "bank_wallet";
  status: "pending" | "awaiting_review" | "paid" | "rejected" | "cancelled";
  reference: string;
  txn_id: string | null;
  payer_note: string | null;
  admin_note: string | null;
  created_at: string;
  paid_at: string | null;
};

export const ORDER_COLUMNS = "id, user_id, plan_name, months, amount_pkr, method, status, reference, txn_id, payer_note, admin_note, created_at, paid_at";
export const pkr = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;
/** Card payments need a gateway account. Until one is connected (env CARD_GATEWAY), the card option is shown as "soon". */
export const cardReady = () => Boolean(process.env.CARD_GATEWAY);

export async function getActivePlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("id, name, months, price_pkr, active, sort").eq("active", true).order("sort").order("months");
  return (data ?? []) as Plan[];
}

export async function getPlan(id: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("id, name, months, price_pkr, active, sort").eq("id", id).eq("active", true).maybeSingle();
  return (data as Plan | null) ?? null;
}

export async function getActiveAccounts(): Promise<PayAccount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_accounts").select("id, label, account_title, account_number, note, active, sort").eq("active", true).order("sort").order("label");
  return (data ?? []) as PayAccount[];
}

/** The student's own order (row level security hides other people's). */
export async function getMyOrder(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  return (data as Order | null) ?? null;
}

export async function getMyOrders(limit = 5): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select(ORDER_COLUMNS).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Order[];
}
