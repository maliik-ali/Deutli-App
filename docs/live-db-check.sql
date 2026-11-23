-- Read-only check of the live database after migrations 33 to 43. Changes nothing.
-- Paste into the Supabase SQL editor and run. Every row should say OK. Send me any row that says MISSING.

with expected_tables(t) as (values
  ('academy_members'),('announcements'),('batch_members'),('batches'),('fx_rates'),('join_codes'),
  ('material_batches'),('material_done'),('materials'),('paper_batches'),('paper_reports'),('plan_prices'),
  ('teacher_room_links'),('test_attempts'),('test_batches'),('test_keys'),('test_questions'),('tests')
),
expected_cols(t, c) as (values
  ('academies','kind'),('academies','slug'),('academies','owner_id'),('academies','plan_id'),('academies','show_powered_by'),
  ('academies','discount_percent'),('academies','discount_until'),
  ('academies','display_name'),('academies','logo_path'),('academies','primary_color'),('academies','accent_color'),('academies','font_key'),
  ('plans','kind'),('plans','code'),('plans','max_students'),('plans','max_teachers'),('plans','features'),('plans','price_eur_cents'),
  ('orders','pay_currency'),('orders','pay_amount_minor'),('orders','fx_rate'),
  ('live_classes','batch_id'),('live_classes','recording_url'),('live_classes','kind'),
  ('mock_papers','owner_id'),('mock_papers','visibility')
),
expected_funcs(f) as (values
  ('is_academy_member'),('is_batch_member'),('can_see_material'),('can_see_paper'),('can_see_test'),('is_content_admin')
),
expected_buckets(b) as (values ('academy-logos'),('materials'))

select 'table ' || t as check, case when exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then 'OK' else 'MISSING' end as result from expected_tables
union all
select 'column ' || t || '.' || c, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=c) then 'OK' else 'MISSING' end from expected_cols
union all
select 'function private.' || f, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname=f) then 'OK' else 'MISSING' end from expected_funcs
union all
select 'bucket ' || b, case when exists (select 1 from storage.buckets where id=b) then 'OK' else 'MISSING' end from expected_buckets
union all
-- every public table must have row level security on and at least one policy
select 'RLS on ' || c.relname, case when c.relrowsecurity then 'OK' else 'MISSING' end
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
union all
select 'policy on ' || c.relname, case when exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname) then 'OK' else 'NONE (only the server can read it; fine if intended)' end
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
union all
select 'seed: plan ' || code, 'OK' from public.plans where code in ('teacher_free','teacher','school_starter','school_pro','institute')
union all
select 'seed: fx rates', case when count(*) > 0 then 'OK (' || count(*) || ')' else 'MISSING (add PKR in /admin/payments)' end from public.fx_rates
union all
select 'teachers without a workspace', case when count(*) = 0 then 'OK' else count(*) || ' teacher(s): open them in /admin/teachers' end
from public.profiles p where p.role='teacher' and not exists (select 1 from public.academy_members m where m.user_id=p.id)
order by 2 desc, 1;
