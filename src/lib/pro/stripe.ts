import "server-only";

import Stripe from "stripe";

/** Stripe client for card payments (server only). Null until STRIPE_SECRET_KEY is set. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

/** Currency of the card charge. Prices are stored in rupees; the amount is sent in the smallest unit (x100). */
export const stripeCurrency = () => (process.env.STRIPE_CURRENCY || "pkr").toLowerCase();
