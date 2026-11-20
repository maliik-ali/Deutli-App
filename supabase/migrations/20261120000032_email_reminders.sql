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
