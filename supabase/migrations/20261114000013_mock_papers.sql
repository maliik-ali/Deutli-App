-- 16) Mock papers: real exam papers (page images + listening audio) that students solve online.
-- Admins upload them at /admin/mock-papers. Answers live in a separate table students can never read;
-- the server grades with the secret key. Safe to run more than once.

create table if not exists public.mock_papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  title text not null check (char_length(title) between 1 and 120),
  topics text not null default '' check (char_length(topics) <= 300),
  tone text not null default 'navy' check (tone in ('navy', 'violet', 'teal', 'indigo')),
  is_free boolean not null default true,
  is_published boolean not null default false,
  exam text not null default 'telc_b1',
  -- Which PDF pages were imported as images: stored as {id}/p-{pdf page number}.jpg
  structure jsonb not null,
  audio_path text check (char_length(audio_path) <= 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mock_paper_keys (
  paper_id uuid primary key references public.mock_papers (id) on delete cascade,
  -- {"1": "i", "2": "d", ..., "41": "+", "42": "-"}
  answers jsonb not null
);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  answers jsonb not null default '{}',
  writing text not null default '' check (char_length(writing) <= 6000),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  result jsonb
);

create index if not exists mock_attempts_user_idx on public.mock_attempts (user_id, paper_id, started_at desc);

alter table public.mock_papers enable row level security;
alter table public.mock_paper_keys enable row level security;
alter table public.mock_attempts enable row level security;

drop policy if exists "Logged-in users read published papers" on public.mock_papers;
create policy "Logged-in users read published papers" on public.mock_papers
  for select to authenticated
  using (is_published or (select private.is_content_admin()));

drop policy if exists "Admins add papers" on public.mock_papers;
create policy "Admins add papers" on public.mock_papers
  for insert to authenticated with check ((select private.is_content_admin()));

drop policy if exists "Admins change papers" on public.mock_papers;
create policy "Admins change papers" on public.mock_papers
  for update to authenticated
  using ((select private.is_content_admin())) with check ((select private.is_content_admin()));

drop policy if exists "Admins delete papers" on public.mock_papers;
create policy "Admins delete papers" on public.mock_papers
  for delete to authenticated using ((select private.is_content_admin()));

-- Answer keys: admins only. Students have no policy, so they can never read them.
drop policy if exists "Admins manage answer keys" on public.mock_paper_keys;
create policy "Admins manage answer keys" on public.mock_paper_keys
  for all to authenticated
  using ((select private.is_content_admin())) with check ((select private.is_content_admin()));

-- Attempts: a student sees and changes only their own, and only until they submit.
-- The result (score) is written by the server only.
drop policy if exists "Students read own attempts" on public.mock_attempts;
create policy "Students read own attempts" on public.mock_attempts
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students start own attempts" on public.mock_attempts;
create policy "Students start own attempts" on public.mock_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Students save own open attempts" on public.mock_attempts;
create policy "Students save own open attempts" on public.mock_attempts
  for update to authenticated
  using (user_id = (select auth.uid()) and submitted_at is null)
  with check (user_id = (select auth.uid()) and submitted_at is null);

revoke all on public.mock_attempts from anon, authenticated;
grant select on public.mock_attempts to authenticated;
grant insert (paper_id) on public.mock_attempts to authenticated;
grant update (answers, writing) on public.mock_attempts to authenticated;
revoke all on public.mock_paper_keys from anon;
revoke all on public.mock_papers from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mock-papers', 'mock-papers', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg'])
on conflict (id) do nothing;

drop policy if exists "Logged-in users can read mock papers" on storage.objects;
create policy "Logged-in users can read mock papers" on storage.objects
  for select to authenticated using (bucket_id = 'mock-papers');

drop policy if exists "Admins upload mock papers" on storage.objects;
create policy "Admins upload mock papers" on storage.objects
  for insert to authenticated with check (bucket_id = 'mock-papers' and (select private.is_content_admin()));

drop policy if exists "Admins replace mock papers" on storage.objects;
create policy "Admins replace mock papers" on storage.objects
  for update to authenticated
  using (bucket_id = 'mock-papers' and (select private.is_content_admin()))
  with check (bucket_id = 'mock-papers' and (select private.is_content_admin()));

drop policy if exists "Admins delete mock papers" on storage.objects;
create policy "Admins delete mock papers" on storage.objects
  for delete to authenticated using (bucket_id = 'mock-papers' and (select private.is_content_admin()));
