// ============================================================
// VisitHistory — rep's recent visits from Supabase
// Falls back to queued (unsynced) items if offline.
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getQueue, resetAllAttempts } from '../../lib/db'
import { runSync } from '../../lib/sync'
import type { OfflineQueueItem } from '../../types'

interface VisitRow {
  id: string
  store_name: string
  retailer: string
  visit_date: string
  visit_time: string
  sku_count: number
}

export function VisitHistory() {
  const { repUser } = useAuth()
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [queued, setQueued] = useState<OfflineQueueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!repUser) return

    Promise.all([
      // Synced visits from Supabase
      supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          visit_time,
          stores!inner(name, retailer),
          observations(count)
        `)
        .eq('rep_id', repUser.id)
        .order('visit_date', { ascending: false })
        .order('visit_time', { ascending: false })
        .limit(30),

      // Pending offline queue
      getQueue(),
    ]).then(([{ data }, q]) => {
      const rows: VisitRow[] = (data ?? []).map((v: any) => ({
        id: v.id,
        store_name: v.stores?.name ?? 'Unknown store',
        retailer: v.stores?.retailer ?? '',
        visit_date: v.visit_date,
        visit_time: v.visit_time,
        sku_count: v.observations?.[0]?.count ?? 0,
      }))
      setVisits(rows)
      setQueued(q)
      setLoading(false)
    })
  }, [repUser])

  const RETAILER_LABELS: Record<string, string> = {
    woolworths: 'Woolworths', coles: 'Coles', metcash: 'Metcash / IGA',
  }
  const RETAILER_COLOURS: Record<string, string> = {
    woolworths: 'bg-green-100 text-green-800',
    coles: 'bg-red-100 text-red-800',
    metcash: 'bg-blue-100 text-blue-800',
  }

  function formatDate(d: string) {
    const today = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane' })
      .split('/').reverse().join('-')
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane' })
      .split('/').reverse().join('-')
    if (d === today) return 'Today'
    if (d === yesterday) return 'Yesterday'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-abh-navy text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
          My visits
        </h1>
        {!loading && visits.length > 0 && (
          <span className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
            {visits.length} visits
          </span>
        )}
      </div>

      {/* Pending offline items */}
      {queued.length > 0 && (
        <div className="bg-amber-50 border border-abh-amber rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 bg-abh-amber rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-abh-amber" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {queued.length} visit{queued.length !== 1 ? 's' : ''} waiting to sync
                </p>
              </div>
              <p className="text-xs text-amber-600 ml-4" style={{ fontFamily: 'Arial, sans-serif' }}>
                Will upload automatically when connected.
              </p>
            </div>
            <button
              onClick={async () => {
                await resetAllAttempts()
                await runSync()
                const q = await getQueue()
                setQueued(q)
              }}
              className="text-xs font-bold text-abh-amber border border-abh-amber rounded-lg px-3 py-1.5 flex-shrink-0 hover:bg-amber-100 active:bg-amber-200"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Retry now
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-gray-400 py-8" style={{ fontFamily: 'Arial, sans-serif' }}>
          Loading...
        </p>
      )}

      {!loading && visits.length === 0 && queued.length === 0 && (
        <div className="text-center py-12 px-6" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="w-14 h-14 bg-abh-ltgrey rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 mb-1">No visits recorded yet.</p>
          <p className="text-xs text-gray-400 mb-5">Head to a store and log your first shelf check.</p>
          <a href="#/check"
             className="bg-abh-navy text-white text-sm font-semibold rounded-xl px-5 py-2.5 inline-block">
            Start a check
          </a>
        </div>
      )}

      <ul className="space-y-2">
        {visits.map(v => (
          <li key={v.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${RETAILER_COLOURS[v.retailer] ?? 'bg-gray-100 text-gray-600'}`}>
                    {RETAILER_LABELS[v.retailer] ?? v.retailer}
                  </span>
                  <span className="text-[10px] text-gray-400">{v.sku_count} SKU{v.sku_count !== 1 ? 's' : ''}</span>
                </div>
                <p className="font-semibold text-abh-dktext text-sm truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {v.store_name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-abh-navy" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {formatDate(v.visit_date)}
                </p>
                <p className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {v.visit_time}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
