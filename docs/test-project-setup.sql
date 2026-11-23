
-- ===== 20261102000001_academies_and_profiles.sql =====
-- 1) Tables: academies and profiles
-- Run this first. Safe to run more than once.

do $$ begin
  create type public.app_role as enum ('student', 'teacher', 'academy_admin', 'super_admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 30),
  role public.app_role not null default 'student',
  academy_id uuid references public.academies (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_academy_id_idx on public.profiles (academy_id);
create index if not exists profiles_role_idx on public.profiles (role);

-- Row Level Security ON. With RLS on and no policy, nobody can read or write.
alter table public.academies enable row level security;
alter table public.profiles enable row level security;

-- ===== 20261102000002_rls_policies.sql =====
-- 2) Security: helper functions, column permissions and RLS policies
-- Run this second. Safe to run more than once.

-- Helper functions live in a "private" schema that the public API cannot call.
-- They are SECURITY DEFINER so policies on profiles can look up the caller's
-- role without triggering the same policies again (avoids infinite recursion).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.current_user_academy_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academy_id from public.profiles where id = (select auth.uid())
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.current_user_academy_id() from public, anon;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.current_user_academy_id() to authenticated;

-- Table permissions. Logged-out visitors (anon) get nothing.
revoke all on public.profiles from anon, authenticated;
revoke all on public.academies from anon, authenticated;

grant select on public.profiles to authenticated;
-- Users may only ever change these two columns. role and academy_id are
-- not in the list, so a student can never promote themselves.
grant update (full_name, phone) on public.profiles to authenticated;
grant select on public.academies to authenticated;

-- PROFILES -----------------------------------------------------------------

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Academy admins can read profiles in their academy" on public.profiles;
create policy "Academy admins can read profiles in their academy"
  on public.profiles for select
  to authenticated
  using (
    (select private.current_user_role()) = 'academy_admin'
    and academy_id is not null
    and academy_id = (select private.current_user_academy_id())
  );

drop policy if exists "Super admins can read all profiles" on public.profiles;
create policy "Super admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select private.current_user_role()) = 'super_admin');

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Extra safety net: even if column permissions are changed by mistake later,
-- block any logged-in user from changing role or academy through the API.
-- (Changes made in the Supabase dashboard / SQL editor are not affected.)
create or replace function private.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (new.role is distinct from old.role
          or new.academy_id is distinct from old.academy_id) then
    raise exception 'You are not allowed to change role or academy.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function private.prevent_role_change();

-- ACADEMIES ----------------------------------------------------------------

drop policy if exists "Members can read their own academy" on public.academies;
create policy "Members can read their own academy"
  on public.academies for select
  to authenticated
  using (id = (select private.current_user_academy_id()));

drop policy if exists "Super admins can read all academies" on public.academies;
create policy "Super admins can read all academies"
  on public.academies for select
  to authenticated
  using ((select private.current_user_role()) = 'super_admin');

-- ===== 20261102000003_handle_new_user.sql =====
-- 3) Create a profile automatically when someone signs up
-- Run this third. Safe to run more than once.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role is always 'student' here. We never read a role from signup data,
  -- so nobody can sign themselves up as a teacher or admin.
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ===== 20261112000001_daily_practice.sql =====
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

-- ===== 20261112000002_daily_practice_sample.sql =====
-- 5) Sample practice set (original Deutli text, no audio yet)
-- So the Daily Practice page is not empty. Add audio in Admin -> Daily Practice,
-- or delete the set there. Runs only if there are no practice sets yet.

do $$
declare
  new_set uuid;
begin
  if exists (select 1 from public.practice_sets) then
    return;
  end if;

  insert into public.practice_sets (title, description, level, is_published, created_by)
  values ('Sample: Im Büro', 'Three short office dialogues to try the method.', 'B1', true, null)
  returning id into new_set;

  insert into public.practice_tracks (set_id, position, title, transcript) values
  (new_set, 1, 'Der erste Tag',
   E'Jana: Guten Morgen! Sie sind bestimmt Herr Malik, oder?\nHerr Malik: Ja, genau. Heute ist mein erster Tag.\nJana: Herzlich willkommen! Ich bin Jana aus dem Marketing. Ich zeige Ihnen kurz das Büro.\nHerr Malik: Das ist sehr nett, vielen Dank.\nJana: Hier vorne ist die Küche. Kaffee und Tee sind für alle kostenlos.\nHerr Malik: Wunderbar. Und wo ist mein Arbeitsplatz?\nJana: Gleich hier am Fenster. Der Computer ist schon eingerichtet.\nHerr Malik: Perfekt. Wann beginnt die Besprechung mit dem Team?\nJana: Um zehn Uhr im großen Raum. Ich hole Sie kurz vorher ab.'),
  (new_set, 2, 'Einen Termin verschieben',
   E'Frau Keller: Keller, guten Tag.\nHerr Aydin: Guten Tag, Frau Keller, hier spricht Aydin. Es geht um unseren Termin am Donnerstag.\nFrau Keller: Ja, um vierzehn Uhr, richtig?\nHerr Aydin: Genau. Leider muss ich den Termin verschieben, weil ich an dem Tag in Hamburg bin.\nFrau Keller: Das ist kein Problem. Wann passt es Ihnen besser?\nHerr Aydin: Hätten Sie am Freitagvormittag Zeit?\nFrau Keller: Am Freitag kann ich erst ab elf Uhr.\nHerr Aydin: Elf Uhr passt mir gut. Dann sehen wir uns am Freitag.\nFrau Keller: Sehr gern. Ich schicke Ihnen gleich eine neue Einladung.\nHerr Aydin: Vielen Dank und auf Wiederhören!'),
  (new_set, 3, 'Ein Problem mit dem Drucker',
   E'Tom: Sag mal, funktioniert der Drucker bei dir?\nSara: Nein, schon seit heute Morgen nicht mehr. Er zeigt immer einen Fehler an.\nTom: Hast du ihn schon aus- und wieder eingeschaltet?\nSara: Ja, zweimal. Das hat leider nichts gebracht.\nTom: Dann rufe ich die Technik an. Ich brauche den Vertrag bis zwölf Uhr auf Papier.\nSara: Du kannst auch den Drucker im zweiten Stock benutzen.\nTom: Gute Idee, daran habe ich gar nicht gedacht.\nSara: Ich komme mit, ich muss auch etwas ausdrucken.');
end $$;

-- ===== 20261112000003_vocabulary_words.sql =====
-- 6) Vocabulary: words a student saves while reading (Daily Practice)
-- Each person has their own list. The Vocabulary page will use the same table.
-- Safe to run more than once.

create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The word or short phrase exactly as the student selected it.
  word text not null check (char_length(word) between 1 and 80),
  -- What it means (the student can add this later).
  meaning text check (char_length(meaning) <= 200),
  -- The sentence it was found in, so it can be shown as an example.
  context text check (char_length(context) <= 500),
  track_id uuid references public.practice_tracks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_words_user_idx on public.vocabulary_words (user_id, created_at desc);
create index if not exists vocabulary_words_track_idx on public.vocabulary_words (track_id);
-- The same word is saved only once per person (ignoring capital letters).
create unique index if not exists vocabulary_words_unique_idx on public.vocabulary_words (user_id, lower(word));

