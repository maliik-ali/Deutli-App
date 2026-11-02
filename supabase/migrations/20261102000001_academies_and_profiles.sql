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
