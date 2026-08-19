// ============================================================
// OSA Dashboard — macro to micro drill-down
// National → Retailer → State → City → Store → SKU
// ============================================================

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { getRegion } from '../../lib/regions'
import type { StoreAvailabilitySummary, Retailer } from '../../types'

// ---- Types --------------------------------------------------

type DrillLevel = 'national' | 'retailer' | 'state' | 'city' | 'store'

interface DrillState {
  level: DrillLevel
  retailer: Retailer | null
  state: string | null
  city: string | null
  storeId: string | null
  storeName: string | null
}

interface OSAMetrics {
  total: number
  visited: number
  inStock: number
  oos: number
  easyWin: number
  lostSale: number
  noData: number
  osa: number           // weighted % (10L×10, 5L×5, 2L×2, 6-pack×1)
  coverage: number      // % of unique stores visited
  weightedScore: number // achieved weighted points
  weightedTotal: number // max possible weighted points for visited combos
}

// ---- Helpers ------------------------------------------------

const RETAILER_LABEL: Record<string, string> = {
  woolworths: 'Woolworths',
  coles: 'Coles',
  metcash: 'Metcash / IGA',
}

// Weighted OSA: 10L=10, 5L=5, 2L=2, 600ml 6-pack=1
// Denominators: Coles=18, WW/Metcash=17
const SKU_WEIGHT: Record<string, number> = {
  'Pureau 10L Cask':    10,
  'Pureau 5L Cask':     5,
  'Pureau 2L Bottle':   2,
  'Pureau 600ml 6 Pack': 1,
}
function skuWeight(name: string): number {
  return SKU_WEIGHT[name] ?? 1
}

function computeMetrics(rows: StoreAvailabilitySummary[]): OSAMetrics {
  const visited  = rows.filter(r => r.last_visit_date !== null)
  const inStock  = visited.filter(r => (r.latest_shelf_units ?? 0) > 0)
  const oos      = visited.filter(r => (r.latest_shelf_units ?? 0) === 0)
  const easyWin  = oos.filter(r => r.latest_backroom_status === 'counted' || r.latest_backroom_status === 'not_checked')
  const lostSale = oos.filter(r => r.latest_backroom_status === 'none_present')
  const noData   = rows.filter(r => r.last_visit_date === null)

  const weightedTotal = visited.reduce((s, r) => s + skuWeight(r.sku_name), 0)
  const weightedScore = inStock.reduce((s, r) => s + skuWeight(r.sku_name), 0)

  return {
    total:         rows.length,
    visited:       visited.length,
    inStock:       inStock.length,
    oos:           oos.length,
    easyWin:       easyWin.length,
    lostSale:      lostSale.length,
    noData:        noData.length,
    osa:           weightedTotal > 0 ? Math.round(weightedScore / weightedTotal * 100) : 0,
    coverage:      rows.length > 0 ? Math.round(visited.length / rows.length * 100) : 0,
    weightedScore,
    weightedTotal,
  }
}

function uniqueStores(rows: StoreAvailabilitySummary[]): number {
  return new Set(rows.map(r => r.store_id)).size
}

function osaColor(pct: number): string {
  if (pct >= 90) return '#27AE60'
  if (pct >= 75) return '#E67E22'
  return '#C0392B'
}

function coverageColor(pct: number): string {
  if (pct >= 75) return '#27AE60'
  if (pct >= 40) return '#E67E22'
  return '#C0392B'
}