alter table public.vocabulary_words enable row level security;

revoke all on public.vocabulary_words from anon, authenticated;
grant select, insert, delete on public.vocabulary_words to authenticated;
-- Only the meaning can be changed after saving.
grant update (meaning) on public.vocabulary_words to authenticated;

drop policy if exists "Users can read their own words" on public.vocabulary_words;
create policy "Users can read their own words"
  on public.vocabulary_words for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can save their own words" on public.vocabulary_words;
create policy "Users can save their own words"
  on public.vocabulary_words for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can change their own words" on public.vocabulary_words;
create policy "Users can change their own words"
  on public.vocabulary_words for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own words" on public.vocabulary_words;
create policy "Users can delete their own words"
  on public.vocabulary_words for delete to authenticated
  using (user_id = (select auth.uid()));

-- ===== 20261112000004_vocabulary_urdu_meaning.sql =====
-- 7) Vocabulary: a separate Urdu meaning next to the English one.
-- "meaning" stays the English meaning; "meaning_ur" is the Urdu meaning (shown in Nastaliq).
-- Safe to run more than once.

alter table public.vocabulary_words
  add column if not exists meaning_ur text check (char_length(meaning_ur) <= 200);

-- Only the meanings can be changed after saving.
grant update (meaning, meaning_ur) on public.vocabulary_words to authenticated;

-- ===== 20261112000005_word_languages.sql =====
-- 8) Meanings in each student's own languages (auto-translated).
-- profiles.languages: the languages a student wants meanings in (1 to 3, e.g. {en,ur}).
-- vocabulary_words.translations: meanings by language code, e.g. {"en": "work area", "ur": "کام کی جگہ"}.
-- vocabulary_words.dictionary_form: the word as in a dictionary, e.g. "der Arbeitsbereich".
-- Safe to run more than once.

-- Languages on the profile ---------------------------------------------------
alter table public.profiles
  add column if not exists languages text[] not null default '{en}';

alter table public.profiles drop constraint if exists profiles_languages_check;
alter table public.profiles add constraint profiles_languages_check check (
  cardinality(languages) between 1 and 3
  and languages <@ array['en','ur','hi','ar','fa','ps','bn','tr','es','fr','it','pt','ru','zh']::text[]
);

-- Students may change their own languages (the existing update policy limits it to their own row).
grant update (full_name, phone, languages) on public.profiles to authenticated;

-- Meanings on saved words ----------------------------------------------------
alter table public.vocabulary_words
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists dictionary_form text check (char_length(dictionary_form) <= 120);

alter table public.vocabulary_words drop constraint if exists vocabulary_words_translations_check;
alter table public.vocabulary_words add constraint vocabulary_words_translations_check check (
  jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 4000
);

-- Move meanings typed earlier into the new column, then remove the old columns.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vocabulary_words' and column_name = 'meaning') then
    update public.vocabulary_words
      set translations = translations
        || case when meaning is not null then jsonb_build_object('en', meaning) else '{}'::jsonb end
        || case when meaning_ur is not null then jsonb_build_object('ur', meaning_ur) else '{}'::jsonb end
      where meaning is not null or meaning_ur is not null;
    alter table public.vocabulary_words drop column meaning;
    alter table public.vocabulary_words drop column if exists meaning_ur;
  end if;
end $$;

-- Only the meanings and the dictionary form can be changed after saving.
revoke update on public.vocabulary_words from authenticated;
grant update (translations, dictionary_form) on public.vocabulary_words to authenticated;

-- ===== 20261112000006_word_dictionary.sql =====
-- 9) Shared word dictionary + daily translation limit.
-- word_dictionary: each German word is translated by AI only once; every student reuses it.
--   Only the server (secret key) writes here, so students cannot change shared meanings.
-- translation_usage: how many AI translations each student used per day (Pakistan date).
-- Safe to run more than once.

create table if not exists public.word_dictionary (
  -- The word in lower case, e.g. "arbeitsbereiche".
  word_key text primary key check (char_length(word_key) between 1 and 80),
  dictionary_form text check (char_length(dictionary_form) <= 120),
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.word_dictionary enable row level security;
revoke all on public.word_dictionary from anon, authenticated;
grant select on public.word_dictionary to authenticated;

drop policy if exists "Logged-in users can read the dictionary" on public.word_dictionary;
create policy "Logged-in users can read the dictionary"
  on public.word_dictionary for select to authenticated
  using (true);
-- No insert/update/delete policies: only the server's secret key (which bypasses RLS) writes.

create table if not exists public.translation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day)
);

alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from anon, authenticated;
grant select on public.translation_usage to authenticated;

drop policy if exists "Users can read their own usage" on public.translation_usage;
create policy "Users can read their own usage"
  on public.translation_usage for select to authenticated
  using (user_id = (select auth.uid()));
-- No write policies: only the server counts usage, through the function below.

-- Counts one AI translation for a student, if they are under the daily limit.
-- Returns true when allowed. Only the server (service_role) may call it.
create or replace function public.use_translation(p_user uuid, p_day date, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_used integer;
begin
  insert into public.translation_usage as u (user_id, day, used)
  values (p_user, p_day, 1)
  on conflict (user_id, day) do update set used = u.used + 1
    where u.used < p_limit
  returning u.used into new_used;
  return new_used is not null;
end;
$$;

revoke all on function public.use_translation(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.use_translation(uuid, date, integer) to service_role;

-- ===== 20261112000007_word_dictionary_source.sql =====
-- 10) Where a dictionary entry came from: 'sheet' (uploaded by an admin, checked) or 'ai'.
-- Sheet meanings always win; AI only fills languages that are still missing.
-- Safe to run more than once.

alter table public.word_dictionary
  add column if not exists source text not null default 'ai' check (source in ('ai', 'sheet'));

create index if not exists word_dictionary_updated_idx on public.word_dictionary (updated_at desc);

-- ===== 20261112000008_profile_avatars.sql =====
-- 11) Profile pictures.
-- Private bucket "avatars": each user has a folder named after their user id.
-- Users can only add, replace or delete files in their own folder.
-- Any logged-in user may view avatars (teachers and classmates will see them later),
-- always through short-lived signed links created by the server. Never public.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists avatar_path text check (char_length(avatar_path) <= 200);

-- Users may change their own photo (the existing update policy limits it to their own row).
grant update (full_name, phone, languages, avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Logged-in users can view avatars" on storage.objects;
create policy "Logged-in users can view avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===== 20261112000009_vocabulary_review.sql =====
-- 12) Vocabulary page: mark words and review them with spaced repetition.
-- box: 0 = new … 5 = learned. A right answer moves the word up a box and sets the
-- next review further away (1, 3, 7, 14, 30 days); a wrong answer sends it back to box 0.
-- due_on: the day (Pakistan date) the word should be reviewed next.
-- Safe to run more than once.

alter table public.vocabulary_words
  add column if not exists starred boolean not null default false,
  add column if not exists box smallint not null default 0 check (box between 0 and 5),
  add column if not exists due_on date not null default current_date,
  add column if not exists reviewed_at timestamptz,
  add column if not exists right_count integer not null default 0 check (right_count >= 0),
  add column if not exists wrong_count integer not null default 0 check (wrong_count >= 0);

