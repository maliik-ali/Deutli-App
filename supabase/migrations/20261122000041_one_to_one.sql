-- 1:1 lessons are live classes with one seat. The teacher sets length, price (EUR) and free slots; a student books one.
-- First version: the price is agreed and paid outside Deutli. No payment or payout happens here.

alter table public.live_classes add column if not exists kind text not null default 'group' check (kind in ('group', '1to1'));
alter table public.live_classes add column if not exists price_eur_cents int check (price_eur_cents >= 0);
create index if not exists live_classes_kind_idx on public.live_classes (kind, starts_at);
