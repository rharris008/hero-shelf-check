// ============================================================
// Route Planner — priority-sorted store list for field reps
// Shows nearest stores with visit urgency so reps know where
// to go next.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Retailer, Store, StoreAvailabilitySummary } from '../../types'

const RETAILER_LABEL: Record<Retailer, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash / IGA',
}

const RETAILER_COLOUR: Record<Retailer, string> = {
  woolworths: 'bg-green-100 text-green-800',
  coles: 'bg-red-100 text-red-800',
  metcash: 'bg-blue-100 text-blue-800',
}

type Priority = 'overdue' | 'oos' | 'amber' | 'ok' | 'new'

function storePriority(summary: StoreAvailabilitySummary | undefined, days: number | null): Priority {
  if (!summary || days === null) return 'new'
  if (days > 30) return 'overdue'
  const oos = (summary.latest_shelf_units ?? 0) === 0
  if (oos && summary.latest_backroom_status === 'none_present') return 'oos'
  if (oos) return 'amber'
  return 'ok'
}

const PRIORITY_LABEL: Record<Priority, { label: string; colour: string }> = {
  new:     { label: 'Never visited', colour: 'bg-gray-200 text-gray-600' },
  overdue: { label: 'Overdue',       colour: 'bg-abh-red text-white' },
  oos:     { label: 'OOS',           colour: 'bg-abh-red text-white' },
  amber:   { label: 'At risk',       colour: 'bg-abh-amber text-white' },
  ok:      { label: 'Covered',       colour: 'bg-abh-green text-white' },
}

const PRIORITY_ORDER: Record<Priority, number> = {
  oos: 0, overdue: 1, amber: 2, new: 3, ok: 4,
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function RoutePlanner() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<Store[]>([])
  const [summaries, setSummaries] = useState<StoreAvailabilitySummary[]>([])
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retailerFilter, setRetailerFilter] = useState<Retailer | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) { setGeoError(true); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => setGeoError(true),
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // Fetch stores and latest summaries
  useEffect(() => {
    async function load() {
      const [storeRes, sumRes] = await Promise.all([
        supabase
          .from('stores')
          .select('id,retailer,store_number,name,address_line1,suburb,state,postcode,latitude,longitude,is_active')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('store_availability_summary')
          .select('store_id,store_name,retailer,suburb,state,postcode,last_visit_date,days_since_visit,latest_shelf_units,latest_backroom_status,sku_id')
          .order('store_id'),
      ])
      setStores((storeRes.data ?? []) as Store[])
      setSummaries((sumRes.data ?? []) as StoreAvailabilitySummary[])
      setLoading(false)
    }
    load()
  }, [])

  // Worst-case summary per store (most urgent SKU determines priority)
  const summaryByStore = useMemo(() => {
    const map = new Map<string, StoreAvailabilitySummary>()
    for (const s of summaries) {
      const existing = map.get(s.store_id)
      if (!existing) { map.set(s.store_id, s); continue }
      // Keep the one with worse priority
      const ep = storePriority(existing, existing.days_since_visit)
      const sp = storePriority(s, s.days_since_visit)
      if (PRIORITY_ORDER[sp] < PRIORITY_ORDER[ep]) map.set(s.store_id, s)
    }
    return map
  }, [summaries])

  // Build annotated list
  const annotated = useMemo(() => {
    return stores.map(store => {
      const summary = summaryByStore.get(store.id)
      const days = summary?.days_since_visit ?? null
      const priority = storePriority(summary, days)
      const km = (userLat != null && userLng != null && store.latitude != null && store.longitude != null)
        ? haversineKm(userLat, userLng, store.latitude, store.longitude)
        : null
      return { store, summary, priority, days, km }
    })
  }, [stores, summaryByStore, userLat, userLng])

  // Filter + sort: priority first, then distance
  const sorted = useMemo(() => {
    return annotated
      .filter(x => retailerFilter === 'all' || x.store.retailer === retailerFilter)
      .filter(x => priorityFilter === 'all' || x.priority === priorityFilter)
      .sort((a, b) => {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pd !== 0) return pd
        if (a.km != null && b.km != null) return a.km - b.km
        if (a.km != null) return -1
        if (b.km != null) return 1
        return a.store.name.localeCompare(b.store.name)
      })
  }, [annotated, retailerFilter, priorityFilter])

  // OOS SKU names for a given store (from all summaries)
  const oosByStore = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of summaries) {
      if ((s.latest_shelf_units ?? -1) === 0 && s.last_visit_date !== null) {
        const arr = m.get(s.store_id) ?? []
        arr.push(s.sku_name ?? s.sku_id)
        m.set(s.store_id, arr)
      }
    }
    return m
  }, [summaries])

  function checkIn(store: Store) {
    navigate('/check', { state: { preselectedStore: store } })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
          Loading stores…
        </p>
      </div>
    )
  }

  const urgent = sorted.filter(x => x.priority === 'oos' || x.priority === 'overdue' || x.priority === 'amber').length

  return (
    <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header summary */}
      <div className="bg-abh-navy rounded-xl p-4 text-white">
        <p className="text-[11px] text-blue-200 uppercase tracking-wide mb-0.5">Route — Today's Priority</p>
        <p className="text-3xl font-bold">{urgent}</p>
        <p className="text-xs text-blue-300 mt-0.5">
          stores need attention
          {userLat != null ? ' · sorted by priority then distance' : ' · sorted by priority'}
        </p>
        {geoError && (
          <p className="text-xs text-abh-amber mt-1">
            Location unavailable — enable location access for distance sorting
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'woolworths', 'coles', 'metcash'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRetailerFilter(r)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
              ${retailerFilter === r ? 'bg-abh-navy text-white' : 'bg-white text-abh-dktext border border-abh-mdgrey'}`}
          >
            {r === 'all' ? 'All retailers' : RETAILER_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'oos', 'overdue', 'amber', 'new', 'ok'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
              ${priorityFilter === p ? 'bg-abh-navy text-white' : 'bg-white text-abh-dktext border border-abh-mdgrey'}`}
          >
            {p === 'all' ? 'All' : PRIORITY_LABEL[p].label}
            {p !== 'all' && (
              <span className="ml-1 opacity-70">
                {annotated.filter(x => (retailerFilter === 'all' || x.store.retailer === retailerFilter) && x.priority === p).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Store list */}
      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">
        {sorted.length} {sorted.length === 1 ? 'store' : 'stores'}
      </p>

      {sorted.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">No stores match the current filter.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(({ store, priority, days, km }) => {
            const p = PRIORITY_LABEL[priority]
            const oosSKUs = oosByStore.get(store.id) ?? []
            return (
              <div
                key={store.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${p.colour}`}>
                        {p.label}
                      </span>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${RETAILER_COLOUR[store.retailer]}`}>
                        {RETAILER_LABEL[store.retailer]}
                      </span>
                      {km != null && (
                        <span className="text-[10px] text-abh-blue font-medium">
                          {km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-abh-navy truncate">{store.name}</p>
                    <p className="text-xs text-gray-500">
                      {store.suburb}, {store.state} {store.postcode}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {days === null
                        ? 'Never visited'
                        : days === 0
                          ? 'Visited today'
                          : `Last visit ${days}d ago`}
                    </p>
                    {oosSKUs.length > 0 && (
                      <p className="text-[11px] text-abh-red font-medium mt-1">
                        OOS: {oosSKUs.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => checkIn(store)}
                    className="flex-shrink-0 bg-abh-navy text-white text-xs font-bold rounded-lg px-3 py-2
                               hover:bg-opacity-80 active:scale-95 transition-all"
                  >
                    Check in
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
