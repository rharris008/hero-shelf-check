-- ============================================================
-- Hero Shelf Check — Test seed data
-- Paste into Supabase SQL Editor and run.
-- Uses Rob's rep_users id for visit rep_id.
-- Creates stores across WW / Coles / Metcash in NSW, VIC, QLD.
-- Covers all four dashboard priorities:
--   RED   = shelf 0 + backroom none_present
--   AMBER = shelf 0 + backroom counted or not_checked
--   GREY  = not visited in 7+ days (or never)
--   GREEN = shelf > 0, visited recently
-- ============================================================

-- ---- Stores -----------------------------------------------

insert into public.stores (id, retailer, store_number, name, suburb, state, postcode, is_active)
values
  -- Woolworths NSW
  ('a1000001-0000-0000-0000-000000000001', 'woolworths', 'WW-2201', 'Woolworths Bondi Junction',    'Bondi Junction',  'NSW', '2022', true),
  ('a1000001-0000-0000-0000-000000000002', 'woolworths', 'WW-2060', 'Woolworths North Sydney',      'North Sydney',    'NSW', '2060', true),
  ('a1000001-0000-0000-0000-000000000003', 'woolworths', 'WW-2150', 'Woolworths Parramatta',        'Parramatta',      'NSW', '2150', true),

  -- Woolworths VIC
  ('a1000001-0000-0000-0000-000000000004', 'woolworths', 'WW-3000', 'Woolworths Melbourne Central', 'Melbourne',       'VIC', '3000', true),
  ('a1000001-0000-0000-0000-000000000005', 'woolworths', 'WW-3121', 'Woolworths Richmond',          'Richmond',        'VIC', '3121', true),

  -- Woolworths QLD
  ('a1000001-0000-0000-0000-000000000006', 'woolworths', 'WW-4000', 'Woolworths Brisbane CBD',      'Brisbane',        'QLD', '4000', true),
  ('a1000001-0000-0000-0000-000000000007', 'woolworths', 'WW-4217', 'Woolworths Broadbeach',        'Broadbeach',      'QLD', '4217', true),

  -- Coles NSW
  ('a1000001-0000-0000-0000-000000000010', 'coles',      'CL-2000', 'Coles Sydney CBD',             'Sydney',          'NSW', '2000', true),
  ('a1000001-0000-0000-0000-000000000011', 'coles',      'CL-2204', 'Coles Surry Hills',            'Surry Hills',     'NSW', '2010', true),

  -- Coles VIC
  ('a1000001-0000-0000-0000-000000000012', 'coles',      'CL-3181', 'Coles Prahran',                'Prahran',         'VIC', '3181', true),

  -- Coles QLD
  ('a1000001-0000-0000-0000-000000000013', 'coles',      'CL-4101', 'Coles West End',               'West End',        'QLD', '4101', true),
  ('a1000001-0000-0000-0000-000000000014', 'coles',      'CL-4215', 'Coles Burleigh Heads',         'Burleigh Heads',  'QLD', '4220', true),

  -- Metcash NSW
  ('a1000001-0000-0000-0000-000000000020', 'metcash',    'IGA-2170','IGA Moorebank',                'Moorebank',       'NSW', '2170', true),
  ('a1000001-0000-0000-0000-000000000021', 'metcash',    'IGA-2560','IGA Campbelltown',             'Campbelltown',    'NSW', '2560', true),

  -- Metcash QLD
  ('a1000001-0000-0000-0000-000000000022', 'metcash',    'IGA-4305','IGA Ipswich',                  'Ipswich',         'QLD', '4305', true)

on conflict (id) do nothing;

-- ---- Visits + Observations --------------------------------
-- Using Rob's admin UUID as rep_id

do $$
declare
  rob_id   uuid := '5611ad4b-e602-4a11-997c-d11a3b6b5b57';
  sku_10l  uuid;
  sku_5l   uuid;
  sku_2l   uuid;
  sku_600  uuid;
  v_id     uuid;
