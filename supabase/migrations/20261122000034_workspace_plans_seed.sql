-- Teacher and school plans (decided 22 Nov 2026). Malik can change every number later.
-- Prices: monthly, excluding VAT. Yearly = pay for 10 months (not stored; shown on the plans page later).
-- plan_prices.amount_minor: EUR cents for 'global', PKR paisa for 'south_asia' (a fixed PKR price).
-- Safe to run more than once. These rows are kind <> 'student', so student checkout never sees them.

insert into public.plans (code, kind, name, months, price_pkr, active, sort, max_students, max_teachers, features, extra_student_eur_cents, extra_student_pkr)
values
  ('teacher_free',   'teacher', 'Teacher Free',   1, 0,     true, 100, 5,   1,  '{}',                                                         null, null),
  ('teacher',        'teacher', 'Teacher',        1, 2900,  true, 110, 30,  1,  '{logo,colour}',                                               40, 120),
  ('school_starter', 'school',  'School Starter', 1, 7500,  true, 200, 100, 5,  '{logo,colour,font,batches,reports}',                          40, 120),
  ('school_pro',     'school',  'School Pro',     1, 14900, true, 210, 300, 15, '{logo,colour,font,batches,reports,subdomain,remove_branding}', 40, 120),
  ('institute',      'school',  'Institute',      1, 0,     true, 220, null, null, '{logo,colour,font,batches,reports,subdomain,remove_branding}', null, null)
on conflict (code) do update set
  name = excluded.name, max_students = excluded.max_students, max_teachers = excluded.max_teachers,
  features = excluded.features, extra_student_eur_cents = excluded.extra_student_eur_cents, extra_student_pkr = excluded.extra_student_pkr;

insert into public.plan_prices (plan_id, region, currency, amount_minor)
select p.id, v.region, v.currency, v.amount_minor
from (values
  ('teacher_free',   'global',     'EUR', 0),
  ('teacher_free',   'south_asia', 'PKR', 0),
  ('teacher',        'global',     'EUR', 1900),
  ('teacher',        'south_asia', 'PKR', 290000),
  ('school_starter', 'global',     'EUR', 4900),
  ('school_starter', 'south_asia', 'PKR', 750000),
  ('school_pro',     'global',     'EUR', 9900),
  ('school_pro',     'south_asia', 'PKR', 1490000),
  ('institute',      'global',     'EUR', 24900)   -- "from"; sold by hand, no PKR price
) as v(code, region, currency, amount_minor)
join public.plans p on p.code = v.code
on conflict (plan_id, region) do update set currency = excluded.currency, amount_minor = excluded.amount_minor;

-- Personal workspaces made in the previous migration start on Teacher Free.
update public.academies set plan_id = (select id from public.plans where code = 'teacher_free')
where kind = 'teacher' and plan_id is null;
