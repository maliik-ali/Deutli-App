/** Money helpers shared by server and browser code. EUR is the base price; other currencies are a display of it. */

export type FxRates = Record<string, number>; // currency -> units per 1 EUR

const SYMBOL: Record<string, string> = { EUR: "€", PKR: "Rs. ", USD: "$", GBP: "£", INR: "₹", BDT: "৳", TRY: "₺", AED: "AED " };

/** 699 EUR cents -> "€6.99", 21000000 PKR paisa -> "Rs. 210,000". Whole amounts show no decimals. */
export function formatMinor(minor: number, currency: string): string {
  const major = minor / 100;
  const text = Number.isInteger(major) ? major.toLocaleString("en-US") : major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${SYMBOL[currency] ?? `${currency} `}${text}`;
}

/** EUR cents shown in another currency, rounded to the nearest 10 for big-number currencies (rate 50 or more). */
export function convertEur(eurCents: number, perEur: number): number {
  const major = (eurCents / 100) * perEur;
  return perEur >= 50 ? Math.round(major / 10) * 10 * 100 : Math.round(major * 100);
}

/** The money on an order: new orders carry their own currency, old ones are PKR rupees. */
export function orderMoney(o: { amount_pkr: number; pay_currency?: string | null; pay_amount_minor?: number | null }): { currency: string; minor: number } {
  return o.pay_currency && o.pay_amount_minor != null ? { currency: o.pay_currency, minor: o.pay_amount_minor } : { currency: "PKR", minor: o.amount_pkr * 100 };
}
export const orderLabel = (o: Parameters<typeof orderMoney>[0]) => {
  const m = orderMoney(o);
  return formatMinor(m.minor, m.currency);
};

const TZ_CURRENCY: Record<string, string> = {
  "Asia/Karachi": "PKR",
  "Asia/Kolkata": "INR",
  "Asia/Calcutta": "INR",
  "Asia/Dhaka": "BDT",
  "Asia/Dubai": "AED",
  "Europe/Istanbul": "TRY",
  "Europe/London": "GBP",
};

/** Default display currency from the device's time zone (never assumed): EUR unless we have a rate for their region. */
export function defaultCurrency(timeZone: string, rates: FxRates): string {
  const c = TZ_CURRENCY[timeZone];
  return c && rates[c] ? c : "EUR";
}

export type PriceLine = { main: string; note: string | null };

/** A EUR price as the student sees it in their chosen currency: "€7" or "Rs. 2,100" with the rate as a note. */
export function priceLine(eurCents: number, currency: string, rates: FxRates): PriceLine {
  if (currency === "EUR" || !rates[currency]) return { main: formatMinor(eurCents, "EUR"), note: null };
  return { main: formatMinor(convertEur(eurCents, rates[currency]), currency), note: `Estimate in ${currency} (1 EUR = ${rates[currency]} ${currency}). Cards are charged in EUR.` };
}