create index if not exists vocabulary_words_due_idx on public.vocabulary_words (user_id, due_on);

-- Students may change their own review progress and marks (RLS limits it to their own rows).
grant update (translations, dictionary_form, starred, box, due_on, reviewed_at, right_count, wrong_count)
  on public.vocabulary_words to authenticated;

-- ===== 20261112000010_onboarding.sql =====
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

-- ===== 20261112000011_onboarding_multi_focus.sql =====
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

-- ===== 20261114000012_exam_choice.sql =====
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

-- ===== 20261114000013_mock_papers.sql =====
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

-- ===== 20261114000014_cover_options.sql =====
-- 17) Mock covers: more gradient colours and an optional cover photo per paper.
-- Safe to run more than once.

alter table public.mock_papers add column if not exists cover_path text check (char_length(cover_path) <= 300);

alter table public.mock_papers drop constraint if exists mock_papers_tone_check;
alter table public.mock_papers add constraint mock_papers_tone_check
  check (tone in ('navy', 'violet', 'teal', 'indigo', 'plum', 'forest', 'ocean'));

-- ===== 20261115000015_writing_feedback.sql =====
-- AI + teacher feedback on the written part (Schriftlicher Ausdruck) of a mock exam.
-- The server writes rows (secret key); students can only read their own.
-- Also: the task text of the writing part, so the AI can judge "task completion".

alter table public.mock_papers
  add column if not exists writing_task text not null default '' check (char_length(writing_task) <= 4000);

create table if not exists public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mock_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null default '',
  -- [{id: "task"|"communication"|"accuracy", score, max, note}]
  criteria jsonb not null default '[]',
  -- [{start, end, type, message, fix, source}]
  mistakes jsonb not null default '[]',
  provider text not null default '',
  model text not null default '',
  -- How many AI checks were used for this attempt (limit is 2 = one check + one retry).
  checks_used int not null default 1 check (checks_used between 1 and 2),
  teacher_status text not null default 'pending' check (teacher_status in ('pending', 'confirmed', 'changed')),
  teacher_total numeric check (teacher_total between 0 and 45),
  teacher_comment text check (char_length(teacher_comment) <= 2000),
  teacher_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists writing_feedback_user_idx on public.writing_feedback (user_id, created_at desc);

alter table public.writing_feedback enable row level security;

drop policy if exists "Students read own writing feedback" on public.writing_feedback;
create policy "Students read own writing feedback" on public.writing_feedback
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins read all writing feedback" on public.writing_feedback;
create policy "Admins read all writing feedback" on public.writing_feedback
  for select to authenticated using ((select private.is_content_admin()));

-- No insert/update/delete policy on purpose: only the server (secret key) writes here.
revoke all on public.writing_feedback from anon, authenticated;
grant select on public.writing_feedback to authenticated;

-- ===== 20261115000016_teacher_reviews.sql =====
-- Teacher link + teacher checks of the written part.
--  * profiles.teacher_id: the student's own teacher (set by the server only; not in any update grant).
--  * profiles.teacher_code: a short code a teacher gives to students so they can send emails to them.
--  * writing_reviews: one teacher check per attempt (requested -> done). The teacher's score lives here.

alter table public.profiles add column if not exists teacher_id uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists teacher_code text unique check (teacher_code ~ '^[A-Z0-9]{6}$');
create index if not exists profiles_teacher_id_idx on public.profiles (teacher_id);

-- The teacher's decision now lives in writing_reviews (these columns were never used).
alter table public.writing_feedback
  drop column if exists teacher_status,
  drop column if exists teacher_total,
  drop column if exists teacher_comment,
  drop column if exists teacher_id;

create table if not exists public.writing_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mock_attempts (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  -- null = open request (a standalone student asked for a teacher check; any teacher may take it)
  teacher_id uuid references public.profiles (id) on delete set null,
  -- assigned = student's own teacher, code = sent with a teacher code, offer = standalone student asked for a teacher
  source text not null check (source in ('assigned', 'code', 'offer')),
  status text not null default 'requested' check (status in ('requested', 'done')),
  -- [{id: "task"|"communication"|"accuracy", score, max}]
  criteria jsonb not null default '[]',
  total numeric check (total between 0 and 45),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists writing_reviews_teacher_idx on public.writing_reviews (teacher_id, status, created_at desc);
create index if not exists writing_reviews_student_idx on public.writing_reviews (student_id);

alter table public.writing_reviews enable row level security;

drop policy if exists "Students read own writing reviews" on public.writing_reviews;
create policy "Students read own writing reviews" on public.writing_reviews
  for select to authenticated using (student_id = (select auth.uid()));

drop policy if exists "Teachers read their writing reviews" on public.writing_reviews;
create policy "Teachers read their writing reviews" on public.writing_reviews
  for select to authenticated using (teacher_id = (select auth.uid()));

drop policy if exists "Admins read all writing reviews" on public.writing_reviews;
create policy "Admins read all writing reviews" on public.writing_reviews
  for select to authenticated using ((select private.is_content_admin()));

-- Only the server (secret key) creates and changes reviews, after checking roles in code.
revoke all on public.writing_reviews from anon, authenticated;
grant select on public.writing_reviews to authenticated;

-- ===== 20261115000017_paper_text.sql =====
-- Selectable text for the paper pages (so students can select a word to translate and save it).
-- Filled by the admin's browser from the PDF's text layer: { "<page>": [ { s: text, x, y, w, h } ] }, positions as fractions of the page.
-- Only the exam pages the admin chose are included, never the answer pages. Same read rules as the rest of mock_papers.
alter table public.mock_papers add column if not exists page_text jsonb;

-- ===== 20261115000018_social_login_names.sql =====
-- Google and Apple sign-in: take the name from the provider (full_name or name) when there is no signup form.
-- The role is still always 'student' here.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), 120), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), '')
  );
  return new;
end;
$$;

-- ===== 20261115000019_pro_requests.sql =====
-- "I want Deutli Pro" requests. There is no payment yet: the academy contacts the student with the price and how to pay.
create table if not exists public.pro_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

alter table public.pro_requests enable row level security;

drop policy if exists "Students read own pro request" on public.pro_requests;
create policy "Students read own pro request" on public.pro_requests
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students create own pro request" on public.pro_requests;
create policy "Students create own pro request" on public.pro_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Admins read all pro requests" on public.pro_requests;
create policy "Admins read all pro requests" on public.pro_requests
  for select to authenticated using ((select private.is_content_admin()));

grant select, insert on public.pro_requests to authenticated;

-- ===== 20261115000020_payments.sql =====
-- Deutli Pro payments (no card data is ever stored here).
-- Plans and the bank/wallet accounts are set by an admin. Orders are created and changed only by the server (secret key).

alter table public.profiles add column if not exists pro_until date;
-- Students can never set this themselves: update is only granted on named columns (pro_until is not one of them).

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  months int not null check (months between 1 and 36),
  price_pkr int not null check (price_pkr >= 0),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),          -- "HBL", "EasyPaisa", "JazzCash"
  account_title text not null check (char_length(account_title) <= 120),
  account_number text not null check (char_length(account_number) <= 60),
  note text check (char_length(note) <= 300),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  plan_name text not null,
  months int not null,
  amount_pkr int not null,
  method text not null check (method in ('card', 'bank_wallet')),
  status text not null default 'pending' check (status in ('pending', 'awaiting_review', 'paid', 'rejected', 'cancelled')),
  reference text not null unique,
  txn_id text check (char_length(txn_id) <= 80),
  payer_note text check (char_length(payer_note) <= 300),
  admin_note text check (char_length(admin_note) <= 300),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at);

