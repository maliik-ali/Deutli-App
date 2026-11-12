-- 13) Onboarding answers (asked once, right after signup).
-- Students can change their own answers (the existing update policy limits it to their own row).
-- Safe to run more than once.

alter table public.profiles
  add column if not exists goals text[] not null default '{}',
  add column if not exists exam text,
  add column if not exists exam_date date,
  add column if not exists exam_timeline text,
  add column if not exists focus_skill text,
  add column if not exists email_tips boolean not null default false,
  add column if not exists onboarded_at timestamptz;

alter table public.profiles drop constraint if exists profiles_onboarding_check;
alter table public.profiles add constraint profiles_onboarding_check check (
  goals <@ array['citizenship','residence','family','ausbildung','university','job','integration','improve']::text[]
  and (exam is null or exam in ('goethe_b1','telc_b1','oesd_b1','dtz','other'))
  and (exam_timeline is null or exam_timeline in ('date','1m','3m','6m','unsure'))
  and (focus_skill is null or focus_skill in ('lesen','hoeren','schreiben','sprechen','sprachbausteine','unsure'))
);

grant update (full_name, phone, languages, avatar_path, goals, exam, exam_date, exam_timeline, focus_skill, email_tips, onboarded_at)
  on public.profiles to authenticated;
