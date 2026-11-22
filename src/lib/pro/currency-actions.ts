"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth/dal";
import { getFxRates } from "./data";
import { CURRENCY_COOKIE } from "./display";

/** The student picks the currency prices are shown in. Only EUR or a currency with a rate is accepted. */
export async function setDisplayCurrency(currency: unknown): Promise<{ error: string } | { ok: true }> {
  await requireUser(["student", "academy_admin", "super_admin"]);
  const rates = await getFxRates();
  if (typeof currency !== "string" || (currency !== "EUR" && !rates[currency])) return { error: "That currency isn't available." };
  (await cookies()).set(CURRENCY_COOKIE, currency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
