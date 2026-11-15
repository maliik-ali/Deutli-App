-- "I want Deutli Pro" requests. There is no payment yet: the academy contacts the student with the price and how to pay.
create table if not exists public.pro_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

alter table public.pro_requests enable row level security;

drop policy if exists "Students read own pro request" on public.pro_requests;
create policy "Students read own pro request" on public.pro_requests
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students create own pro request" on public.pro_requests;
create policy "Students create own pro request" on public.pro_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Admins read all pro requests" on public.pro_requests;
create policy "Admins read all pro requests" on public.pro_requests
  for select to authenticated using ((select private.is_content_admin()));

grant select, insert on public.pro_requests to authenticated;