alter table public.plans enable row level security;
alter table public.payment_accounts enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Anyone logged in sees active plans" on public.plans;
create policy "Anyone logged in sees active plans" on public.plans for select to authenticated using (active or (select private.is_content_admin()));

drop policy if exists "Anyone logged in sees active accounts" on public.payment_accounts;
create policy "Anyone logged in sees active accounts" on public.payment_accounts for select to authenticated using (active or (select private.is_content_admin()));

drop policy if exists "Students read own orders" on public.orders;
create policy "Students read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders" on public.orders for select to authenticated using ((select private.is_content_admin()));

grant select on public.plans, public.payment_accounts, public.orders to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking the role.

-- ===== 20261115000021_orders_stripe.sql =====
-- Card payments through Stripe Checkout: remember the Checkout session of an order.
alter table public.orders add column if not exists stripe_session_id text unique;

-- ===== 20261115000022_timer_and_feedback.sql =====
-- 1) Section timers survive a reload: the seconds spent per section are saved with the attempt.
alter table public.mock_attempts add column if not exists timer jsonb not null default '{}';
grant update (answers, writing, timer) on public.mock_attempts to authenticated;

-- 2) "How hard was the real exam compared to this mock?" (one answer per attempt)
create table if not exists public.mock_feedback (
  attempt_id uuid primary key references public.mock_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  difficulty text not null check (difficulty in ('much_easier', 'easier', 'same', 'harder', 'much_harder', 'not_taken')),
  created_at timestamptz not null default now()
);
alter table public.mock_feedback enable row level security;

drop policy if exists "Students read own mock feedback" on public.mock_feedback;
create policy "Students read own mock feedback" on public.mock_feedback for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students give feedback on own attempts" on public.mock_feedback;
create policy "Students give feedback on own attempts" on public.mock_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

drop policy if exists "Admins read all mock feedback" on public.mock_feedback;
create policy "Admins read all mock feedback" on public.mock_feedback for select to authenticated using ((select private.is_content_admin()));

grant select, insert on public.mock_feedback to authenticated;

-- ===== 20261115000023_answer_explanations.sql =====
-- "Why is this right?" explanations for mock paper questions. Written once by the AI, then shared by every student.
-- Only the server reads and writes this table (secret key), and only after a student has submitted the exam,
-- so no policy is given to students: nobody can read answers early.
create table if not exists public.answer_explanations (
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  question int not null check (question between 1 and 120),
  en text not null,
  ur text not null default '',
  model text not null default '',
  created_at timestamptz not null default now(),
  primary key (paper_id, question)
);
alter table public.answer_explanations enable row level security;

drop policy if exists "Admins read explanations" on public.answer_explanations;
create policy "Admins read explanations" on public.answer_explanations for select to authenticated using ((select private.is_content_admin()));

-- ===== 20261117000024_level_words.sql =====
-- 24) Level vocabulary (A1, A2, B1): word lists the admin uploads as CSV.
-- Students pick a level on the Vocabulary page, learn the words topic by topic
-- in small lessons, and review them with the same spaced repetition as saved words.
-- A student's progress on a level word is a normal row in vocabulary_words
-- (matched by the German word), with source = 'level'.
-- Safe to run more than once.

create table if not exists public.level_words (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('a1', 'a2', 'b1')),
  -- Order in the list (the order of the sheet). Lessons follow this order.
  position integer not null default 0,
  -- Topic / category, e.g. "Kapitel 1 · Hallo" or "Wohnen". Lessons stay inside one topic.
  topic text check (char_length(topic) <= 80),
  german text not null check (char_length(german) between 1 and 80),
  -- The German word in lower case; one entry per word and level.
  word_key text not null check (char_length(word_key) between 1 and 80),
  article text check (article in ('der', 'die', 'das')),
  plural text check (char_length(plural) <= 80),
  -- Meanings by language code, e.g. {"en": "name", "ur": "نام"}.
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 8000),
  -- Example sentences by language code, e.g. {"de": "Wie ist Ihr Name?", "en": "What is your name?"}.
  examples jsonb not null default '{}'::jsonb
    check (jsonb_typeof(examples) = 'object' and pg_column_size(examples) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.level_words drop constraint if exists level_words_level_word_key;
alter table public.level_words add constraint level_words_level_word_key unique (level, word_key);
create index if not exists level_words_order_idx on public.level_words (level, position);

alter table public.level_words enable row level security;
revoke all on public.level_words from anon, authenticated;
grant select on public.level_words to authenticated;

drop policy if exists "Logged-in users can read level words" on public.level_words;
create policy "Logged-in users can read level words"
  on public.level_words for select to authenticated
  using (true);
-- No insert/update/delete policies: only the server's secret key (admin upload) writes.

-- Where a student's word came from: 'reading' (saved in Improve Accent) or 'level' (learned from a level list).
alter table public.vocabulary_words
  add column if not exists source text not null default 'reading' check (source in ('reading', 'level'));

-- ===== 20261117000025_level_topics.sql =====
-- 25) Topics (categories) for the A1/A2/B1 word lists, e.g. "Kennenlernen", "Essen und Trinken".
-- Students learn a level topic by topic, in the topics' order. Words without a topic are
-- shown in sets of 50 until they get one.
-- Safe to run more than once.

create table if not exists public.level_topics (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('a1', 'a2', 'b1')),
  -- Order of the topic inside the level (lessons follow it).
  position integer not null default 0,
  -- The topic name as students see it, e.g. "Kennenlernen".
  name text not null check (char_length(name) between 1 and 80),
  -- The name in other languages, e.g. {"en": "Getting to know each other", "ur": "تعارف"}.
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint level_topics_level_name_key unique (level, name)
);

create index if not exists level_topics_order_idx on public.level_topics (level, position);

alter table public.level_topics enable row level security;
revoke all on public.level_topics from anon, authenticated;
grant select on public.level_topics to authenticated;

drop policy if exists "Logged-in users can read level topics" on public.level_topics;
create policy "Logged-in users can read level topics"
  on public.level_topics for select to authenticated
  using (true);
-- No write policies: only the server's secret key (admin upload) writes.

-- Each word points to its topic. (The old free-text column level_words.topic is no longer used.)
alter table public.level_words
  add column if not exists topic_id uuid references public.level_topics (id) on delete set null;
create index if not exists level_words_topic_idx on public.level_words (topic_id);

-- ===== 20261117000026_profile_time_zone.sql =====
-- 26) Each user's own time zone (IANA name, e.g. "Europe/Berlin", "Asia/Karachi").
-- Detected from the device on first visit; the student can change it on the Account page.
-- "Today" (streaks, words due, daily AI limit), the greeting, countdowns and dates use it.
-- Empty = not detected yet (the app then uses Pakistan time, as before).
-- Safe to run more than once.

alter table public.profiles
  add column if not exists time_zone text check (time_zone is null or char_length(time_zone) between 1 and 64);

