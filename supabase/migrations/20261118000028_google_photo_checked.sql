-- Google sign-in: the Google profile photo is copied once into the user's Deutli photo.
-- This column remembers that we tried, so a photo the user removed is never brought back.
-- Only the server (secret key) writes it; users have no update grant on it.

alter table public.profiles add column if not exists google_photo_checked_at timestamptz;
