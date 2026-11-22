-- EUR is the base price. A plan with price_eur_cents is charged in EUR by card; bank/wallet students
-- see the PKR amount worked out from fx_rates, locked on the order. Plans without price_eur_cents keep working
-- exactly as before (PKR), so this can be switched on plan by plan in /admin/payments.

alter table public.plans add column if not exists price_eur_cents int check (price_eur_cents >= 0);

-- Other currencies are only a display of the same EUR price. Set by an admin.
create table if not exists public.fx_rates (
  currency text primary key check (currency ~ '^[A-Z]{3}$' and currency <> 'EUR'),
  per_eur numeric(14, 4) not null check (per_eur > 0),
  updated_at timestamptz not null default now()
);
alter table public.fx_rates enable row level security;
drop policy if exists "Anyone logged in reads rates" on public.fx_rates;
create policy "Anyone logged in reads rates" on public.fx_rates for select to authenticated using (true);
grant select on public.fx_rates to authenticated;
-- Writes: only the server, with the secret key, after the admin check.

insert into public.fx_rates (currency, per_eur) values ('PKR', 300) on conflict (currency) do nothing;

-- What the customer actually pays, locked at order time (amount_pkr stays for old orders).
alter table public.orders add column if not exists amount_eur_cents int;
alter table public.orders add column if not exists pay_currency text check (pay_currency ~ '^[A-Z]{3}$');
alter table public.orders add column if not exists pay_amount_minor int check (pay_amount_minor >= 0);
alter table public.orders add column if not exists fx_rate numeric(14, 4);