-- Users may set their own time zone (RLS already limits updates to their own row).
grant update (time_zone) on public.profiles to authenticated;

-- ===== 20261118000027_keep_orders_on_account_delete.sql =====
-- Account deletion: paid orders must be kept for the legal retention period
-- (German tax law, §147 AO; GDPR Art. 17(3)(b) allows this). When a user is
-- deleted, their orders stay but lose the link to the person (user_id = null).
-- Unpaid orders are removed by the delete-account action before the user is deleted.

alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;

-- ===== 20261118000028_google_photo_checked.sql =====
-- Google sign-in: the Google profile photo is copied once into the user's Deutli photo.
-- This column remembers that we tried, so a photo the user removed is never brought back.
-- Only the server (secret key) writes it; users have no update grant on it.

alter table public.profiles add column if not exists google_photo_checked_at timestamptz;

-- ===== 20261118000029_live_classes.sql =====
-- Live classes: teacher profiles, classes, Zoom links, registrations.
--  * teacher_profiles: what students see about a teacher (headline, bio, topics).
--  * live_classes: one row per class session. "Course" = course_title; what a teacher teaches
--    right now is worked out from their upcoming classes (never goes stale).
--  * live_class_links: the Zoom (or Meet/Teams) link, kept apart so students can never read it
--    directly. The server hands it out only to registered students shortly before the class.
--  * class_registrations: who signed up, joined, attended and how they rated the class.
-- Students never write these rows directly: the server does it with the secret key.

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 1200),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 6),
  speaks text[] not null default '{}' check (cardinality(speaks) <= 6),
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  -- Reserved for selling Deutli to several academies later; not used yet.
  academy_id uuid references public.academies (id) on delete set null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  course_title text not null check (char_length(course_title) between 2 and 80),
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 300),
  syllabus text check (char_length(syllabus) <= 3000),
  skill text not null default 'general'
    check (skill in ('general', 'reading', 'listening', 'writing', 'speaking', 'grammar', 'vocabulary')),
  level text not null default 'b1' check (level in ('all', 'a1', 'a2', 'b1', 'b2')),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 240),
  capacity int check (capacity is null or capacity between 1 and 500),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_classes_starts_idx on public.live_classes (starts_at);
create index if not exists live_classes_teacher_idx on public.live_classes (teacher_id, starts_at);

create table if not exists public.live_class_links (
  class_id uuid primary key references public.live_classes (id) on delete cascade,
  join_url text not null check (join_url ~* '^https://' and char_length(join_url) <= 500),
  passcode text check (char_length(passcode) <= 40)
);

create table if not exists public.class_registrations (
  class_id uuid not null references public.live_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled')),
  registered_at timestamptz not null default now(),
  joined_at timestamptz,
  attended boolean,
  rating smallint check (rating between 1 and 5),
  primary key (class_id, user_id)
);
create index if not exists class_registrations_user_idx on public.class_registrations (user_id, status);

alter table public.teacher_profiles enable row level security;
alter table public.live_classes enable row level security;
alter table public.live_class_links enable row level security;
alter table public.class_registrations enable row level security;

-- Teacher profiles: everyone logged in sees public ones; a teacher edits their own; admins edit all.
drop policy if exists "See public teacher profiles" on public.teacher_profiles;
create policy "See public teacher profiles" on public.teacher_profiles for select to authenticated
  using (is_public or user_id = (select auth.uid()) or (select private.is_content_admin()));

drop policy if exists "Teachers add their own profile" on public.teacher_profiles;
create policy "Teachers add their own profile" on public.teacher_profiles for insert to authenticated
  with check (
    (select private.is_content_admin())
    or (user_id = (select auth.uid()) and (select private.current_user_role()) = 'teacher')
  );

drop policy if exists "Teachers edit their own profile" on public.teacher_profiles;
create policy "Teachers edit their own profile" on public.teacher_profiles for update to authenticated
  using ((select private.is_content_admin()) or user_id = (select auth.uid()))
  with check ((select private.is_content_admin()) or user_id = (select auth.uid()));

-- Classes: everyone logged in can see them (the link is kept in another table).
drop policy if exists "See classes" on public.live_classes;
create policy "See classes" on public.live_classes for select to authenticated using (true);

drop policy if exists "Teachers add their own classes" on public.live_classes;
create policy "Teachers add their own classes" on public.live_classes for insert to authenticated
  with check (
    (select private.is_content_admin())
    or (teacher_id = (select auth.uid()) and (select private.current_user_role()) = 'teacher')
  );

drop policy if exists "Teachers edit their own classes" on public.live_classes;
create policy "Teachers edit their own classes" on public.live_classes for update to authenticated
  using ((select private.is_content_admin()) or teacher_id = (select auth.uid()))
  with check ((select private.is_content_admin()) or teacher_id = (select auth.uid()));

drop policy if exists "Teachers delete their own classes" on public.live_classes;
create policy "Teachers delete their own classes" on public.live_classes for delete to authenticated
  using ((select private.is_content_admin()) or teacher_id = (select auth.uid()));

-- Links: only the class's teacher and admins. Students get the link from the server.
drop policy if exists "Teachers manage their class links" on public.live_class_links;
create policy "Teachers manage their class links" on public.live_class_links for all to authenticated
  using (
    (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  )
  with check (
    (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );

-- Registrations: you see your own; a teacher sees who signed up for their classes; admins see all.
drop policy if exists "See registrations" on public.class_registrations;
create policy "See registrations" on public.class_registrations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );

-- Signing up: one step that locks the class row, so the last seat can never be given out twice.
-- Only the server (service_role) may call it.
create or replace function public.register_for_class(p_class uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  taken int;
begin
  select * into c from public.live_classes where id = p_class for update;
  if not found then return 'not_found'; end if;
  if c.status <> 'scheduled' then return 'cancelled'; end if;
  if c.starts_at + make_interval(mins => c.duration_min) <= now() then return 'ended'; end if;
  if exists (
    select 1 from public.class_registrations
    where class_id = p_class and user_id = p_user and status = 'registered'
  ) then
    return 'ok';
  end if;
  if c.capacity is not null then
    select count(*) into taken from public.class_registrations where class_id = p_class and status = 'registered';
    if taken >= c.capacity then return 'full'; end if;
  end if;
  insert into public.class_registrations (class_id, user_id, status)
  values (p_class, p_user, 'registered')
  on conflict (class_id, user_id) do update set status = 'registered', registered_at = now();
  return 'ok';
end;
$$;

revoke all on function public.register_for_class(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_for_class(uuid, uuid) to service_role;

-- ===== 20261120000030_rate_limits.sql =====
-- Simple rate limiter used by the server (secret key only). One row per key and time window.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies on purpose: browsers can never read or write this table. Only the server (secret key) can.
revoke all on public.rate_limits from anon, authenticated;

-- Counts one attempt for a key and says whether it is still allowed within the window.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into n;

  -- Tidy up old windows now and then so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return n <= p_max;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ===== 20261120000031_feedback.sql =====
-- Support and feedback messages from students. Only the server writes them (after checking the user and a rate limit);
-- a student can read their own, admins read all through the server.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea', 'question', 'payment')),
  message text not null check (char_length(message) between 5 and 2000),
  -- The page the student was on, so we can see where it happened.
  page text check (char_length(page) <= 200),
  -- The student's email at the time, so an admin can reply even if the account changes later.
  email text check (char_length(email) <= 320),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "Students read own feedback" on public.feedback;
create policy "Students read own feedback" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));

-- No insert or update policy on purpose: the server writes with the secret key.
revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;

-- ===== 20261120000032_email_reminders.sql =====
-- Reminder emails (Pro ending, class starting). One row per email sent, so nobody gets the same reminder twice.
create table if not exists public.email_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,           -- 'pro_7d', 'pro_1d', 'class_1h'
  ref text not null,            -- the Pro end date, or the class id
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.email_log enable row level security;
-- No policies on purpose: browsers can never read or write this table. Only the server (secret key) can.
revoke all on public.email_log from anon, authenticated;

-- The schedule (every 10 minutes) is set up in Supabase with pg_cron + pg_net; it calls /api/cron/reminders.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ===== 20261122000033_workspaces.sql =====
-- Workspaces: every teacher or school is a row in public.academies.
-- A solo teacher gets a personal workspace (kind = 'teacher'); a school is kind = 'school'.
-- The workspace owns the students, branding and the plan, and is what gets billed.
-- Safe to run more than once. Student plans and checkout are not changed.

-- 1) Plans: add the workspace (teacher / school) plans next to the student Pro plans.
alter table public.plans add column if not exists kind text not null default 'student' check (kind in ('student', 'teacher', 'school'));
alter table public.plans add column if not exists code text unique;                 -- stable name for seeding, e.g. 'teacher_free'
alter table public.plans add column if not exists max_students int check (max_students >= 0);  -- null = no fixed limit
alter table public.plans add column if not exists max_teachers int check (max_teachers >= 0);
alter table public.plans add column if not exists features text[] not null default '{}';       -- e.g. logo, colour, font, batches, reports, subdomain, remove_branding
alter table public.plans add column if not exists extra_student_eur_cents int check (extra_student_eur_cents >= 0);
alter table public.plans add column if not exists extra_student_pkr int check (extra_student_pkr >= 0);

