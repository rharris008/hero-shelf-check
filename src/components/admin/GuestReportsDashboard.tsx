// Guest Reports Dashboard — state → store → SKU drill-down for guest_reports table

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

interface GuestReport {
  id: string
  created_at: string
  store_id: string | null
  store_name_manual: string | null
  sku_id: string
  sku_name: string
  shelf_units: number | null
  is_oos: boolean
  comment: string | null
  stores: { name: string; retailer: string; suburb: string | null; state: string } | null
}

const RETAILER_LABEL: Record<string, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash / IGA',
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '?'
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p: Intl.DateTimeFormatPart) => p.type === type)?.value ?? '00'
  return `${get('day')}/${get('month')} ${get('hour')}:${get('minute')}`
}

function getStoreName(r: GuestReport): string {
  return r.stores?.name ?? r.store_name_manual ?? 'Unknown store'
}

function getStateName(r: GuestReport): string {
  return r.stores?.state ?? 'Unknown'
}

function storeKey(r: GuestReport): string {
  return r.store_id ?? r.store_name_manual ?? 'unknown'
}

export function GuestReportsDashboard() {
  const [reports, setReports] = useState<GuestReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedStoreKey, setSelectedStoreKey] = useState<string | null>(null)
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null)

  useEffect(() => {
    ;(supabase as any)
      .from('guest_reports')
      .select('id, created_at, store_id, store_name_manual, sku_id, sku_name, shelf_units, is_oos, comment, stores(name, retailer, suburb, state)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }: { data: GuestReport[] | null }) => {
        if (data) setReports(data)
        setLoading(false)
      })
  }, [])

  // Group by state
  const byState = useMemo(() => {
    const map = new Map<string, GuestReport[]>()
    reports.forEach(r => {
      const s = getStateName(r)
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(r)
    })
    return Array.from(map.entries())
      .map(([state, rows]) => ({
        state,
        rows,
        oosCount: rows.filter(r => r.is_oos || r.shelf_units === 0).length,
        storeCount: new Set(rows.map(storeKey)).size,
      }))
      .sort((a, b) => b.rows.length - a.rows.length)
  }, [reports])

  // Stores in selected state
  const byStore = useMemo(() => {
    if (!selectedState) return []
    const stateRows = reports.filter(r => getStateName(r) === selectedState)
    const map = new Map<string, GuestReport[]>()
    stateRows.forEach(r => {
      const k = storeKey(r)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    })
    return Array.from(map.entries())
      .map(([k, rows]) => ({
        key: k,
        storeName: getStoreName(rows[0]),
        retailer: rows[0].stores?.retailer ?? '',
        suburb: rows[0].stores?.suburb ?? '',
        rows,
        oosCount: rows.filter(r => r.is_oos || r.shelf_units === 0).length,
        lastDate: rows[0].created_at,
      }))
      .sort((a, b) => b.oosCount - a.oosCount || new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
  }, [reports, selectedState])

  // Reports for selected store
  const storeReports = useMemo(() => {
    if (!selectedStoreKey) return []
    return reports.filter(r => storeKey(r) === selectedStoreKey)
  }, [reports, selectedStoreKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>Loading…</p>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 px-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        <p className="text-base font-bold text-abh-navy mb-1">No guest reports yet</p>
        <p className="text-sm text-gray-400">Reports submitted via the public /report link will appear here.</p>
      </div>
    )
  }

  // ---- Store drill-down: SKU breakdown ----
  if (selectedStoreKey && selectedStoreName) {
    const bySkuMap = new Map<string, GuestReport[]>()
    storeReports.forEach(r => {
      if (!bySkuMap.has(r.sku_name)) bySkuMap.set(r.sku_name, [])
      bySkuMap.get(r.sku_name)!.push(r)
    })
    const bySku = Array.from(bySkuMap.entries())

    return (
      <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex items-center gap-1 text-xs flex-wrap">
          <button onClick={() => { setSelectedState(null); setSelectedStoreKey(null); setSelectedStoreName(null) }}
            className="text-abh-blue hover:underline">All States</button>
          <span className="text-gray-300">›</span>
          <button onClick={() => { setSelectedStoreKey(null); setSelectedStoreName(null) }}
            className="text-abh-blue hover:underline">{selectedState}</button>
          <span className="text-gray-300">›</span>
          <span className="font-bold text-abh-navy">{selectedStoreName}</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-abh-navy">
            <p className="text-xs font-bold text-white uppercase tracking-wide">
              {storeReports.length} report{storeReports.length !== 1 ? 's' : ''} · {bySku.length} SKU{bySku.length !== 1 ? 's' : ''}
            </p>
          </div>
          {bySku.map(([skuName, rows], i) => {
            const oosCount = rows.filter(r => r.is_oos || r.shelf_units === 0).length
            const latest = rows[0]
            return (
              <div key={skuName} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-abh-dktext">{skuName}</p>
                    <p className="text-[10px] text-gray-400">
                      {rows.length} report{rows.length !== 1 ? 's' : ''} · last {fmtDate(latest.created_at)}
                    </p>
                  </div>
                  {oosCount > 0 && (
                    <span className="text-xs font-bold text-abh-red bg-red-50 rounded px-2 py-0.5 flex-shrink-0">
                      {oosCount} OOS
                    </span>
                  )}
                </div>
                {rows.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1 border-t border-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.is_oos || r.shelf_units === 0 ? 'bg-abh-red' : 'bg-abh-green'}`} />
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{fmtDate(r.created_at)}</span>
                      {r.comment && (
                        <span className="text-[10px] text-gray-400 italic truncate">"{r.comment}"</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold flex-shrink-0 ${r.is_oos || r.shelf_units === 0 ? 'text-abh-red' : 'text-abh-green'}`}>
                      {r.is_oos || r.shelf_units === 0 ? 'OOS' : `${r.shelf_units} on shelf`}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- State drill-down: stores ----
  if (selectedState) {
    return (
      <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setSelectedState(null)} className="text-abh-blue hover:underline">All States</button>
          <span className="text-gray-300">›</span>
          <span className="font-bold text-abh-navy">{selectedState}</span>
        </div>

        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By Store</p>
        <div className="space-y-2">
          {byStore.map(store => (
            <button
              key={store.key}
              onClick={() => { setSelectedStoreKey(store.key); setSelectedStoreName(store.storeName) }}
              className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:border-abh-blue hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-abh-navy truncate">{store.storeName}</p>
                  <p className="text-[10px] text-gray-400">
                    {RETAILER_LABEL[store.retailer] ?? store.retailer}
                    {store.suburb ? ` · ${store.suburb}` : ''}
                    {' · '}{store.rows.length} report{store.rows.length !== 1 ? 's' : ''}
                    {' · last '}{fmtDate(store.lastDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {store.oosCount > 0 && (
                    <span className="text-xs font-bold text-abh-red bg-red-50 rounded px-2 py-0.5">{store.oosCount} OOS</span>
                  )}
                  <span className="text-abh-blue text-sm">›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- National: by state ----
  const totalOOS = reports.filter(r => r.is_oos || r.shelf_units === 0).length
  const totalStores = new Set(reports.map(storeKey)).size

  return (
    <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-abh-navy rounded-xl p-4 text-white shadow-sm">
        <p className="text-[11px] text-blue-200 uppercase tracking-wide mb-0.5">Guest Reports</p>
        <p className="text-3xl font-bold text-white">{reports.length}</p>
        <p className="text-[11px] text-blue-300 mt-0.5">
          {totalOOS} OOS · {totalStores} store{totalStores !== 1 ? 's' : ''}
        </p>
      </div>

      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By State</p>
      <div className="space-y-2">
        {byState.map(({ state, rows, oosCount, storeCount }) => (
          <button
            key={state}
            onClick={() => setSelectedState(state)}
            className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:border-abh-blue hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-abh-navy">{state}</p>
                <p className="text-[10px] text-gray-400">
                  {storeCount} store{storeCount !== 1 ? 's' : ''} · {rows.length} report{rows.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {oosCount > 0 && (
                  <span className="text-xs font-bold text-abh-red bg-red-50 rounded px-2 py-0.5">{oosCount} OOS</span>
                )}
                <span className="text-abh-blue text-sm">›</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
