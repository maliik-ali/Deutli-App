-- Profiles, step 1 of the marketplace direction (26 Nov 2026).
-- Teacher profile: website, social links and up to 5 qualifications.
-- Academy (workspace) profile: tagline, about text, country, explanation languages, website and social links.
-- Only adds columns. Nothing is removed or changed, so it is safe to run on live data.
-- Who may write: a teacher edits their own teacher_profiles row (existing policy); academies have no write
-- policy for members, so the academy profile is written by the server with the secret key after an owner check.
-- Links are checked again when they are shown (https only, known sites only), so a value written around the app is never rendered as a link.

alter table public.teacher_profiles
  add column if not exists website_url text check (website_url is null or (char_length(website_url) <= 200 and website_url ~ '^https://[^[:space:]]+$')),
  add column if not exists social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object' and pg_column_size(social_links) <= 1500),
  add column if not exists qualifications text[] not null default '{}' check (cardinality(qualifications) <= 5);

alter table public.academies
  add column if not exists tagline text check (tagline is null or char_length(tagline) <= 120),
  add column if not exists about text check (about is null or char_length(about) <= 800),
  add column if not exists country text check (country is null or char_length(country) <= 60),
  add column if not exists languages text[] not null default '{}' check (cardinality(languages) <= 6),
  add column if not exists website_url text check (website_url is null or (char_length(website_url) <= 200 and website_url ~ '^https://[^[:space:]]+$')),
  add column if not exists social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object' and pg_column_size(social_links) <= 1500);
