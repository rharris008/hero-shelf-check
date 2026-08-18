// ============================================================
// AdminDashboard — prioritised action list (Red / Amber / Grey)
// Red:   shelf = 0 and backroom = none_present  → lost sale
// Amber: shelf = 0 and backroom = counted       → stock in backroom, push to shelf
// Grey:  not visited in 7+ days                 → coverage gap
// Data: store_availability_summary view (run database/002_view_backroom_rep.sql first)
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { StoreAvailabilitySummary, Retailer } from '../../types'

const RETAILER_LABELS: Record<string, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash',
}

type Priority = 'red' | 'amber' | 'grey' | 'green'

function getPriority(row: StoreAvailabilitySummary): Priority {
  const shelf = row.latest_shelf_units
  const backroom = row.latest_backroom_status
  const days = row.days_since_visit ?? 999

  // Never visited = grey (no data)
  if (row.last_visit_date === null) return 'grey'

  // Zero shelf
  if (shelf === 0) {
    if (backroom === 'none_present') return 'red'   // lost sale — nothing anywhere
    if (backroom === 'counted')      return 'amber'  // stock out back, push to shelf
    if (backroom === 'not_checked')  return 'amber'  // unknown backroom, needs check
    // backroom null = view not yet patched — treat zero shelf as amber
    return 'amber'
  }

  // Has stock but stale visit
  if (days > 7) return 'grey'

  return 'green'
}

function priorityOrder(p: Priority): number {
  return { red: 0, amber: 1, grey: 2, green: 3 }[p]
}

const PRIORITY_CONFIG = {
  red: {
    label: 'Lost sale',
    sub: 'Zero on shelf — no backroom stock',
    dot: 'bg-abh-red',
    border: 'border-abh-red',
    badge: 'bg-abh-red text-white',
  },
  amber: {
    label: 'Easy win',
    sub: 'Zero on shelf — stock in backroom or unchecked',
    dot: 'bg-abh-amber',
    border: 'border-abh-amber',
    badge: 'bg-abh-amber text-white',
  },
  grey: {
    label: 'Coverage gap',
    sub: 'Not visited in 7+ days',
    dot: 'bg-gray-400',
    border: 'border-gray-400',
    badge: 'bg-gray-400 text-white',
  },
  green: {
    label: 'OK',
    sub: 'On shelf, visited recently',
    dot: 'bg-abh-green',
    border: 'border-abh-green',
    badge: 'bg-abh-green text-white',
  },
}

