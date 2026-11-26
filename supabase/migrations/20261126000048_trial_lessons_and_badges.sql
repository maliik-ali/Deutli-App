-- Trial lessons and reputation badges (marketplace step 5, 26 Nov 2026).
-- 1) A 1:1 slot can be marked as a trial lesson (one per student per teacher, checked by the server).
-- 2) "Verified by Deutli": a separate table that only the server (an admin action) can write, so a teacher can
--    never mark themselves verified. Every other badge is worked out from real data and stored nowhere.
-- Safe to run more than once.

alter table public.live_classes add column if not exists is_trial boolean not null default false;
create index if not exists live_classes_trial_idx on public.live_classes (teacher_id, is_trial) where is_trial;

create table if not exists public.teacher_verifications (
  teacher_id uuid primary key references auth.users (id) on delete cascade,
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users (id) on delete set null,
  note text check (note is null or char_length(note) <= 300)
);

alter table public.teacher_verifications enable row level security;
revoke all on public.teacher_verifications from anon, authenticated;
grant select on public.teacher_verifications to authenticated;

drop policy if exists "Anyone logged in sees who is verified" on public.teacher_verifications;
create policy "Anyone logged in sees who is verified" on public.teacher_verifications for select to authenticated using (true);
-- No insert, update or delete grants: only the server writes, after checking the caller is a Deutli admin.
