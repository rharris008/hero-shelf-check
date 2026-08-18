// ============================================================
// StorePicker — searchable store selector
// Queries Supabase directly (not IndexedDB) so it always
// reflects the live store list regardless of cache state.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Store, Retailer } from '../../types'

const RETAILER_LABELS: Record<Retailer, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash / IGA',
}

const RETAILER_COLOURS: Record<Retailer, string> = {
  woolworths: 'bg-green-100 text-green-800',
  coles: 'bg-red-100 text-red-800',
  metcash: 'bg-blue-100 text-blue-800',
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

interface StorePickerProps {
  onSelect: (store: Store) => void
  retailerFilter?: Retailer
  userLat?: number
  userLng?: number
}

export function StorePicker({ onSelect, retailerFilter, userLat, userLng }: StorePickerProps) {
  const [allStores, setAllStores] = useState<Store[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Store[]>([])
  const [selected, setSelected] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  // Nearest stores — top 3 by haversine distance when location is known
  const nearest = React.useMemo<Store[]>(() => {
    if (userLat == null || userLng == null || allStores.length === 0) return []
    return allStores
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({ s, km: haversineKm(userLat, userLng, s.latitude!, s.longitude!) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3)
      .map(x => x.s)
  }, [allStores, userLat, userLng])

  // Fetch all active stores from Supabase on mount
  useEffect(() => {
    let q = supabase
      .from('stores')
      .select('id, retailer, store_number, name, address_line1, suburb, state, postcode, latitude, longitude, is_active')
      .eq('is_active', true)
      .order('name')
    if (retailerFilter) q = q.eq('retailer', retailerFilter)

    q.then(({ data }) => {
      setAllStores((data ?? []) as Store[])
      setLoading(false)
    })
  }, [retailerFilter])

  const doSearch = useCallback((q: string) => {
    const term = q.toLowerCase().trim()
    if (!term) {
      setResults(allStores.slice(0, 50))
      return
    }
    setResults(
      allStores.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.suburb.toLowerCase().includes(term) ||
        (s.postcode ?? '').includes(term) ||
        s.store_number.toLowerCase().includes(term)
      ).slice(0, 50)
    )
  }, [allStores])

  // Re-filter when query or store list changes
  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 150)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function handleSelect(store: Store) {
    setSelected(store)
    onSelect(store)
    setResults([])
    setQuery('')
  }

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="flex items-start justify-between bg-white rounded-xl border-2 border-abh-blue p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_COLOURS[selected.retailer]}`}>
                {RETAILER_LABELS[selected.retailer]}
              </span>
              <span className="text-xs text-gray-400">{selected.store_number}</span>
            </div>
            <p className="font-semibold text-abh-dktext" style={{ fontFamily: 'Arial, sans-serif' }}>
              {selected.name}
            </p>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
              {selected.suburb}, {selected.state} {selected.postcode}
            </p>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="text-abh-blue text-sm font-medium hover:underline ml-4 flex-shrink-0"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            Change
          </button>
        </div>
      ) : (
        <div>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={loading ? 'Loading stores...' : `Search ${allStores.length} stores...`}
            disabled={loading}
            className="w-full border border-abh-mdgrey rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-abh-blue bg-white shadow-sm
                       disabled:opacity-50"
            style={{ fontFamily: 'Arial, sans-serif' }}
            autoFocus
          />

          {/* Nearest stores — shown when no query typed and location available */}
          {!loading && query.length === 0 && nearest.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1 px-1"
                 style={{ fontFamily: 'Arial, sans-serif' }}>
                Nearest to you
              </p>
              <ul className="space-y-1 mb-3">
                {nearest.map(store => (
                  <li key={store.id}>
                    <button
                      onClick={() => handleSelect(store)}
                      className="w-full text-left bg-abh-ltgrey rounded-lg px-4 py-2.5 shadow-sm
                                 hover:bg-abh-blue/10 active:bg-abh-blue/20 transition-colors
                                 border border-abh-blue/30"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_COLOURS[store.retailer]}`}>
                          {RETAILER_LABELS[store.retailer]}
                        </span>
                        <span className="text-[10px] text-abh-blue font-medium">
                          {haversineKm(userLat!, userLng!, store.latitude!, store.longitude!).toFixed(1)} km
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-abh-dktext" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {store.name}
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {store.suburb}, {store.state} {store.postcode}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1 px-1"
                 style={{ fontFamily: 'Arial, sans-serif' }}>
                Or search all stores
              </p>
            </div>
          )}

          {!loading && results.length === 0 && query.length > 1 && (
            <p className="text-center text-sm text-gray-400 mt-3" style={{ fontFamily: 'Arial, sans-serif' }}>
              No stores found. Try a different search.
            </p>
          )}

          <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto">
            {results.map(store => (
              <li key={store.id}>
                <button
                  onClick={() => handleSelect(store)}
                  className="w-full text-left bg-white rounded-lg px-4 py-3 shadow-sm
                             hover:bg-abh-ltgrey active:bg-gray-200 transition-colors border border-transparent
                             hover:border-abh-mdgrey"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_COLOURS[store.retailer]}`}>
                      {RETAILER_LABELS[store.retailer]}
                    </span>
                    <span className="text-xs text-gray-400">{store.store_number}</span>
                  </div>
                  <p className="text-sm font-semibold text-abh-dktext" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {store.name}
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {store.suburb}, {store.state} {store.postcode}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
