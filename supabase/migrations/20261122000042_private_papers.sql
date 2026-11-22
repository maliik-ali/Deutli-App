-- Private papers: a teacher can upload a paper for their own batches or their workspace.
-- Existing papers stay public (visibility default). Answer keys stay server-only like before.
-- Teachers write through the server (secret key) after role and ownership checks, so no new write policies are needed.

alter table public.mock_papers add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.mock_papers add column if not exists academy_id uuid references public.academies (id) on delete set null;
alter table public.mock_papers add column if not exists visibility text not null default 'public' check (visibility in ('public', 'batches', 'academy'));
alter table public.mock_papers add column if not exists rights_confirmed_at timestamptz;
create index if not exists mock_papers_owner_idx on public.mock_papers (owner_id);

create table if not exists public.paper_batches (
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (paper_id, batch_id)
);
alter table public.paper_batches enable row level security;
drop policy if exists "Read paper batches" on public.paper_batches;
create policy "Read paper batches" on public.paper_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
grant select on public.paper_batches to authenticated;

-- Students and teachers report a paper they think is not allowed to be here.
create table if not exists public.paper_reports (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.paper_reports enable row level security;
drop policy if exists "Admins read paper reports" on public.paper_reports;
create policy "Admins read paper reports" on public.paper_reports for select to authenticated using ((select private.is_content_admin()));
grant select on public.paper_reports to authenticated;

-- Can the logged-in student open this paper? Public, shared with one of their batches, or their workspace's.
create or replace function private.can_see_paper(p_paper uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mock_papers p
    where p.id = p_paper and p.is_published and (
      p.visibility = 'public'
      or (p.visibility = 'academy' and p.academy_id is not null and p.academy_id = (select private.current_user_academy_id()))
      or (p.visibility = 'batches' and exists (
            select 1 from public.paper_batches pb join public.batch_members bm on bm.batch_id = pb.batch_id
            where pb.paper_id = p.id and bm.student_id = (select auth.uid())))
    )
  )
$$;
revoke all on function private.can_see_paper(uuid) from public, anon;
grant execute on function private.can_see_paper(uuid) to authenticated;

drop policy if exists "Logged-in users read published papers" on public.mock_papers;
create policy "Logged-in users read published papers" on public.mock_papers
  for select to authenticated
  using ((select private.can_see_paper(id)) or owner_id = (select auth.uid()) or (select private.is_content_admin()));
