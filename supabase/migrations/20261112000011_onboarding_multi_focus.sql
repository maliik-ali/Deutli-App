-- 14) Onboarding changes:
--  - "What worries you most?" allows several answers: focus_skills (array) replaces focus_skill.
--  - Onboarding is only for new signups: everyone who already has an account is marked as done.
-- Safe to run more than once: the one-time part only runs while the old focus_skill column exists.

alter table public.profiles
  add column if not exists focus_skills text[] not null default '{}';

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'focus_skill') then
    update public.profiles set focus_skills = array[focus_skill] where focus_skill is not null;
    -- Accounts that exist today skip onboarding (it is meant for new signups).
    update public.profiles set onboarded_at = now() where onboarded_at is null;
    alter table public.profiles drop constraint if exists profiles_onboarding_check;
    alter table public.profiles drop column focus_skill;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_onboarding_check;
alter table public.profiles add constraint profiles_onboarding_check check (
  goals <@ array['citizenship','residence','family','ausbildung','university','job','integration','improve']::text[]
  and (exam is null or exam in ('goethe_b1','telc_b1','oesd_b1','dtz','other'))
  and (exam_timeline is null or exam_timeline in ('date','1m','3m','6m','unsure'))
  and focus_skills <@ array['lesen','hoeren','schreiben','sprechen','sprachbausteine','unsure']::text[]
);

grant update (full_name, phone, languages, avatar_path, goals, exam, exam_date, exam_timeline, focus_skills, email_tips, onboarded_at)
  on public.profiles to authenticated;
