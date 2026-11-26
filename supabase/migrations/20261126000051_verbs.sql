-- German verbs with their forms (26 Nov 2026): Präsens (er/sie/es), Präteritum, Perfekt, the preposition and
-- case the verb takes, a meaning per language and one example sentence. Uploaded by admins (server, secret key);
-- every logged-in user can read. Each student's right/wrong counts live in verb_progress (own rows only).
-- Safe to run more than once.

create table if not exists public.verbs (
  id uuid primary key default gen_random_uuid(),
  -- lower-case "infinitive|preposition|case|english": one row per meaning of a verb
  verb_key text not null unique,
  german text not null check (char_length(german) between 1 and 40),
  praesens text check (praesens is null or char_length(praesens) <= 60),
  praeteritum text check (praeteritum is null or char_length(praeteritum) <= 60),
  perfekt text check (perfekt is null or char_length(perfekt) <= 60),
  preposition text check (preposition is null or char_length(preposition) <= 20),
  verb_case text check (verb_case is null or char_length(verb_case) <= 20),
  translations jsonb not null default '{}'::jsonb,
  example_de text check (example_de is null or char_length(example_de) <= 300),
  example_translations jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists verbs_order_idx on public.verbs (position);

create table if not exists public.verb_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  verb_id uuid not null references public.verbs (id) on delete cascade,
  right_count integer not null default 0,
  wrong_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, verb_id)
);

alter table public.verbs enable row level security;
alter table public.verb_progress enable row level security;
revoke all on public.verbs from anon, authenticated;
revoke all on public.verb_progress from anon, authenticated;
grant select on public.verbs to authenticated;
grant select, insert, update on public.verb_progress to authenticated;

drop policy if exists "Logged-in users can read verbs" on public.verbs;
create policy "Logged-in users can read verbs" on public.verbs for select to authenticated using (true);

drop policy if exists "Students read their own verb progress" on public.verb_progress;
create policy "Students read their own verb progress" on public.verb_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Students add their own verb progress" on public.verb_progress;
create policy "Students add their own verb progress" on public.verb_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Students update their own verb progress" on public.verb_progress;
create policy "Students update their own verb progress" on public.verb_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Verbs themselves are written only by the server (admin upload), never by a logged-in user.
