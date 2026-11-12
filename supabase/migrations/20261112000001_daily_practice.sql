-- 4) Daily Practice: listen, read and speak along with a transcript
-- Admins add practice sets (e.g. "Im Büro") with tracks (a text + an audio file).
-- Students open a track, play the audio and read the text. Safe to run more than once.

create table if not exists public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 300),
  level text not null default 'B1' check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  is_published boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_tracks (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.practice_sets (id) on delete cascade,
  position integer not null default 1,
  title text not null check (char_length(title) between 1 and 160),
  transcript text not null check (char_length(transcript) between 1 and 20000),
  -- Path of the audio file in the private "practice-audio" storage bucket.
  audio_path text check (char_length(audio_path) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists practice_tracks_set_idx on public.practice_tracks (set_id, position);

-- One row per student, track and day: "I practised this text today".
create table if not exists public.practice_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  track_id uuid not null references public.practice_tracks (id) on delete cascade,
  practised_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id, practised_on)
);

create index if not exists practice_log_track_idx on public.practice_log (track_id);

alter table public.practice_sets enable row level security;
alter table public.practice_tracks enable row level security;
alter table public.practice_log enable row level security;

-- Who may manage practice content: academy admins and super admins.
create or replace function private.is_content_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid()))
      in ('academy_admin', 'super_admin'),
    false
  )
$$;

revoke all on function private.is_content_admin() from public, anon;
grant execute on function private.is_content_admin() to authenticated;

-- Table permissions. Logged-out visitors (anon) get nothing.
revoke all on public.practice_sets from anon, authenticated;
revoke all on public.practice_tracks from anon, authenticated;
revoke all on public.practice_log from anon, authenticated;

grant select, insert, update, delete on public.practice_sets to authenticated;
grant select, insert, update, delete on public.practice_tracks to authenticated;
grant select, insert, delete on public.practice_log to authenticated;

-- PRACTICE SETS ------------------------------------------------------------

drop policy if exists "Everyone logged in can read published sets" on public.practice_sets;
create policy "Everyone logged in can read published sets"
  on public.practice_sets for select
  to authenticated
  using (is_published or (select private.is_content_admin()));

drop policy if exists "Admins can add sets" on public.practice_sets;
create policy "Admins can add sets"
  on public.practice_sets for insert
  to authenticated
  with check ((select private.is_content_admin()));

drop policy if exists "Admins can change sets" on public.practice_sets;
create policy "Admins can change sets"
  on public.practice_sets for update
  to authenticated
  using ((select private.is_content_admin()))
  with check ((select private.is_content_admin()));

drop policy if exists "Admins can delete sets" on public.practice_sets;
create policy "Admins can delete sets"
  on public.practice_sets for delete
  to authenticated
  using ((select private.is_content_admin()));

-- PRACTICE TRACKS ----------------------------------------------------------

drop policy if exists "Everyone logged in can read tracks of published sets" on public.practice_tracks;
create policy "Everyone logged in can read tracks of published sets"
  on public.practice_tracks for select
  to authenticated
  using (
    (select private.is_content_admin())
    or exists (
      select 1 from public.practice_sets s
      where s.id = practice_tracks.set_id and s.is_published
    )
  );

drop policy if exists "Admins can add tracks" on public.practice_tracks;
create policy "Admins can add tracks"
  on public.practice_tracks for insert
  to authenticated
  with check ((select private.is_content_admin()));

drop policy if exists "Admins can change tracks" on public.practice_tracks;
create policy "Admins can change tracks"
  on public.practice_tracks for update
  to authenticated
  using ((select private.is_content_admin()))
  with check ((select private.is_content_admin()));

drop policy if exists "Admins can delete tracks" on public.practice_tracks;
create policy "Admins can delete tracks"
  on public.practice_tracks for delete
  to authenticated
  using ((select private.is_content_admin()));

-- PRACTICE LOG (each person sees and changes only their own rows) -----------

drop policy if exists "Users can read their own practice log" on public.practice_log;
create policy "Users can read their own practice log"
  on public.practice_log for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can add to their own practice log" on public.practice_log;
create policy "Users can add to their own practice log"
  on public.practice_log for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can remove from their own practice log" on public.practice_log;
create policy "Users can remove from their own practice log"
  on public.practice_log for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- AUDIO FILES --------------------------------------------------------------
-- Private bucket: files are only reachable through short-lived signed links
-- that the server creates for logged-in users. Max 50 MB per file, audio only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-audio', 'practice-audio', false, 52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']
)
on conflict (id) do nothing;

drop policy if exists "Logged-in users can listen to practice audio" on storage.objects;
create policy "Logged-in users can listen to practice audio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'practice-audio');

drop policy if exists "Admins can upload practice audio" on storage.objects;
create policy "Admins can upload practice audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'practice-audio' and (select private.is_content_admin()));

drop policy if exists "Admins can replace practice audio" on storage.objects;
create policy "Admins can replace practice audio"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'practice-audio' and (select private.is_content_admin()))
  with check (bucket_id = 'practice-audio' and (select private.is_content_admin()));

drop policy if exists "Admins can delete practice audio" on storage.objects;
create policy "Admins can delete practice audio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'practice-audio' and (select private.is_content_admin()));
