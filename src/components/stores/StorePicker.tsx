// ============================================================
// StorePicker — searchable store selector
// Reference list only: no free-text entry for store names.
// Search by store name, suburb, postcode, or store number.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { searchStores } from '../../lib/db'
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

interface StorePickerProps {
  onSelect: (store: Store) => void
  retailerFilter?: Retailer
}

export function StorePicker({ onSelect, retailerFilter }: StorePickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Store[]>([])
  const [selected, setSelected] = useState<Store | null>(null)
  const [loading, setLoading] = useState(false)

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    const stores = await searchStores(q, retailerFilter)
    setResults(stores)
    setLoading(false)
  }, [retailerFilter])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 200)
    return () => clearTimeout(t)
  }, [query, doSearch])

  // Load initial list on mount
  useEffect(() => { doSearch('') }, [doSearch])

  function handleSelect(store: Store) {
    setSelected(store)
    onSelect(store)
    setResults([])
    setQuery('')
  }

  return (
    <div className="space-y-3">
      {selected ? (
        // Selected state: show store card with change button
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
        // Search state
        <div>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by store name, suburb or postcode..."
            className="w-full border border-abh-mdgrey rounded-xl px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-abh-blue bg-white shadow-sm"
            style={{ fontFamily: 'Arial, sans-serif' }}
            autoFocus
          />

          {loading && (
            <p className="text-center text-sm text-gray-400 mt-3" style={{ fontFamily: 'Arial, sans-serif' }}>
              Searching...
            </p>
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
