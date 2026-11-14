-- 15) Advanced settings: students can pick any exam and level (Goethe / telc / ÖSD at A1–C2, DTZ, other).
-- profiles.exam keeps one id such as 'goethe_b2'. Existing B1 ids stay valid.
-- Safe to run more than once.

alter table public.profiles drop constraint if exists profiles_onboarding_check;
alter table public.profiles add constraint profiles_onboarding_check check (
  goals <@ array['citizenship','residence','family','ausbildung','university','job','integration','improve']::text[]
  and (exam is null or exam ~ '^(goethe|telc|oesd)_(a1|a2|b1|b2|c1|c2)$' or exam in ('dtz','other'))
  and (exam_timeline is null or exam_timeline in ('date','1m','3m','6m','unsure'))
  and focus_skills <@ array['lesen','hoeren','schreiben','sprechen','sprachbausteine','unsure']::text[]
);
