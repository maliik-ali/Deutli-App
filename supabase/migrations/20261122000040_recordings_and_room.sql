-- Lecture recording (YouTube link only) per class, and one saved room link per teacher.

alter table public.live_classes add column if not exists recording_url text
  check (recording_url is null or recording_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/');

-- The teacher's default Zoom/Meet room. New classes start with it. Private: only the teacher (and admins) can read it.
create table if not exists public.teacher_room_links (
  teacher_id uuid primary key references auth.users (id) on delete cascade,
  join_url text not null check (join_url ~ '^https://' and char_length(join_url) <= 500),
  passcode text check (char_length(passcode) <= 40),
  updated_at timestamptz not null default now()
);
alter table public.teacher_room_links enable row level security;
drop policy if exists "Teachers read their own room" on public.teacher_room_links;
create policy "Teachers read their own room" on public.teacher_room_links for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_content_admin()));
grant select on public.teacher_room_links to authenticated;
-- Writes: only the server, after the role check.
