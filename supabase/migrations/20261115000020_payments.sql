-- Deutli Pro payments (no card data is ever stored here).
-- Plans and the bank/wallet accounts are set by an admin. Orders are created and changed only by the server (secret key).

alter table public.profiles add column if not exists pro_until date;
-- Students can never set this themselves: update is only granted on named columns (pro_until is not one of them).

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  months int not null check (months between 1 and 36),
  price_pkr int not null check (price_pkr >= 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),          -- "HBL", "EasyPaisa", "JazzCash"
  account_title text not null check (char_length(account_title) <= 120),
  account_number text not null check (char_length(account_number) <= 60),
  note text check (char_length(note) <= 300),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  plan_name text not null,
  months int not null,
  amount_pkr int not null,
  method text not null check (method in ('card', 'bank_wallet')),
  status text not null default 'pending' check (status in ('pending', 'awaiting_review', 'paid', 'rejected', 'cancelled')),
  reference text not null unique,
  txn_id text check (char_length(txn_id) <= 80),
  payer_note text check (char_length(payer_note) <= 300),
  admin_note text check (char_length(admin_note) <= 300),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at);

alter table public.plans enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Anyone logged in sees active plans" on public.plans;
create policy "Anyone logged in sees active plans" on public.plans for select to authenticated using (active or (select private.is_content_admin()));

drop policy if exists "Anyone logged in sees active accounts" on public.payment_accounts;
create policy "Anyone logged in sees active accounts" on public.payment_accounts for select to authenticated using (active or (select private.is_content_admin()));

drop policy if exists "Students read own orders" on public.orders;
create policy "Students read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders" on public.orders for select to authenticated using ((select private.is_content_admin()));

grant select on public.plans, public.payment_accounts, public.orders to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking the role.