begin
  select id into sku_10l  from public.skus where code = 'PUREAU-10L';
  select id into sku_5l   from public.skus where code = 'PUREAU-5L';
  select id into sku_2l   from public.skus where code = 'PUREAU-2L';
  select id into sku_600  from public.skus where code = 'PUREAU-600-6PK';

  -- --------------------------------------------------------
  -- RED: Bondi Junction WW — visited 2 days ago, all SKUs zero + no backroom
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000001', rob_id, current_date - 2, '09:30');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 0, 'none_present'),
    (v_id, sku_5l,  0, 'none_present'),
    (v_id, sku_2l,  0, 'none_present');

  -- --------------------------------------------------------
  -- RED: Coles Sydney CBD — visited yesterday, zero + no backroom
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000010', rob_id, current_date - 1, '14:00');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 0, 'none_present'),
    (v_id, sku_5l,  2, 'none_present'),   -- 5L OK
    (v_id, sku_2l,  0, 'none_present'),
    (v_id, sku_600, 0, 'none_present');

  -- --------------------------------------------------------
  -- AMBER: North Sydney WW — visited 1 day ago, zero shelf but stock in backroom
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000002', rob_id, current_date - 1, '10:15');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status, backroom_units)
  values
    (v_id, sku_10l, 0, 'counted', 12),
    (v_id, sku_5l,  0, 'counted', 6),
    (v_id, sku_2l,  3, 'none_present', null);

  -- --------------------------------------------------------
  -- AMBER: Surry Hills Coles — visited 3 days ago, zero + backroom not checked
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000011', rob_id, current_date - 3, '11:00');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 0, 'not_checked'),
    (v_id, sku_5l,  0, 'not_checked'),
    (v_id, sku_2l,  0, 'counted'),
    (v_id, sku_600, 1, 'none_present');

  -- --------------------------------------------------------
  -- GREY: Parramatta WW — visited 14 days ago (stale)
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000003', rob_id, current_date - 14, '08:45');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 6, 'none_present'),
    (v_id, sku_5l,  4, 'none_present'),
    (v_id, sku_2l,  8, 'none_present');

  -- --------------------------------------------------------
  -- GREY: IGA Moorebank — visited 21 days ago
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000020', rob_id, current_date - 21, '13:30');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 3, 'none_present'),
    (v_id, sku_5l,  2, 'none_present'),
    (v_id, sku_2l,  5, 'none_present');

  -- --------------------------------------------------------
  -- GREY: IGA Campbelltown — never visited (no visit inserted)
  -- GREY: IGA Ipswich      — never visited
  -- GREY: Coles West End   — never visited
  -- (these appear automatically via the cross join in the view)
  -- --------------------------------------------------------

  -- --------------------------------------------------------
  -- GREEN: Melbourne Central WW — visited today, good stock
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000004', rob_id, current_date, '09:00');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 18, 'none_present'),
    (v_id, sku_5l,  12, 'none_present'),
    (v_id, sku_2l,  24, 'none_present');

  -- --------------------------------------------------------
  -- GREEN: Richmond WW — visited yesterday, good stock
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000005', rob_id, current_date - 1, '15:00');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 9,  'none_present'),
    (v_id, sku_5l,  6,  'none_present'),
    (v_id, sku_2l,  15, 'none_present');

  -- --------------------------------------------------------
  -- GREEN: Brisbane CBD WW — visited 2 days ago, healthy stock
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000006', rob_id, current_date - 2, '10:30');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 12, 'counted'),
    (v_id, sku_5l,  8,  'none_present'),
    (v_id, sku_2l,  20, 'none_present');

  -- --------------------------------------------------------
  -- GREEN: Prahran Coles — visited today
  -- --------------------------------------------------------
  v_id := gen_random_uuid();
  insert into public.visits (id, store_id, rep_id, visit_date, visit_time)
  values (v_id, 'a1000001-0000-0000-0000-000000000012', rob_id, current_date, '11:30');

  insert into public.observations (visit_id, sku_id, shelf_units, backroom_status)
  values
    (v_id, sku_10l, 6,  'none_present'),
    (v_id, sku_5l,  4,  'none_present'),
    (v_id, sku_2l,  10, 'none_present'),
    (v_id, sku_600, 8,  'none_present');

end $$;

-- ---- Verify -----------------------------------------------

select
  s.name       as store,
  s.retailer,
  s.state,
  sk.code      as sku,
  o.shelf_units,
  o.backroom_status,
  v.visit_date
from public.visits v
join public.stores s  on s.id = v.store_id
join public.observations o on o.visit_id = v.id
join public.skus sk   on sk.id = o.sku_id
order by v.visit_date desc, s.name, sk.code
limit 60;
