import "server-only";

import { cookies } from "next/headers";

import type { Plan } from "./data";
import { defaultCurrency, formatMinor, priceLine, type FxRates } from "./money";

export const CURRENCY_COOKIE = "deutli_currency";

/** The student's chosen display currency (cookie), else a default from their device time zone. Always EUR or a currency we have a rate for. */
export async function getDisplayCurrency(timeZone: string, rates: FxRates): Promise<string> {
  const saved = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (saved === "EUR" || (saved && rates[saved])) return saved;
  return defaultCurrency(timeZone, rates);
}

/** One plan's price for a student: EUR plans follow the chosen currency, old PKR-only plans stay in rupees. */
export function planPrice(plan: Plan, currency: string, rates: FxRates) {
  if (plan.price_eur_cents != null) {
    const total = priceLine(plan.price_eur_cents, currency, rates);
    const month = priceLine(Math.round(plan.price_eur_cents / plan.months), currency, rates);
    return { eur: true as const, total, perMonth: month };
  }
  return { eur: false as const, total: { main: formatMinor(plan.price_pkr * 100, "PKR"), note: null }, perMonth: { main: formatMinor(Math.round(plan.price_pkr / plan.months) * 100, "PKR"), note: null } };
}

/** "from €6.99" for the lock buttons on mock exam pages: the cheapest active plan per month is not used, the cheapest total is. */
export function fromLabel(plans: Plan[], currency: string, rates: FxRates): string {
  if (plans.length === 0) return "";
  const cheapest = [...plans].sort((a, b) => (a.price_eur_cents ?? a.price_pkr / 300 * 100) - (b.price_eur_cents ?? b.price_pkr / 300 * 100))[0];
  return `from ${planPrice(cheapest, currency, rates).total.main}`;
}