export function AdminDashboard() {
  const [data, setData] = useState<StoreAvailabilitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [retailerFilter, setRetailerFilter] = useState<Retailer | 'all'>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [skuFilter, setSkuFilter] = useState<string>('all')
  const [showGreen, setShowGreen] = useState(false)

  useEffect(() => {
    supabase
      .from('store_availability_summary')
      .select('*')
      .limit(500)
      .then(({ data: rows }) => {
        setData((rows ?? []) as StoreAvailabilitySummary[])
        setLoading(false)
      })
  }, [])

  const states = ['all', ...Array.from(new Set(data.map(d => d.state).filter(Boolean))).sort()]
  const retailers: Array<Retailer | 'all'> = ['all', 'woolworths', 'coles', 'metcash']
  const skus = ['all', ...Array.from(new Set(data.map(d => d.sku_name).filter(Boolean))).sort()]

  const filtered = data.filter(d => {
    if (retailerFilter !== 'all' && d.retailer !== retailerFilter) return false
    if (stateFilter !== 'all' && d.state !== stateFilter) return false
    if (skuFilter !== 'all' && d.sku_name !== skuFilter) return false
    return true
  })

  const withPriority = filtered
    .map(d => ({ ...d, priority: getPriority(d) }))
    .sort((a, b) => {
      const po = priorityOrder(a.priority) - priorityOrder(b.priority)
      if (po !== 0) return po
      return a.store_name.localeCompare(b.store_name)
    })

  const redRows   = withPriority.filter(r => r.priority === 'red')
  const amberRows = withPriority.filter(r => r.priority === 'amber')
  const greyRows  = withPriority.filter(r => r.priority === 'grey')
  const greenRows = withPriority.filter(r => r.priority === 'green')

  const actionRows = showGreen
    ? withPriority
    : withPriority.filter(r => r.priority !== 'green')

  function backroomLabel(status: string | null): string {
    if (!status) return ''
    if (status === 'counted')      return 'Stock in backroom'
    if (status === 'none_present') return 'No backroom stock'
    if (status === 'not_checked')  return 'Backroom not checked'
    return status
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 className="font-bold text-abh-navy text-lg">Action list</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-2">
        {/* Red */}
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-abh-red">
          <p className="text-[10px] text-gray-500 leading-tight mb-1">Lost sales</p>
          <p className="text-xl font-bold text-abh-red">{loading ? '...' : redRows.length}</p>
          <p className="text-[10px] text-gray-400 leading-tight">zero shelf + no stock</p>
        </div>
        {/* Amber */}
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-abh-amber">
          <p className="text-[10px] text-gray-500 leading-tight mb-1">Easy wins</p>
          <p className="text-xl font-bold text-abh-amber">{loading ? '...' : amberRows.length}</p>
          <p className="text-[10px] text-gray-400 leading-tight">stock in backroom</p>
        </div>
        {/* Grey */}
        <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-gray-400">
          <p className="text-[10px] text-gray-500 leading-tight mb-1">Stale</p>
          <p className="text-xl font-bold text-gray-500">{loading ? '...' : greyRows.length}</p>
          <p className="text-[10px] text-gray-400 leading-tight">7+ days no visit</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={retailerFilter}
          onChange={e => setRetailerFilter(e.target.value as Retailer | 'all')}
          className="border border-abh-mdgrey rounded-lg px-2 py-1.5 text-xs bg-white"
        >
          {retailers.map(r => (
            <option key={r} value={r}>{r === 'all' ? 'All retailers' : RETAILER_LABELS[r]}</option>
          ))}
        </select>

        <select
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          className="border border-abh-mdgrey rounded-lg px-2 py-1.5 text-xs bg-white"
        >
          {states.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All states' : s}</option>
          ))}
        </select>

        <select
          value={skuFilter}
          onChange={e => setSkuFilter(e.target.value)}
          className="border border-abh-mdgrey rounded-lg px-2 py-1.5 text-xs bg-white"
        >
          {skus.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All SKUs' : s}</option>
          ))}
        </select>

        <button
          onClick={() => setShowGreen(g => !g)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            showGreen
              ? 'bg-abh-green text-white border-abh-green'
              : 'bg-white text-gray-500 border-abh-mdgrey'
          }`}
        >
          {showGreen ? `Hide OK (${greenRows.length})` : `Show OK (${greenRows.length})`}
        </button>
      </div>

      {/* Action list */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Loading...</p>
      ) : actionRows.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-abh-green font-bold text-base mb-1">All clear</p>
          <p className="text-xs text-gray-400">No action items match the selected filters.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {actionRows.map((row, i) => {
            const cfg = PRIORITY_CONFIG[row.priority]
            return (
              <li
                key={`${row.store_id}-${row.sku_id}-${i}`}
                className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${cfg.border}`}
              >
                <div className="flex items-start gap-2">
                  {/* Priority dot */}
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-abh-dktext truncate">
                        {row.store_name}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {row.sku_name}
                      {row.retailer ? ` · ${RETAILER_LABELS[row.retailer] ?? row.retailer}` : ''}
                      {row.state ? ` · ${row.state}` : ''}
                    </p>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {/* Shelf count */}
                      <span className={`text-xs font-bold ${
                        row.latest_shelf_units === 0 ? 'text-abh-red' : 'text-abh-green'
                      }`}>
                        {row.latest_shelf_units != null ? `${row.latest_shelf_units} on shelf` : 'No data'}
                      </span>

                      {/* Backroom */}
                      {row.latest_backroom_status && (
                        <span className="text-xs text-gray-500">
                          {backroomLabel(row.latest_backroom_status)}
                        </span>
                      )}

                      {/* Days + rep */}
                      <span className="text-xs text-gray-400">
                        {row.days_since_visit != null
                          ? `${row.days_since_visit}d ago`
                          : 'Never visited'}
                        {row.last_rep_name ? ` · ${row.last_rep_name}` : ''}
                      </span>
                    </div>

                    {/* Shelf photo thumbnail if available */}
                    {row.latest_photo_url && (
                      <div className="mt-2">
                        <img
                          src={row.latest_photo_url}
                          alt={`${row.store_name} shelf`}
                          className="h-20 w-28 object-cover rounded-lg border border-abh-mdgrey"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Count footer */}
      {!loading && actionRows.length > 0 && (
        <p className="text-center text-xs text-gray-400 pb-2">
          Showing {actionRows.length} of {filtered.length} store/SKU combinations
        </p>
      )}
    </div>
  )
}
