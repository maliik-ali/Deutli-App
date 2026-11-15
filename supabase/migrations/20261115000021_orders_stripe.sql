-- Card payments through Stripe Checkout: remember the Checkout session of an order.
alter table public.orders add column if not exists stripe_session_id text unique;
