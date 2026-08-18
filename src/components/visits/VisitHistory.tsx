// ============================================================
// VisitHistory — rep's recent visits from Supabase
// Falls back to queued (unsynced) items if offline.
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getQueue } from '../../lib/db'
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

  function formatDate(d: string) {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-abh-navy text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
        My visits
      </h1>

      {/* Pending offline items */}
      {queued.length > 0 && (
        <div className="bg-amber-50 border border-abh-amber rounded-xl p-3">
          <p className="text-sm font-semibold text-abh-amber" style={{ fontFamily: 'Arial, sans-serif' }}>
            {queued.length} visit{queued.length !== 1 ? 's' : ''} pending sync
          </p>
          <p className="text-xs text-amber-600 mt-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>
            Will upload when connected.
          </p>
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-gray-400 py-8" style={{ fontFamily: 'Arial, sans-serif' }}>
          Loading...
        </p>
      )}

      {!loading && visits.length === 0 && queued.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-12" style={{ fontFamily: 'Arial, sans-serif' }}>
          No visits recorded yet. Use Shelf Check to log your first visit.
        </p>
      )}

      <ul className="space-y-2">
        {visits.map(v => (
          <li key={v.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-abh-dktext text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {v.store_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {v.retailer} · {v.sku_count} SKU{v.sku_count !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
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
