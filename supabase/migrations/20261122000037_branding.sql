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
