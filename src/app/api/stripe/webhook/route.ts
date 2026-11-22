import { NextResponse, type NextRequest } from "next/server";

import { fulfilOrder } from "@/lib/pro/fulfil";
import { getStripe, stripeCurrency } from "@/lib/pro/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe tells us here that a card payment finished. We check the signature, the amount and the currency
 * against our own order, then turn Pro on. Nothing is trusted from the browser.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();
  if (!stripe || !secret || !admin) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no signature" }, { status: 400 });
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const orderId = session.client_reference_id;
    if (orderId && session.payment_status === "paid") {
      const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
      // New orders carry their own currency and amount (EUR for card); old ones are PKR rupees in the env currency.
      const expected = order && order.pay_currency && order.pay_amount_minor != null ? { currency: String(order.pay_currency).toLowerCase(), minor: order.pay_amount_minor as number } : order ? { currency: stripeCurrency(), minor: order.amount_pkr * 100 } : null;
      const okAmount = !!expected && session.amount_total === expected.minor && session.currency === expected.currency;
      if (order && order.method === "card" && order.stripe_session_id === session.id && okAmount) {
        const r = await fulfilOrder(admin, order.id);
        if ("error" in r) return NextResponse.json({ error: r.error }, { status: 500 }); // Stripe will retry
      }
    }
  }
  return NextResponse.json({ received: true });
}
