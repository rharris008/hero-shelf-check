// ============================================================
// AdminDashboard — availability summary by store/SKU/state
// Reads from store_availability_summary view in Supabase.
// PLACEHOLDER: analytics charts to be added in Stage 2.
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { StoreAvailabilitySummary, Retailer } from '../../types'

const RETAILER_LABELS: Record<string, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash',
}

export function AdminDashboard() {
  const [data, setData] = useState<StoreAvailabilitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [retailerFilter, setRetailerFilter] = useState<Retailer | 'all'>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')

  useEffect(() => {
    supabase
      .from('store_availability_summary')
      .select('*')
      .order('days_since_visit', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setData((data ?? []) as StoreAvailabilitySummary[])
        setLoading(false)
      })
  }, [])

  const states = ['all', ...Array.from(new Set(data.map(d => d.state).filter(Boolean))).sort()]
  const retailers: Array<Retailer | 'all'> = ['all', 'woolworths', 'coles', 'metcash']

  const filtered = data.filter(d => {
    if (retailerFilter !== 'all' && d.retailer !== retailerFilter) return false
    if (stateFilter !== 'all' && d.state !== stateFilter) return false
    return true
  })

  // Aggregate: stores not visited in >7 days
  const staleStores = new Set(
    filtered.filter(d => (d.days_since_visit ?? 999) > 7).map(d => d.store_id)
  )
  // Zero-shelf incidents (most recent observation = 0 units)
  const zeroShelf = filtered.filter(d => d.latest_shelf_units === 0)

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-abh-navy text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
        Coverage dashboard
      </h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-abh-navy">
          <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
            Stores not visited (7d+)
          </p>
          <p className="text-2xl font-bold text-abh-navy" style={{ fontFamily: 'Arial, sans-serif' }}>
            {loading ? '...' : staleStores.size}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-abh-red">
          <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
            Zero-shelf observations
          </p>
          <p className="text-2xl font-bold text-abh-red" style={{ fontFamily: 'Arial, sans-serif' }}>
            {loading ? '...' : zeroShelf.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={retailerFilter}
          onChange={e => setRetailerFilter(e.target.value as Retailer | 'all')}
          className="border border-abh-mdgrey rounded-lg px-3 py-2 text-sm bg-white"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {retailers.map(r => (
            <option key={r} value={r}>{r === 'all' ? 'All retailers' : RETAILER_LABELS[r]}</option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="border border-abh-mdgrey rounded-lg px-3 py-2 text-sm bg-white"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {states.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All states' : s}</option>
          ))}
        </select>
      </div>

      {/* PLACEHOLDER — chart area */}
      <div className="bg-abh-ltgrey border-2 border-dashed border-abh-mdgrey rounded-xl p-8 text-center">
        <p className="text-sm font-semibold text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
          Analytics charts — Stage 2
        </p>
        <p className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
          Availability trend by SKU, coverage heat map by state, compliance rate by rep.
        </p>
      </div>

      {/* Store list */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8" style={{ fontFamily: 'Arial, sans-serif' }}>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, 50).map((row, i) => (
            <li key={`${row.store_id}-${row.sku_id}-${i}`} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-abh-dktext" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {row.store_name}
                  </p>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {row.retailer} · {row.state} · {row.sku_name}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className={`text-sm font-bold ${row.latest_shelf_units === 0 ? 'text-abh-red' : 'text-abh-green'}`}
                     style={{ fontFamily: 'Arial, sans-serif' }}>
                    {row.latest_shelf_units ?? 'N/A'} units
                  </p>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {row.days_since_visit != null ? `${row.days_since_visit}d ago` : 'Never visited'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
