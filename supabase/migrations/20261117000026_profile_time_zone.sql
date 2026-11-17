-- 26) Each user's own time zone (IANA name, e.g. "Europe/Berlin", "Asia/Karachi").
-- Detected from the device on first visit; the student can change it on the Account page.
-- "Today" (streaks, words due, daily AI limit), the greeting, countdowns and dates use it.
-- Empty = not detected yet (the app then uses Pakistan time, as before).
-- Safe to run more than once.

alter table public.profiles
  add column if not exists time_zone text check (time_zone is null or char_length(time_zone) between 1 and 64);

-- Users may set their own time zone (RLS already limits updates to their own row).
grant update (time_zone) on public.profiles to authenticated;
