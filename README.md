# Hero Shelf Check

Offline-first PWA for ABH field reps to log Pureau shelf availability.

## Tech stack

- Vite + React + TypeScript + Tailwind CSS
- Supabase (auth + database)
- Dexie (offline IndexedDB queue)
- vite-plugin-pwa (service worker, installable)
- Deployed to Vercel

## Quick start

### 1. Create Supabase project

1. Go to https://supabase.com and create a new project
2. Run `database/001_schema.sql` in the Supabase SQL editor
3. Note your project URL and anon key

### 2. Configure environment

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Load store data

The Grocery_Store_Master.xlsx (at ~/.claude/tools/_output/store_db/out/) contains:
- 1,149 Woolworths Supermarkets (live data from WW API)
- 30 Coles placeholder rows (update with real data from sites.coles.com.au)
- Metcash: PLACEHOLDER — add IGA stores when available

Import stores to Supabase by running:

```bash
python3 scripts/import_stores.py --source ~/.claude/tools/_output/store_db/out/Grocery_Store_Master.xlsx
```

(Script to be built — see scripts/import_stores.py placeholder)

### 4. Add first admin user

1. Go to Supabase Dashboard > Authentication > Users
2. Create a user with email/password
3. Run in SQL editor:

```sql
insert into rep_users (id, email, full_name, role)
values ('[USER_UUID]', 'admin@abhgroup.com.au', 'Admin User', 'admin');
```

### 5. Deploy to Vercel

```bash
npm install
npm run build
vercel --prod
```

Or push to GitHub and connect the repo in the Vercel dashboard.

## App structure

```
src/
  types/index.ts          — core TypeScript types + HERO_SKUS constant
  lib/
    supabase.ts           — Supabase client
    database.types.ts     — generated DB types
    db.ts                 — Dexie offline DB + queue helpers
    sync.ts               — 60-second auto-sync engine
  contexts/
    AuthContext.tsx        — auth state + signIn/signOut
  hooks/
    useSync.ts            — pending queue count hook
  components/
    auth/LoginPage.tsx    — email/password login
    layout/Layout.tsx     — nav shell + offline indicator + sync badge
    stores/StorePicker.tsx— searchable store picker (reference list only)
    visits/VisitForm.tsx  — shelf check form (shelf units + backroom 3-state)
    visits/VisitHistory.tsx — rep's recent visits
    admin/AdminDashboard.tsx — store/SKU availability overview (admin only)
database/
  001_schema.sql          — full Supabase schema (run once)
```

## Offline behaviour

1. Rep logs a visit — stored in Dexie IndexedDB queue immediately
2. Sync engine runs every 60 seconds and when device comes back online
3. Each visit is uploaded: visits table first, then observations
4. Duplicate protection: Supabase unique constraint prevents double-upload
5. After 5 failed attempts the item is flagged for manual review

## Hero SKUs

| SKU | Code | Retailers |
|-----|------|-----------|
| Pureau 10L Cask | PUREAU-10L | WW, Coles, Metcash |
| Pureau 5L Cask | PUREAU-5L | WW, Coles, Metcash |
| Pureau 2L Bottle | PUREAU-2L | WW, Coles, Metcash |
| Pureau 600ml 6 Pack | PUREAU-600-6PK | Coles only |

## Analytics (Stage 2 placeholders)

The `store_availability_summary` view is live. Stage 2 will add:
- Availability trend chart by SKU (last 30/90 days)
- Coverage heat map by state
- Rep compliance rate
- Territory boundaries (granular sub-state regions)

## Stage 2 Coles store data

When ABH supplier portal access is available:
1. Export from sites.coles.com.au (All Locations, Retail Store type)
2. Drop file into ~/.claude/tools/_output/store_db/in/
3. Run: `python3 ~/.claude/tools/_output/store_db/coles_store_ingest.py`
4. Run: `python3 ~/.claude/tools/_output/store_db/build_store_master.py`
5. Re-import to Supabase with import_stores.py

## Metcash store data (PLACEHOLDER)

Metcash does not have a public store API. Options:
- Request store list from Metcash account manager
- Manually compile from IGA store finder

ABH Pureau - Part of the Mann & Noble Group