-- Students must never see workspace plans in checkout: only kind = 'student' is readable by logged-in users.
-- (Admin screens read workspace plans with the secret key.)
drop policy if exists "Anyone logged in sees active plans" on public.plans;
create policy "Anyone logged in sees active plans" on public.plans for select to authenticated
  using (kind = 'student' and (active or (select private.is_content_admin())));

-- 2) Prices per region. 'global' is EUR; 'south_asia' is a fixed PKR price (not converted from EUR).
create table if not exists public.plan_prices (
  plan_id uuid not null references public.plans (id) on delete cascade,
  region text not null check (region in ('global', 'south_asia')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor int not null check (amount_minor >= 0),   -- cents / paisa
  primary key (plan_id, region)
);
alter table public.plan_prices enable row level security;
drop policy if exists "Admins read plan prices" on public.plan_prices;
create policy "Admins read plan prices" on public.plan_prices for select to authenticated using ((select private.is_content_admin()));
grant select on public.plan_prices to authenticated;
-- Writes: only the server, with the secret key.

-- 3) Academies become workspaces.
alter table public.academies add column if not exists kind text not null default 'school' check (kind in ('teacher', 'school'));
alter table public.academies add column if not exists slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$');
alter table public.academies add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.academies add column if not exists plan_id uuid references public.plans (id) on delete set null;
alter table public.academies add column if not exists show_powered_by boolean not null default true;
alter table public.academies add column if not exists discount_percent int not null default 0 check (discount_percent between 0 and 100);
alter table public.academies add column if not exists discount_until date;
create index if not exists academies_owner_idx on public.academies (owner_id);

-- 4) Members of a workspace. One person can belong to several workspaces.
create table if not exists public.academy_members (
  academy_id uuid not null references public.academies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher')),
  created_at timestamptz not null default now(),
  primary key (academy_id, user_id)
);
create index if not exists academy_members_user_idx on public.academy_members (user_id);
alter table public.academy_members enable row level security;

-- Helper (private, so the policies do not loop on themselves).
create or replace function private.is_academy_member(p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.academy_members
    where academy_id = p_academy and user_id = (select auth.uid())
  )
$$;
revoke all on function private.is_academy_member(uuid) from public, anon;
grant execute on function private.is_academy_member(uuid) to authenticated;

drop policy if exists "Members read their memberships" on public.academy_members;
create policy "Members read their memberships" on public.academy_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.academy_members to authenticated;

drop policy if exists "Members read their workspace" on public.academies;
create policy "Members read their workspace" on public.academies for select to authenticated
  using ((select private.is_academy_member(id)));
-- Writes to academies and academy_members: only the server, with the secret key.

-- 5) A personal workspace for every existing teacher (existing students are not touched).
do $$
declare
  t record;
  new_id uuid;
  free_plan uuid;
