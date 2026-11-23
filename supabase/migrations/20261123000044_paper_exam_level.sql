-- Which exam and level a paper is for, so a teacher's A2 or Goethe paper is not shown as "telc B1".
-- Existing papers are telc B1 (the default), so nothing changes for them.

alter table public.mock_papers add column if not exists exam text not null default 'telc' check (exam in ('telc', 'goethe', 'oesd', 'dtz', 'other'));
alter table public.mock_papers add column if not exists level text not null default 'b1' check (level in ('a1', 'a2', 'b1', 'b2', 'c1'));
