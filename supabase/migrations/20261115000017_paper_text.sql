-- Selectable text for the paper pages (so students can select a word to translate and save it).
-- Filled by the admin's browser from the PDF's text layer: { "<page>": [ { s: text, x, y, w, h } ] }, positions as fractions of the page.
-- Only the exam pages the admin chose are included, never the answer pages. Same read rules as the rest of mock_papers.
alter table public.mock_papers add column if not exists page_text jsonb;