type StoreGrade = 'A' | 'B' | 'C' | 'N'
function storeGrade(metrics: OSAMetrics, daysSince: number | null): StoreGrade {
  if (daysSince === null) return 'N'
  if (daysSince <= 14 && metrics.osa >= 90) return 'A'
  if (daysSince <= 30 && metrics.osa >= 75) return 'B'
  return 'C'
}
const GRADE_STYLE: Record<StoreGrade, string> = {
  A: 'bg-abh-green text-white',
  B: 'bg-abh-amber text-white',
  C: 'bg-abh-red text-white',
  N: 'bg-gray-300 text-white',
}
function GradeBadge({ grade }: { grade: StoreGrade }) {
  return (
    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${GRADE_STYLE[grade]}`}>
      {grade === 'N' ? 'New' : grade}
    </span>
  )
}

// ---- Sub-components -----------------------------------------

function OSABar({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-2.5' : size === 'md' ? 'h-2' : 'h-1.5'
  const color = osaColor(value)
  return (
    <div className={`w-full bg-gray-200 rounded-full ${h} overflow-hidden`}>
      <div
        className={`${h} rounded-full transition-all`}
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}

function MetricTile({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: color ?? '#1B2A4A', fontFamily: 'Arial, sans-serif' }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Breadcrumb({ drill, onNav }: { drill: DrillState; onNav: (level: DrillLevel) => void }) {
  const crumbs: Array<{ label: string; level: DrillLevel }> = [
    { label: 'All Retailers', level: 'national' },
  ]
  if (drill.retailer) crumbs.push({ label: RETAILER_LABEL[drill.retailer] ?? drill.retailer, level: 'retailer' })
  if (drill.state)    crumbs.push({ label: drill.state, level: 'state' })
  if (drill.city)     crumbs.push({ label: drill.city, level: 'city' })
  if (drill.storeName) crumbs.push({ label: drill.storeName, level: 'store' })

  return (
    <div className="flex items-center gap-1 flex-wrap text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.level}>
          {i > 0 && <span className="text-gray-300">›</span>}
          <button
            onClick={() => onNav(c.level)}
            className={i === crumbs.length - 1
              ? 'font-bold text-abh-navy pointer-events-none'
              : 'text-abh-blue hover:underline'}
          >
            {c.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

function SKUTable({ rows }: { rows: StoreAvailabilitySummary[] }) {
  const skus = Array.from(new Set(rows.map(r => r.sku_name))).sort()
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-5 gap-0 px-3 py-2 bg-abh-navy text-white text-[10px] font-bold uppercase tracking-wide">
        <div className="col-span-2">SKU</div>
        <div className="text-center">OSA</div>
        <div className="text-center">OOS</div>
        <div className="text-center">Easy win</div>
      </div>
      {skus.map(sku => {
        const skuRows = rows.filter(r => r.sku_name === sku)
        const m = computeMetrics(skuRows)
        return (
          <div key={sku} className="grid grid-cols-5 gap-0 px-3 py-2 border-t border-gray-100 items-center">
            <div className="col-span-2 text-xs font-medium text-abh-dktext truncate pr-2">{sku}</div>
            <div className="text-center">
              <span className="text-xs font-bold" style={{ color: osaColor(m.osa) }}>{m.osa}%</span>
            </div>
            <div className="text-center text-xs text-abh-red font-bold">{m.oos > 0 ? m.oos : '–'}</div>
            <div className="text-center text-xs text-abh-amber font-bold">{m.easyWin > 0 ? m.easyWin : '–'}</div>
          </div>
        )
      })}
    </div>
  )
}

function DrillRowFull({ label, sub, metrics, storeCount, onClick, grade }: {
  label: string
  sub?: string
  metrics: OSAMetrics
  storeCount: number
  onClick: () => void
  grade?: StoreGrade
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left
                 hover:border-abh-blue hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-abh-navy truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
              {label}
            </p>
            {grade && <GradeBadge grade={grade} />}
          </div>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex gap-3">
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: osaColor(metrics.osa), fontFamily: 'Arial, sans-serif' }}>
                {metrics.osa}%
              </p>
              <p className="text-[9px] text-gray-400">OSA</p>
            </div>
            <div className="text-right border-l border-gray-100 pl-3">
              <p className="text-lg font-bold" style={{ color: coverageColor(metrics.coverage), fontFamily: 'Arial, sans-serif' }}>
                {metrics.coverage}%
              </p>
              <p className="text-[9px] text-gray-400">covered</p>
            </div>
          </div>
          <span className="text-abh-blue text-sm">›</span>
        </div>
      </div>
      <OSABar value={Math.round(metrics.osa * metrics.coverage / 100)} />
      <div className="flex gap-4 mt-2">
        <span className="text-[10px] text-gray-500">{storeCount} {storeCount === 1 ? 'store' : 'stores'}</span>
        {metrics.lostSale > 0 && <span className="text-[10px] text-abh-red font-bold">⚠ {metrics.lostSale} lost sales</span>}
        {metrics.easyWin > 0 && <span className="text-[10px] text-abh-amber font-bold">↑ {metrics.easyWin} easy wins</span>}
      </div>
    </button>
  )
}

function StoreCard({ rows }: { rows: StoreAvailabilitySummary[] }) {
  if (rows.length === 0) return null
  const first = rows[0]
  const m = computeMetrics(rows)
  const grade = storeGrade(m, first.days_since_visit)

  function backroomLabel(s: string | null): string {
    if (s === 'counted')      return 'In backroom'
    if (s === 'not_checked')  return 'Backroom not checked'
    if (s === 'none_present') return 'No backroom stock'
    return ''
  }

  return (
    <div className="space-y-3">
      {/* Store header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-base font-bold text-abh-navy" style={{ fontFamily: 'Arial, sans-serif' }}>
                {first.store_name}
              </p>
              <GradeBadge grade={grade} />
            </div>
            <p className="text-xs text-gray-500">
              {RETAILER_LABEL[first.retailer] ?? first.retailer}
              {first.suburb ? ` · ${first.suburb}` : ''}
              {first.state ? `, ${first.state}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {first.last_visit_date
                ? `Last visit ${first.days_since_visit}d ago${first.last_rep_name ? ` · ${first.last_rep_name}` : ''}`
                : 'Never visited'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: osaColor(m.osa), fontFamily: 'Arial, sans-serif' }}>
              {m.osa}%
            </p>
            <p className="text-[10px] text-gray-400">OSA</p>
          </div>
        </div>
        <OSABar value={m.osa} size="lg" />
      </div>

      {/* SKU breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 bg-abh-navy">
          <p className="text-xs font-bold text-white uppercase tracking-wide">SKU Detail</p>
        </div>
        {rows.map(row => {
          const shelf = row.latest_shelf_units
          const isOOS = shelf === 0
          const hasData = row.last_visit_date !== null
          const priority = !hasData ? 'no-data'
            : isOOS && row.latest_backroom_status === 'none_present' ? 'red'
            : isOOS ? 'amber'
            : 'green'

          const dotColor = priority === 'red' ? 'bg-abh-red'
            : priority === 'amber' ? 'bg-abh-amber'
            : priority === 'green' ? 'bg-abh-green'
            : 'bg-gray-300'

          return (
            <div key={row.sku_id} className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-abh-dktext">{row.sku_name}</p>
                    {hasData ? (
                      <p className="text-[10px] text-gray-400 mt-0.5">{backroomLabel(row.latest_backroom_status)}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400 mt-0.5">No visit data</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {hasData ? (
                    <>
                      <p className={`text-sm font-bold ${isOOS ? 'text-abh-red' : 'text-abh-green'}`}>
                        {shelf} on shelf
                      </p>
                      {row.avg_shelf_units_30d != null && (
                        <p className="text-[10px] text-gray-400">{Math.round(row.avg_shelf_units_30d)} avg/30d</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-300">–</p>
                  )}
                </div>
              </div>
              {row.latest_photo_url && (
                <div className="mt-2 ml-4">
                  <img
                    src={row.latest_photo_url}
                    alt="shelf"
                    className="h-24 w-32 object-cover rounded-lg border border-gray-200"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Main component -----------------------------------------

export function AdminDashboard() {
  const [allRows, setAllRows] = useState<StoreAvailabilitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [drill, setDrill] = useState<DrillState>({
    level: 'national',
    retailer: null,
    state: null,
    city: null,
    storeId: null,
    storeName: null,
  })

  useEffect(() => {
    async function loadAll() {
      const PAGE = 1000
      let offset = 0
      const collected: StoreAvailabilitySummary[] = []
      while (true) {
        const { data, error } = await supabase
          .from('store_availability_summary')
          .select('*')
          .range(offset, offset + PAGE - 1)
        if (error || !data || data.length === 0) break
        collected.push(...(data as StoreAvailabilitySummary[]))
        if (data.length < PAGE) break
        offset += PAGE
      }
      setAllRows(collected)
      setLoading(false)
    }
    loadAll()
  }, [])

  // Slice data to current drill context
  const ctxRows = useMemo(() => {
    let r = allRows
    if (drill.retailer) r = r.filter(x => x.retailer === drill.retailer)
    if (drill.state)    r = r.filter(x => x.state === drill.state)
    if (drill.city)     r = r.filter(x => getRegion(x.postcode ?? '', x.state) === drill.city)
    if (drill.storeId)  r = r.filter(x => x.store_id === drill.storeId)
    return r
  }, [allRows, drill])

  const ctxMetrics = useMemo(() => computeMetrics(ctxRows), [ctxRows])

  // Navigate breadcrumb
  function navTo(level: DrillLevel) {
    setDrill(d => ({
      ...d,
      level,
      retailer: level === 'national' ? null : d.retailer,
      state:    (level === 'national' || level === 'retailer') ? null : d.state,
      city:     (level === 'national' || level === 'retailer' || level === 'state') ? null : d.city,
      storeId:  level !== 'store' ? null : d.storeId,
      storeName: level !== 'store' ? null : d.storeName,
    }))
  }

  // Drill into a retailer
  function drillRetailer(retailer: Retailer) {
    setDrill({ level: 'retailer', retailer, state: null, city: null, storeId: null, storeName: null })
  }

  // Drill into a state (from retailer path — keeps retailer set)
  function drillState(state: string) {
    setDrill(d => ({ ...d, level: 'state', state, city: null, storeId: null, storeName: null }))
  }

  // Drill into a state directly from national (state-first path — no retailer filter)
  function drillStateNational(state: string) {
    setDrill({ level: 'state', retailer: null, state, city: null, storeId: null, storeName: null })
  }

  // Drill into a city
  function drillCity(city: string) {
    setDrill(d => ({ ...d, level: 'city', city, storeId: null, storeName: null }))
  }

  // Drill into a store
  function drillStore(storeId: string, storeName: string) {
    setDrill(d => ({ ...d, level: 'store', storeId, storeName }))
  }

  // ---- Compute group-by lists ----

  // Retailers (national level)
  const retailers = useMemo(() => {
    const keys = Array.from(new Set(allRows.map(r => r.retailer))).sort()
    return keys.map(retailer => {
      const rows = allRows.filter(r => r.retailer === retailer)
      return { retailer, rows, metrics: computeMetrics(rows), storeCount: uniqueStores(rows) }
    })
  }, [allRows])

  // States at national level — all retailers combined
  const statesNational = useMemo(() => {
    const keys = Array.from(new Set(allRows.map(r => r.state ?? 'Unknown'))).sort()
    return keys.map(state => {
      const rows = allRows.filter(r => (r.state ?? 'Unknown') === state)
      return { state, rows, metrics: computeMetrics(rows), storeCount: uniqueStores(rows) }
    })
  }, [allRows])

  // States (retailer level — filtered to selected retailer)
  const states = useMemo(() => {
    if (!drill.retailer) return []
    const keys = Array.from(new Set(ctxRows.map(r => r.state ?? 'Unknown'))).sort()
    return keys.map(state => {
      const rows = ctxRows.filter(r => (r.state ?? 'Unknown') === state)
      return { state, rows, metrics: computeMetrics(rows), storeCount: uniqueStores(rows) }
    })
  }, [ctxRows, drill.retailer])

  // Cities (state level)
  const cities = useMemo(() => {
    if (!drill.state) return []
    const keys = Array.from(new Set(ctxRows.map(r => getRegion(r.postcode ?? '', r.state)))).sort()
    return keys.map(city => {
      const rows = ctxRows.filter(r => getRegion(r.postcode ?? '', r.state) === city)
      return { city, rows, metrics: computeMetrics(rows), storeCount: uniqueStores(rows) }
    })
  }, [ctxRows, drill.state])

  // Stores (city level)
  const stores = useMemo(() => {
    if (!drill.city) return []
    const storeIds = Array.from(new Set(ctxRows.map(r => r.store_id)))
    return storeIds.map(storeId => {
      const rows = ctxRows.filter(r => r.store_id === storeId)
      const name = rows[0]?.store_name ?? storeId
      const metrics = computeMetrics(rows)
      const daysSince = rows[0]?.days_since_visit ?? null
      const grade = storeGrade(metrics, daysSince)
      return { storeId, name, rows, metrics, grade }
    }).sort((a, b) => a.metrics.osa - b.metrics.osa) // worst OSA first
  }, [ctxRows, drill.city])

  // Store rows for store-level detail
  const storeRows = useMemo(() => {
    if (!drill.storeId) return []
    return allRows.filter(r => r.store_id === drill.storeId)
  }, [allRows, drill.storeId])

  // Top 5 priority stores nationally: OOS + no backroom (lost sales), then overdue
  const topPriorityStores = useMemo(() => {
    const storeIds = Array.from(new Set(allRows.map(r => r.store_id)))
    return storeIds
      .map(sid => {
        const rows = allRows.filter(r => r.store_id === sid)
        const first = rows[0]
        const lostSaleSkus = rows.filter(r => r.latest_shelf_units === 0 && r.latest_backroom_status === 'none_present')
        const oosSkus = rows.filter(r => r.latest_shelf_units === 0)
        const overdue = first?.days_since_visit != null && first.days_since_visit > 30
        const neverVisited = first?.last_visit_date === null
        const score = lostSaleSkus.length * 100 + oosSkus.length * 10 + (overdue ? 5 : 0) + (neverVisited ? 1 : 0)
        return { sid, name: first?.store_name ?? sid, retailer: first?.retailer ?? '', suburb: first?.suburb ?? '', state: first?.state ?? '', lostSaleSkus, oosSkus, days: first?.days_since_visit ?? null, score }
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [allRows])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>Loading…</p>
      </div>
    )
  }

  if (allRows.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-16 h-16 bg-abh-ltgrey rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 17H5a2 2 0 01-2-2v-1a4 4 0 014-4h0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-base font-bold text-abh-navy mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
          No store data yet
        </p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
          Stores need to be added and at least one shelf-check visit completed before OSA data appears here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Breadcrumb */}
      <Breadcrumb drill={drill} onNav={navTo} />

      {/* Headline metrics */}
      {drill.level !== 'store' && (
        <>
          {/* OSA gauge */}
          <div className="bg-abh-navy rounded-xl p-4 text-white shadow-sm">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[11px] text-blue-200 uppercase tracking-wide mb-0.5">On Shelf Availability</p>
                <p className="text-4xl font-bold" style={{ color: osaColor(ctxMetrics.osa) }}>
                  {ctxMetrics.osa}%
                </p>
                <p className="text-[11px] text-blue-300 mt-0.5">
                  {ctxMetrics.weightedScore} / {ctxMetrics.weightedTotal} weighted pts · 10L×10, 5L×5, 2L×2
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-blue-200 uppercase tracking-wide mb-0.5">Coverage</p>
                <p className="text-2xl font-bold text-white">{ctxMetrics.coverage}%</p>
                <p className="text-[11px] text-blue-300 mt-0.5">{ctxMetrics.noData} never visited</p>
              </div>
            </div>
            <OSABar value={Math.round(ctxMetrics.osa * ctxMetrics.coverage / 100)} size="lg" />
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-3 gap-2">
            <MetricTile
              label="Lost sales"
              value={ctxMetrics.lostSale}
              sub="Zero shelf · no backroom"
              color="#C0392B"
            />
            <MetricTile
              label="Easy wins"
              value={ctxMetrics.easyWin}
              sub="Stock in backroom"
              color="#E67E22"
            />
            <MetricTile
              label="No coverage"
              value={ctxMetrics.noData}
              sub="Never visited"
              color="#999999"
            />
          </div>

          {/* SKU breakdown — always visible */}
          <SKUTable rows={ctxRows} />
        </>
      )}

      {/* ---- Level-specific drill lists ---- */}

      {/* National: top priorities + by retailer */}
      {drill.level === 'national' && (
        <>
          {topPriorityStores.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">Top Priorities</p>
              {topPriorityStores.map(store => (
                <button
                  key={store.sid}
                  onClick={() => drillStore(store.sid, store.name)}
                  className="w-full bg-white rounded-xl shadow-sm border-l-4 border-abh-red p-4 text-left
                             hover:shadow-md hover:border-red-600 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-abh-navy truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                        {store.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {RETAILER_LABEL[store.retailer] ?? store.retailer}
                        {store.suburb ? ` · ${store.suburb}` : ''}
                        {store.state ? `, ${store.state}` : ''}
                        {store.days !== null ? ` · ${store.days}d ago` : ' · Never visited'}
                      </p>
                    </div>
                    <span className="text-abh-blue text-sm flex-shrink-0">›</span>
                  </div>
                  {store.lostSaleSkus.length > 0 && (
                    <p className="text-[11px] text-abh-red font-semibold">
                      Lost sale: {store.lostSaleSkus.map(r => r.sku_name).join(', ')}
                    </p>
                  )}
                  {store.oosSkus.filter(r => r.latest_backroom_status !== 'none_present').length > 0 && (
                    <p className="text-[11px] text-abh-amber font-semibold">
                      OOS: {store.oosSkus.filter(r => r.latest_backroom_status !== 'none_present').map(r => r.sku_name).join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By Retailer</p>
            {retailers.map(({ retailer, metrics, storeCount }) => (
              <DrillRowFull
                key={retailer}
                label={RETAILER_LABEL[retailer] ?? retailer}
                sub={`${storeCount} ${storeCount === 1 ? 'store' : 'stores'}`}
                metrics={metrics}
                storeCount={storeCount}
                onClick={() => drillRetailer(retailer as Retailer)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By State</p>
            {statesNational.map(({ state, metrics, storeCount }) => (
              <DrillRowFull
                key={state}
                label={state}
                sub={`${storeCount} ${storeCount === 1 ? 'store' : 'stores'} · all retailers`}
                metrics={metrics}
                storeCount={storeCount}
                onClick={() => drillStateNational(state)}
              />
            ))}
          </div>
        </>
      )}

      {/* Retailer: by state */}
      {drill.level === 'retailer' && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By State</p>
          {states.map(({ state, metrics, storeCount }) => (
            <DrillRowFull
              key={state}
              label={state}
              sub={`${storeCount} ${storeCount === 1 ? 'store' : 'stores'}`}
              metrics={metrics}
              storeCount={storeCount}
              onClick={() => drillState(state)}
            />
          ))}
        </div>
      )}

      {/* State: by city/region */}
      {drill.level === 'state' && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">By Region</p>
          {cities.map(({ city, metrics, storeCount }) => (
            <DrillRowFull
              key={city}
              label={city}
              sub={`${storeCount} ${storeCount === 1 ? 'store' : 'stores'}`}
              metrics={metrics}
              storeCount={storeCount}
              onClick={() => drillCity(city)}
            />
          ))}
        </div>
      )}

      {/* City: by store — worst OSA first */}
      {drill.level === 'city' && (
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-bold px-1">
            By Store — worst OSA first
          </p>
          {stores.map(({ storeId, name, metrics, rows, grade }) => {
            const first = rows[0]
            const daySub = first?.days_since_visit != null
              ? `Last visited ${first.days_since_visit}d ago`
              : 'Never visited'
            return (
              <DrillRowFull
                key={storeId}
                label={name}
                sub={first?.suburb ? `${first.suburb} · ${daySub}` : daySub}
                metrics={metrics}
                storeCount={1}
                grade={grade}
                onClick={() => drillStore(storeId, name)}
              />
            )
          })}
        </div>
      )}

      {/* Store: SKU detail */}
      {drill.level === 'store' && storeRows.length > 0 && (
        <StoreCard rows={storeRows} />
      )}
    </div>
  )
}