begin
  select id into free_plan from public.plans where code = 'teacher_free';  -- null until the seed migration runs; filled there
  for t in select id, full_name from public.profiles where role = 'teacher' and not exists (
    select 1 from public.academy_members m where m.user_id = profiles.id and m.role = 'owner'
  ) loop
    insert into public.academies (name, kind, owner_id, plan_id)
      values (coalesce(nullif(t.full_name, ''), 'Teacher') || '''s workspace', 'teacher', t.id, free_plan)
      returning id into new_id;
    insert into public.academy_members (academy_id, user_id, role) values (new_id, t.id, 'owner');
    update public.profiles set academy_id = new_id where id = t.id and academy_id is null;
  end loop;
end $$;

-- ===== 20261122000034_workspace_plans_seed.sql =====
-- Teacher and school plans (decided 22 Nov 2026). Malik can change every number later.
-- Prices: monthly, excluding VAT. Yearly = pay for 10 months (not stored; shown on the plans page later).
-- plan_prices.amount_minor: EUR cents for 'global', PKR paisa for 'south_asia' (a fixed PKR price).
-- Safe to run more than once. These rows are kind <> 'student', so student checkout never sees them.

insert into public.plans (code, kind, name, months, price_pkr, active, sort, max_students, max_teachers, features, extra_student_eur_cents, extra_student_pkr)
values
  ('teacher_free',   'teacher', 'Teacher Free',   1, 0,     true, 100, 5,   1,  '{}',                                                         null, null),
  ('teacher',        'teacher', 'Teacher',        1, 2900,  true, 110, 30,  1,  '{logo,colour}',                                               40, 120),
  ('school_starter', 'school',  'School Starter', 1, 7500,  true, 200, 100, 5,  '{logo,colour,font,batches,reports}',                          40, 120),
  ('school_pro',     'school',  'School Pro',     1, 14900, true, 210, 300, 15, '{logo,colour,font,batches,reports,subdomain,remove_branding}', 40, 120),
  ('institute',      'school',  'Institute',      1, 0,     true, 220, null, null, '{logo,colour,font,batches,reports,subdomain,remove_branding}', null, null)
on conflict (code) do update set
  name = excluded.name, max_students = excluded.max_students, max_teachers = excluded.max_teachers,
  features = excluded.features, extra_student_eur_cents = excluded.extra_student_eur_cents, extra_student_pkr = excluded.extra_student_pkr;

insert into public.plan_prices (plan_id, region, currency, amount_minor)
select p.id, v.region, v.currency, v.amount_minor
from (values
  ('teacher_free',   'global',     'EUR', 0),
  ('teacher_free',   'south_asia', 'PKR', 0),
  ('teacher',        'global',     'EUR', 1900),
  ('teacher',        'south_asia', 'PKR', 290000),
  ('school_starter', 'global',     'EUR', 4900),
  ('school_starter', 'south_asia', 'PKR', 750000),
  ('school_pro',     'global',     'EUR', 9900),
  ('school_pro',     'south_asia', 'PKR', 1490000),
  ('institute',      'global',     'EUR', 24900)   -- "from"; sold by hand, no PKR price
) as v(code, region, currency, amount_minor)
join public.plans p on p.code = v.code
on conflict (plan_id, region) do update set currency = excluded.currency, amount_minor = excluded.amount_minor;

-- Personal workspaces made in the previous migration start on Teacher Free.
update public.academies set plan_id = (select id from public.plans where code = 'teacher_free')
where kind = 'teacher' and plan_id is null;

-- ===== 20261122000035_join_codes.sql =====
-- Join codes: a student joins a teacher or school with a code, a link or a QR.
-- The old 6-letter profiles.teacher_code is copied here (same letters), so there is one system.
-- batch_id is reserved for batches (not built yet). Written only by the server.

create table if not exists public.join_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  academy_id uuid not null references public.academies (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  batch_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists join_codes_teacher_idx on public.join_codes (teacher_id, active);
create index if not exists join_codes_academy_idx on public.join_codes (academy_id);

alter table public.join_codes enable row level security;
drop policy if exists "Teachers and members read their codes" on public.join_codes;
create policy "Teachers and members read their codes" on public.join_codes for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.join_codes to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking the role.

-- Copy each teacher's existing code into their workspace.
insert into public.join_codes (code, academy_id, teacher_id)
select p.teacher_code, m.academy_id, p.id
from public.profiles p
join lateral (
  select academy_id from public.academy_members
  where user_id = p.id order by (role = 'owner') desc, created_at limit 1
) m on true
where p.role = 'teacher' and p.teacher_code is not null
on conflict (code) do nothing;

-- ===== 20261122000036_eur_pricing.sql =====
-- EUR is the base price. A plan with price_eur_cents is charged in EUR by card; bank/wallet students
-- see the PKR amount worked out from fx_rates, locked on the order. Plans without price_eur_cents keep working
-- exactly as before (PKR), so this can be switched on plan by plan in /admin/payments.

alter table public.plans add column if not exists price_eur_cents int check (price_eur_cents >= 0);

-- Other currencies are only a display of the same EUR price. Set by an admin.
create table if not exists public.fx_rates (
  currency text primary key check (currency ~ '^[A-Z]{3}$' and currency <> 'EUR'),
  per_eur numeric(14, 4) not null check (per_eur > 0),
  updated_at timestamptz not null default now()
);
alter table public.fx_rates enable row level security;
drop policy if exists "Anyone logged in reads rates" on public.fx_rates;
create policy "Anyone logged in reads rates" on public.fx_rates for select to authenticated using (true);
grant select on public.fx_rates to authenticated;
-- Writes: only the server, with the secret key, after the admin check.

insert into public.fx_rates (currency, per_eur) values ('PKR', 300) on conflict (currency) do nothing;

-- What the customer actually pays, locked at order time (amount_pkr stays for old orders).
alter table public.orders add column if not exists amount_eur_cents int;
alter table public.orders add column if not exists pay_currency text check (pay_currency ~ '^[A-Z]{3}$');
alter table public.orders add column if not exists pay_amount_minor int check (pay_amount_minor >= 0);
alter table public.orders add column if not exists fx_rate numeric(14, 4);

-- ===== 20261122000037_branding.sql =====
-- White-label branding, phase 1: name, logo, two colours and an approved font per workspace.
-- Which parts a workspace may change comes from its plan features (logo, colour, font), checked on the server.

alter table public.academies add column if not exists display_name text check (char_length(display_name) between 1 and 60);
alter table public.academies add column if not exists logo_path text;
alter table public.academies add column if not exists primary_color text check (primary_color ~ '^#[0-9a-f]{6}$');
alter table public.academies add column if not exists accent_color text check (accent_color ~ '^#[0-9a-f]{6}$');
alter table public.academies add column if not exists font_key text check (font_key in ('inter', 'poppins', 'nunito'));

-- Logos are shown on the login and signup pages before anyone is logged in, so the bucket is public for reading.
-- Only the server writes to it (secret key), after checking the role, size and file type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academy-logos', 'academy-logos', true, 1048576, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- ===== 20261122000038_batches.sql =====
-- Batches (a teacher's group of students) and announcements. Replaces WhatsApp groups.
-- Every table carries academy_id. Students see only their own batches; written only by the server.

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  exam text check (char_length(exam) <= 40),
  starts_on date,
  ends_on date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists batches_academy_idx on public.batches (academy_id, archived);
create index if not exists batches_teacher_idx on public.batches (teacher_id);

create table if not exists public.batch_members (
  batch_id uuid not null references public.batches (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, student_id)
);
create index if not exists batch_members_student_idx on public.batch_members (student_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists announcements_batch_idx on public.announcements (batch_id, created_at desc);

alter table public.live_classes add column if not exists batch_id uuid references public.batches (id) on delete set null;
create index if not exists live_classes_batch_idx on public.live_classes (batch_id);
do $$ begin
  alter table public.join_codes add constraint join_codes_batch_fk foreign key (batch_id) references public.batches (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- Helper: is the logged-in student in this batch? (private, so the policies do not loop)
create or replace function private.is_batch_member(p_batch uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.batch_members where batch_id = p_batch and student_id = (select auth.uid()))
$$;
revoke all on function private.is_batch_member(uuid) from public, anon;
grant execute on function private.is_batch_member(uuid) to authenticated;

alter table public.batches enable row level security;
alter table public.batch_members enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Members of the workspace or the batch read batches" on public.batches;
create policy "Members of the workspace or the batch read batches" on public.batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(id)) or (select private.is_content_admin()));
drop policy if exists "Read batch members" on public.batch_members;
create policy "Read batch members" on public.batch_members for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
drop policy if exists "Read announcements" on public.announcements;
create policy "Read announcements" on public.announcements for select to authenticated
  using ((select private.is_batch_member(batch_id)) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));

grant select on public.batches, public.batch_members, public.announcements to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking who is asking.

-- ===== 20261122000039_materials.sql =====
-- Homework, notes, files and links, shared with one or more batches (one copy, many batches).
-- Files live in a private bucket; students get short-lived signed links only if they are in a batch the item is shared with.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('homework', 'notes', 'file', 'link')),
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 8000),
  url text check (url ~ '^https://' and char_length(url) <= 500),
  file_path text,
  file_name text check (char_length(file_name) <= 200),
  due_on date,
  created_at timestamptz not null default now()
);
create index if not exists materials_academy_idx on public.materials (academy_id, created_at desc);
create index if not exists materials_owner_idx on public.materials (owner_id);

create table if not exists public.material_batches (
  material_id uuid not null references public.materials (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (material_id, batch_id)
);
create index if not exists material_batches_batch_idx on public.material_batches (batch_id);

-- A student ticks homework as done; the teacher sees who did.
create table if not exists public.material_done (
  material_id uuid not null references public.materials (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (material_id, student_id)
);

alter table public.materials enable row level security;
alter table public.material_batches enable row level security;
alter table public.material_done enable row level security;

create or replace function private.can_see_material(p_material uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.material_batches mb
    join public.batch_members bm on bm.batch_id = mb.batch_id
    where mb.material_id = p_material and bm.student_id = (select auth.uid())
  )
$$;
revoke all on function private.can_see_material(uuid) from public, anon;
grant execute on function private.can_see_material(uuid) to authenticated;

drop policy if exists "Read materials" on public.materials;
create policy "Read materials" on public.materials for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.can_see_material(id)) or (select private.is_content_admin()));
drop policy if exists "Read material batches" on public.material_batches;
create policy "Read material batches" on public.material_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
drop policy if exists "Read own done marks" on public.material_done;
create policy "Read own done marks" on public.material_done for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.materials, public.material_batches, public.material_done to authenticated;
-- Writes only by the server (secret key).

insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 26214400)
on conflict (id) do nothing;

-- ===== 20261122000040_recordings_and_room.sql =====
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

-- ===== 20261122000041_one_to_one.sql =====
-- 1:1 lessons are live classes with one seat. The teacher sets length, price (EUR) and free slots; a student books one.
-- First version: the price is agreed and paid outside Deutli. No payment or payout happens here.

alter table public.live_classes add column if not exists kind text not null default 'group' check (kind in ('group', '1to1'));
alter table public.live_classes add column if not exists price_eur_cents int check (price_eur_cents >= 0);
create index if not exists live_classes_kind_idx on public.live_classes (kind, starts_at);

-- ===== 20261122000042_private_papers.sql =====
-- Private papers: a teacher can upload a paper for their own batches or their workspace.
-- Existing papers stay public (visibility default). Answer keys stay server-only like before.
-- Teachers write through the server (secret key) after role and ownership checks, so no new write policies are needed.

alter table public.mock_papers add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.mock_papers add column if not exists academy_id uuid references public.academies (id) on delete set null;
alter table public.mock_papers add column if not exists visibility text not null default 'public' check (visibility in ('public', 'batches', 'academy'));
alter table public.mock_papers add column if not exists rights_confirmed_at timestamptz;
create index if not exists mock_papers_owner_idx on public.mock_papers (owner_id);

create table if not exists public.paper_batches (
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (paper_id, batch_id)
);
alter table public.paper_batches enable row level security;
drop policy if exists "Read paper batches" on public.paper_batches;
create policy "Read paper batches" on public.paper_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
grant select on public.paper_batches to authenticated;

-- Students and teachers report a paper they think is not allowed to be here.
create table if not exists public.paper_reports (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.mock_papers (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.paper_reports enable row level security;
drop policy if exists "Admins read paper reports" on public.paper_reports;
create policy "Admins read paper reports" on public.paper_reports for select to authenticated using ((select private.is_content_admin()));
grant select on public.paper_reports to authenticated;

-- Can the logged-in student open this paper? Public, shared with one of their batches, or their workspace's.
create or replace function private.can_see_paper(p_paper uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mock_papers p
    where p.id = p_paper and p.is_published and (
      p.visibility = 'public'
      or (p.visibility = 'academy' and p.academy_id is not null and p.academy_id = (select private.current_user_academy_id()))
      or (p.visibility = 'batches' and exists (
            select 1 from public.paper_batches pb join public.batch_members bm on bm.batch_id = pb.batch_id
            where pb.paper_id = p.id and bm.student_id = (select auth.uid())))
    )
  )
$$;
revoke all on function private.can_see_paper(uuid) from public, anon;
grant execute on function private.can_see_paper(uuid) to authenticated;

drop policy if exists "Logged-in users read published papers" on public.mock_papers;
create policy "Logged-in users read published papers" on public.mock_papers
  for select to authenticated
  using ((select private.can_see_paper(id)) or owner_id = (select auth.uid()) or (select private.is_content_admin()));

-- ===== 20261122000043_chapter_tests.sql =====
-- Chapter tests taken on the platform. Questions are visible to the batches the test is shared with;
-- the correct answers live in test_keys, which no student (or teacher) can read through the API: only the server.

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  instructions text check (char_length(instructions) <= 2000),
  time_limit_min int check (time_limit_min between 1 and 240),
  opens_at timestamptz,
  closes_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tests_academy_idx on public.tests (academy_id, created_at desc);

create table if not exists public.test_batches (
  test_id uuid not null references public.tests (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (test_id, batch_id)
);
create index if not exists test_batches_batch_idx on public.test_batches (batch_id);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('mc', 'tf', 'fill')),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  options jsonb not null default '[]',   -- multiple choice: ["a", "b", ...]
  points numeric not null default 1 check (points > 0 and points <= 100)
);
create index if not exists test_questions_test_idx on public.test_questions (test_id, position);

-- Correct answers: no policy for anyone, so only the secret key can read or write.
create table if not exists public.test_keys (
  question_id uuid primary key references public.test_questions (id) on delete cascade,
  answer jsonb not null   -- mc: option index; tf: true/false; fill: ["accepted", "answers"]
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  answers jsonb not null default '{}',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  result jsonb
);
create unique index if not exists test_attempts_one_per_student on public.test_attempts (test_id, student_id);

alter table public.tests enable row level security;
alter table public.test_batches enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_keys enable row level security;
alter table public.test_attempts enable row level security;

create or replace function private.can_see_test(p_test uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.test_batches tb
    join public.batch_members bm on bm.batch_id = tb.batch_id
    join public.tests t on t.id = tb.test_id
    where tb.test_id = p_test and t.published and bm.student_id = (select auth.uid())
  )
$$;
revoke all on function private.can_see_test(uuid) from public, anon;
grant execute on function private.can_see_test(uuid) to authenticated;

drop policy if exists "Read tests" on public.tests;
create policy "Read tests" on public.tests for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.can_see_test(id)) or (select private.is_content_admin()));
drop policy if exists "Read test batches" on public.test_batches;
create policy "Read test batches" on public.test_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
drop policy if exists "Read test questions" on public.test_questions;
create policy "Read test questions" on public.test_questions for select to authenticated
  using ((select private.can_see_test(test_id)) or exists (select 1 from public.tests t where t.id = test_id and (select private.is_academy_member(t.academy_id))) or (select private.is_content_admin()));
-- test_keys: no policy at all.
drop policy if exists "Read own test attempts" on public.test_attempts;
create policy "Read own test attempts" on public.test_attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));

grant select on public.tests, public.test_batches, public.test_questions, public.test_attempts to authenticated;
-- No insert/update/delete grants: attempts, answers and scores are written by the server only.

-- ===== 20261123000044_paper_exam_level.sql =====
-- Which exam and level a paper is for, so a teacher's A2 or Goethe paper is not shown as "telc B1".
-- Existing papers are telc B1 (the default), so nothing changes for them.

alter table public.mock_papers add column if not exists exam text not null default 'telc' check (exam in ('telc', 'goethe', 'oesd', 'dtz', 'other'));
alter table public.mock_papers add column if not exists level text not null default 'b1' check (level in ('a1', 'a2', 'b1', 'b2', 'c1'));
