-- 17) Mock covers: more gradient colours and an optional cover photo per paper.
-- Safe to run more than once.

alter table public.mock_papers add column if not exists cover_path text check (char_length(cover_path) <= 300);

alter table public.mock_papers drop constraint if exists mock_papers_tone_check;
alter table public.mock_papers add constraint mock_papers_tone_check
  check (tone in ('navy', 'violet', 'teal', 'indigo', 'plum', 'forest', 'ocean'));
