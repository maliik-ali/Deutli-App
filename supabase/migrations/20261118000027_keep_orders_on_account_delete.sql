-- Account deletion: paid orders must be kept for the legal retention period
-- (German tax law, §147 AO; GDPR Art. 17(3)(b) allows this). When a user is
-- deleted, their orders stay but lose the link to the person (user_id = null).
-- Unpaid orders are removed by the delete-account action before the user is deleted.

alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;
