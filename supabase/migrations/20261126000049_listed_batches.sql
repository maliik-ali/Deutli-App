-- Listed batches (marketplace step 6, 26 Nov 2026).
-- A teacher can list a batch as "open for new students" (opt-in, off by default, optional seat limit).
-- A standalone student can ask to join a listed batch; the request remembers which one, and when Deutli assigns
-- the student by hand, the student is added to that batch too. Safe to run more than once.

alter table public.batches add column if not exists is_listed boolean not null default false;
alter table public.batches add column if not exists seats integer check (seats is null or seats between 1 and 500);
create index if not exists batches_listed_idx on public.batches (teacher_id) where is_listed and not archived;

alter table public.join_requests add column if not exists batch_id uuid references public.batches (id) on delete set null;
-- RLS is unchanged: batches and join_requests are still read-only for logged-in users and written by the server only.
