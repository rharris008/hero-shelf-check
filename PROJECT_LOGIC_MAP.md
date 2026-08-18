# Hero Shelf Check — Project Logic Map

## Offline queue state machine

```
Rep submits visit form
        |
        v
[enqueue()] ─────────────────────► Dexie IndexedDB
  localId = local-<timestamp>-<rand>
  status: pending
  attempts: 0
        |
        v
SyncEngine (60-second timer / online event)
        |
        ├── navigator.onLine === false?
        │         └── SKIP. Notify UI with pending count. Return.
        |
        └── navigator.onLine === true
                  |
                  v
            For each item in queue:
                  |
                  ├── item.attempts >= 5?
                  │         └── SKIP (max retries). Manual review required.
                  |
                  └── attempt upload:
                            |
                            ├── supabase.from('visits').insert(...)
                            │     ├── success → insert observations
                            │     │       ├── success → dequeue(localId) ✓
                            │     │       └── error  → markAttempt(localId)
                            │     ├── 23505 (duplicate) → dequeue(localId) ✓
                            │     └── other error → markAttempt(localId)
                            |
                            └── After all items: notify UI with remaining count
```

## Auth flow

```
App load
  |
  └── supabase.auth.getSession()
          |
          ├── session exists → AuthProvider sets session + fetches rep_user
          │       └── startSyncEngine()
          |
          └── no session → redirect to /login
                  |
                  └── LoginPage: email/password submit
                          |
                          └── supabase.auth.signInWithPassword()
                                  |
                                  ├── success → AuthContext.onAuthStateChange fires
                                  │       └── redirect to /check
                                  └── error → show error message
```

## Store picker flow

```
VisitForm renders StorePicker
  |
  └── on mount: searchStores('') → load initial 50 stores from Dexie
          |
          └── rep types query (200ms debounce)
                  |
                  └── searchStores(query, retailerFilter)
                          |
                          ├── matches: name, suburb, postcode, store_number
                          └── results list → rep taps a store → store locked in
```

## SKU visibility rules

| Retailer | 10L Cask | 5L Cask | 2L Bottle | 600ml 6pk |
|----------|----------|---------|-----------|-----------|
| Woolworths | Y | Y | Y | N |
| Coles | Y | Y | Y | Y |
| Metcash | Y | Y | Y | N |

Logic: `HERO_SKUS.filter(s => s.retailers.includes(store.retailer))`

## Admin vs rep routing

| Role | /check | /history | /admin |
|------|--------|----------|--------|
| rep | Y | Y | redirect to /check |
| admin | Y | Y | Y |

## Analytics view

`store_availability_summary` (Supabase view):
- Joins stores x skus x latest observation per store/SKU
- Returns: store, retailer, state, last visit date, days since visit, latest shelf units
- Used by AdminDashboard for KPI tiles and store list
- Filtered by: retailer, state (Stage 1 region grouping)

## Stage 2 placeholders

The following are stub/placeholder in the current build:

1. **Analytics charts** (AdminDashboard — dashed placeholder box)
   - Availability trend by SKU over 30/90 days
   - Coverage heat map by state
   - Rep compliance rate

2. **Territory boundaries** (currently using State as region)
   - To be refined when territory definitions are confirmed

3. **Metcash store data** (currently no stores loaded for Metcash)
   - Source TBD — request from Metcash account manager

4. **Coles store data** (30 placeholder rows)
   - Replace with real data from sites.coles.com.au supplier export

5. **Store import script** (scripts/import_stores.py not yet built)
   - Reads Grocery_Store_Master.xlsx and upserts to Supabase stores table

6. **Push notifications** (not in scope Stage 1)
   - Potential: alert admin when store not visited for 14+ days
