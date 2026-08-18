-- ============================================================
-- Hero Shelf Check — Supabase Schema
-- Run this in the Supabase SQL editor for the target project.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ---- Enums -----------------------------------------------

create type retailer_type as enum ('woolworths', 'coles', 'metcash');
create type backroom_status_type as enum ('counted', 'none_present', 'not_checked');
create type user_role_type as enum ('rep', 'admin');

-- ---- Stores ----------------------------------------------

create table stores (
  id            uuid primary key default uuid_generate_v4(),
  retailer      retailer_type not null,
  store_number  text not null,
  name          text not null,
  address_line1 text,
  suburb        text,
  state         text,        -- NSW, VIC, QLD, SA, WA, TAS, NT, ACT
  postcode      text,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Full-text search index on name + suburb for store picker
create index idx_stores_search on stores
  using gin(to_tsvector('english', name || ' ' || coalesce(suburb,'') || ' ' || coalesce(postcode,'')));
create index idx_stores_retailer on stores(retailer);
create index idx_stores_state    on stores(state);
create index idx_stores_active   on stores(is_active);

-- ---- SKUs ------------------------------------------------
-- Seeded from application constants (see src/types/index.ts)

create table skus (
  id        uuid primary key default uuid_generate_v4(),
  code      text not null unique,
  name      text not null,
  retailers text[] not null,   -- array of retailer_type values
  is_active boolean not null default true
);

insert into skus (code, name, retailers) values
  ('PUREAU-10L',     'Pureau 10L Cask',     array['woolworths','coles','metcash']),
  ('PUREAU-5L',      'Pureau 5L Cask',      array['woolworths','coles','metcash']),
  ('PUREAU-2L',      'Pureau 2L Bottle',    array['woolworths','coles','metcash']),
  ('PUREAU-600-6PK', 'Pureau 600ml 6 Pack', array['coles']);

-- ---- Rep users -------------------------------------------

create table rep_users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  full_name        text not null,
  role             user_role_type not null default 'rep',
  state_territory  text,   -- Stage 1 region grouping: NSW, VIC, QLD etc.
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ---- Visits ----------------------------------------------

create table visits (
  id          uuid primary key default uuid_generate_v4(),
  store_id    uuid not null references stores(id),
  rep_id      uuid not null references rep_users(id),
  visit_date  date not null,
  visit_time  time not null,
  created_at  timestamptz not null default now()
);

create index idx_visits_store_date on visits(store_id, visit_date desc);
create index idx_visits_rep_date   on visits(rep_id, visit_date desc);

-- ---- Observations ----------------------------------------

create table observations (
  id               uuid primary key default uuid_generate_v4(),
  visit_id         uuid not null references visits(id) on delete cascade,
  sku_id           uuid not null references skus(id),
  shelf_units      integer not null check (shelf_units >= 0),
  backroom_status  backroom_status_type not null,
  backroom_units   integer check (backroom_units >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  unique (visit_id, sku_id)
);

create index idx_observations_visit   on observations(visit_id);
create index idx_observations_sku     on observations(sku_id);

-- ---- Analytics view --------------------------------------
-- store_availability_summary: latest shelf count per store/SKU

create or replace view store_availability_summary as
with latest_obs as (
  select distinct on (v.store_id, o.sku_id)
    v.store_id,
    o.sku_id,
    o.shelf_units         as latest_shelf_units,
    v.visit_date          as last_visit_date,
    now()::date - v.visit_date as days_since_visit
  from visits v
  join observations o on o.visit_id = v.id
  order by v.store_id, o.sku_id, v.visit_date desc, v.visit_time desc
),
visit_counts as (
  select
    v.store_id,
    o.sku_id,
    count(*) filter (where v.visit_date >= now()::date - 30)   as visits_last_30d,
    avg(o.shelf_units) filter (where v.visit_date >= now()::date - 30) as avg_shelf_units_30d
  from visits v
  join observations o on o.visit_id = v.id
  group by v.store_id, o.sku_id
)
select
  s.id                    as store_id,
  s.name                  as store_name,
  s.retailer::text        as retailer,
  s.state,
  lo.last_visit_date,
  lo.days_since_visit,
  sk.id                   as sku_id,
  sk.name                 as sku_name,
  lo.latest_shelf_units,
  coalesce(vc.visits_last_30d, 0)   as visits_last_30d,
  vc.avg_shelf_units_30d
from stores s
cross join skus sk
left join latest_obs lo on lo.store_id = s.id and lo.sku_id = sk.id
left join visit_counts vc on vc.store_id = s.id and vc.sku_id = sk.id
where s.is_active = true
  and sk.is_active = true
  and sk.retailers @> array[s.retailer::text];

-- ---- Row-level security ----------------------------------

alter table stores       enable row level security;
alter table skus         enable row level security;
alter table rep_users    enable row level security;
alter table visits       enable row level security;
alter table observations enable row level security;

-- Stores: all authenticated users can read
create policy "stores_read" on stores
  for select using (auth.role() = 'authenticated');

-- SKUs: all authenticated users can read
create policy "skus_read" on skus
  for select using (auth.role() = 'authenticated');

-- Rep users: can read own record; admins can read all
create policy "rep_users_self" on rep_users
  for select using (auth.uid() = id);

create policy "rep_users_admin" on rep_users
  for select using (
    exists(select 1 from rep_users ru where ru.id = auth.uid() and ru.role = 'admin')
  );

-- Visits: reps can read/insert own; admins can read all
create policy "visits_insert" on visits
  for insert with check (auth.uid() = rep_id);

create policy "visits_own_read" on visits
  for select using (auth.uid() = rep_id);

create policy "visits_admin_read" on visits
  for select using (
    exists(select 1 from rep_users ru where ru.id = auth.uid() and ru.role = 'admin')
  );

-- Observations: inherit from visits
create policy "observations_insert" on observations
  for insert with check (
    exists(select 1 from visits v where v.id = visit_id and v.rep_id = auth.uid())
  );

create policy "observations_own_read" on observations
  for select using (
    exists(select 1 from visits v where v.id = visit_id and v.rep_id = auth.uid())
  );

create policy "observations_admin_read" on observations
  for select using (
    exists(select 1 from rep_users ru where ru.id = auth.uid() and ru.role = 'admin')
  );
