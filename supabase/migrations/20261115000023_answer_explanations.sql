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
