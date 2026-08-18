// ============================================================
// VisitForm — the core shelf-check capture screen
// One form per store visit. Records shelf units (mandatory)
// and backroom status (3-state) for each hero SKU.
// ============================================================

import React, { useState } from 'react'
import { StorePicker } from '../stores/StorePicker'
import { useAuth } from '../../contexts/AuthContext'
import { enqueue } from '../../lib/db'
import type { Store, SkuObservation, BackroomStatus, Retailer } from '../../types'
import { HERO_SKUS } from '../../types'

const BACKROOM_OPTIONS: { value: BackroomStatus; label: string }[] = [
  { value: 'counted',       label: 'Counted' },
  { value: 'none_present',  label: 'None present' },
  { value: 'not_checked',   label: 'Not checked' },
]

function makeAestDate(): { date: string; time: string } {
  // Always use local AEST components — never toISOString()
  const now = new Date()
  const aest = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }))
  const yyyy = aest.getFullYear()
  const mm   = String(aest.getMonth() + 1).padStart(2, '0')
  const dd   = String(aest.getDate()).padStart(2, '0')
  const hh   = String(aest.getHours()).padStart(2, '0')
  const min  = String(aest.getMinutes()).padStart(2, '0')
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` }
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function VisitForm() {
  const { repUser } = useAuth()
  const [store, setStore] = useState<Store | null>(null)
  const [observations, setObservations] = useState<Map<string, SkuObservation>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Filter SKUs to those relevant to the selected store's retailer
  const visibleSkus = store
    ? HERO_SKUS.filter(s => s.retailers.includes(store.retailer as Retailer))
    : HERO_SKUS

  function updateObs(skuId: string, patch: Partial<SkuObservation>) {
    setObservations(prev => {
      const next = new Map(prev)
      const existing = next.get(skuId) ?? {
        sku_id: skuId,
        shelf_units: 0,
        backroom_status: 'not_checked',
        backroom_units: null,
        notes: '',
      }
      next.set(skuId, { ...existing, ...patch })
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!store || !repUser) return

    const missingObs = visibleSkus.filter(s => !observations.has(s.id))
    if (missingObs.length > 0) {
      alert(`Please complete shelf count for: ${missingObs.map(s => s.name).join(', ')}`)
      return
    }

    setSubmitting(true)
    const { date, time } = makeAestDate()

    await enqueue({
      id: uuid(),
      store_id: store.id,
      rep_id: repUser.id,
      visit_date: date,
      visit_time: time,
      observations: Array.from(observations.values()),
      created_at: new Date().toISOString(),
    })

    setSubmitted(true)
    setSubmitting(false)
  }

  function reset() {
    setStore(null)
    setObservations(new Map())
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-abh-green rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-abh-dktext mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
          Visit recorded
        </h2>
        <p className="text-gray-500 text-sm mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>
          Queued for sync. Will upload within 60 seconds when connected.
        </p>
        <button
          onClick={reset}
          className="bg-abh-navy text-white font-semibold rounded-xl px-6 py-3 text-sm"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          New visit
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Store */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-abh-navy mb-3 text-sm uppercase tracking-wide" style={{ fontFamily: 'Arial, sans-serif' }}>
          1. Select store
        </h2>
        <StorePicker onSelect={setStore} />
      </section>

      {/* Step 2: SKU observations — only show when store is selected */}
      {store && (
        <section className="space-y-3">
          <h2 className="font-bold text-abh-navy text-sm uppercase tracking-wide px-1" style={{ fontFamily: 'Arial, sans-serif' }}>
            2. Shelf availability
          </h2>

          {visibleSkus.map(sku => {
            const obs = observations.get(sku.id)
            return (
              <div key={sku.id} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="font-semibold text-abh-dktext mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {sku.name}
                </p>

                {/* Shelf units — mandatory */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Shelf units (mandatory)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={obs?.shelf_units ?? ''}
                    onChange={e => updateObs(sku.id, { shelf_units: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-abh-blue"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                    placeholder="0"
                  />
                </div>

                {/* Backroom status — 3-state */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Backroom
                  </label>
                  <div className="flex gap-2">
                    {BACKROOM_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateObs(sku.id, { backroom_status: opt.value, backroom_units: null })}
                        className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors
                          ${obs?.backroom_status === opt.value
                            ? 'bg-abh-navy text-white'
                            : 'bg-abh-ltgrey text-abh-dktext hover:bg-gray-200'
                          }`}
                        style={{ fontFamily: 'Arial, sans-serif' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backroom unit count — only if status === 'counted' */}
                {obs?.backroom_status === 'counted' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Backroom units
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={obs.backroom_units ?? ''}
                      onChange={e => updateObs(sku.id, { backroom_units: parseInt(e.target.value, 10) || 0 })}
                      className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-abh-blue"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={obs?.notes ?? ''}
                    onChange={e => updateObs(sku.id, { notes: e.target.value })}
                    className="w-full border border-abh-mdgrey rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-abh-blue"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                    placeholder="E.g. facing only, out-of-stock tag, wrong bay..."
                  />
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Submit */}
      {store && (
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-abh-navy text-white font-bold rounded-xl py-4 text-sm
                     hover:bg-opacity-90 active:bg-opacity-80 disabled:opacity-50 transition-colors shadow-lg"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {submitting ? 'Saving...' : 'Save visit'}
        </button>
      )}
    </form>
  )
}
