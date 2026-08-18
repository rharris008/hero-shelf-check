-- ============================================================
-- Hero Shelf Check — Patch 002
-- 1. Adds photo_url column to observations (idempotent)
-- 2. Replaces store_availability_summary view to include:
--      latest_backroom_status  (from most recent observation)
--      last_rep_name           (from rep_users)
--      latest_photo_url        (from most recent observation)
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: add photo_url to observations if it doesn't exist
alter table public.observations
  add column if not exists photo_url text default null;

-- Step 2: replace the analytics view
create or replace view store_availability_summary as
with latest_obs as (
  select distinct on (v.store_id, o.sku_id)
    v.store_id,
    o.sku_id,
    o.shelf_units              as latest_shelf_units,
    o.backroom_status::text    as latest_backroom_status,
    o.photo_url                as latest_photo_url,
    v.visit_date               as last_visit_date,
    now()::date - v.visit_date as days_since_visit,
    v.rep_id                   as last_rep_id
  from visits v
  join observations o on o.visit_id = v.id
  order by v.store_id, o.sku_id, v.visit_date desc, v.visit_time desc
),
visit_counts as (
  select
    v.store_id,
    o.sku_id,
    count(*) filter (where v.visit_date >= now()::date - 30)        as visits_last_30d,
    avg(o.shelf_units) filter (where v.visit_date >= now()::date - 30) as avg_shelf_units_30d
  from visits v
  join observations o on o.visit_id = v.id
  group by v.store_id, o.sku_id
)
select
  s.id                               as store_id,
  s.name                             as store_name,
  s.retailer::text                   as retailer,
  s.state,
  lo.last_visit_date,
  lo.days_since_visit,
  ru.full_name                       as last_rep_name,
  sk.id                              as sku_id,
  sk.name                            as sku_name,
  lo.latest_shelf_units,
  lo.latest_backroom_status,
  lo.latest_photo_url,
  coalesce(vc.visits_last_30d, 0)    as visits_last_30d,
  vc.avg_shelf_units_30d
from stores s
cross join skus sk
left join latest_obs lo       on lo.store_id = s.id and lo.sku_id = sk.id
left join rep_users ru        on ru.id = lo.last_rep_id
left join visit_counts vc     on vc.store_id = s.id and vc.sku_id = sk.id
where s.is_active = true
  and sk.is_active = true
  and sk.retailers @> array[s.retailer::text];

-- Step 3: verify
select store_name, sku_name, latest_shelf_units, latest_backroom_status,
       latest_photo_url, last_rep_name, days_since_visit
from store_availability_summary
order by days_since_visit desc nulls last
limit 20;
