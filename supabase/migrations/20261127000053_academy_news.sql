-- School news and information (27 Nov 2026).
-- The owner or an admin of a workspace (a solo teacher is the owner of their own) posts to ALL students of that
-- workspace: "news" (dated: a new batch, an event) and "info" (fixed pages: rules, books to buy, fees, contact).
-- Students of the workspace read them; who is allowed to write is checked on the server (secret key).
-- academy_post_reads remembers which posts a student has opened (for the unread dot and count).
-- Safe to run more than once.

create table if not exists public.academy_posts (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('news', 'info')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists academy_posts_academy_idx on public.academy_posts (academy_id, kind, created_at desc);

create table if not exists public.academy_post_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.academy_posts (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.academy_posts enable row level security;
alter table public.academy_post_reads enable row level security;
revoke all on public.academy_posts from anon, authenticated;
revoke all on public.academy_post_reads from anon, authenticated;
grant select on public.academy_posts to authenticated;
grant select, insert on public.academy_post_reads to authenticated;

drop policy if exists "Students and members of the workspace read its posts" on public.academy_posts;
create policy "Students and members of the workspace read its posts" on public.academy_posts for select to authenticated
  using (
    academy_id = (select private.current_user_academy_id())
    or (select private.is_academy_member(academy_id))
    or (select private.is_content_admin())
  );
-- No insert, update or delete grants on posts: only the server writes, after checking the caller owns or administers the workspace.

drop policy if exists "Read your own post reads" on public.academy_post_reads;
create policy "Read your own post reads" on public.academy_post_reads for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Mark a post of your workspace as read" on public.academy_post_reads;
create policy "Mark a post of your workspace as read" on public.academy_post_reads for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.academy_posts p where p.id = post_id)
  );
