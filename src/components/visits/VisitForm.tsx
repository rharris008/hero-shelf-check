// ============================================================
// VisitForm — the core shelf-check capture screen
// One form per store visit. Records shelf units (mandatory)
// and backroom status (3-state) for each hero SKU.
// ============================================================

import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { StorePicker } from '../stores/StorePicker'
import { useAuth } from '../../contexts/AuthContext'
import { enqueue } from '../../lib/db'
import type { Store, SKU, SkuObservation, BackroomStatus, Retailer } from '../../types'
import { HERO_SKUS } from '../../types'

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_W = 800
      const scale = Math.min(1, MAX_W / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.80))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image file')) }
    img.src = url
  })
}

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
  const { repUser, liveSKUs } = useAuth()
  const location = useLocation()
  const preselected = (location.state as { preselectedStore?: Store } | null)?.preselectedStore ?? null
  const [store, setStore] = useState<Store | null>(preselected)
  const [observations, setObservations] = useState<Map<string, SkuObservation>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)

  // Request geolocation once on mount for nearest-store suggestion
  React.useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
      },
      () => { /* permission denied — silently continue without geo */ },
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  // Use live UUIDs from Supabase; fall back to hardcoded constants if offline/not yet loaded
  const activeSKUs: SKU[] = liveSKUs.length > 0 ? liveSKUs : HERO_SKUS

  // Filter SKUs to those relevant to the selected store's retailer
  const visibleSkus = store
    ? activeSKUs.filter(s => s.retailers.includes(store.retailer as Retailer))
    : activeSKUs

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
      setValidationError(`Complete shelf count for: ${missingObs.map(s => s.name).join(', ')}`)
      return
    }
    setValidationError(null)
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
    const obsArray = Array.from(observations.values())
    const oosCount = obsArray.filter(o => o.shelf_units === 0).length
    const totalChecked = obsArray.length
    const RETAILER_LABELS: Record<string, string> = {
      woolworths: 'Woolworths', coles: 'Coles', metcash: 'Metcash / IGA',
    }
    const RETAILER_COLOURS: Record<string, string> = {
      woolworths: 'bg-green-100 text-green-800',
      coles: 'bg-red-100 text-red-800',
      metcash: 'bg-blue-100 text-blue-800',
    }
    return (
      <div className="px-4 py-8 max-w-sm mx-auto text-center" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-16 h-16 bg-abh-green rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-abh-dktext mb-1">Visit recorded</h2>
        <p className="text-gray-400 text-xs mb-5">Queued for sync — will upload when connected.</p>

        {/* Visit summary card */}
        {store && (
          <div className="bg-white rounded-xl border border-abh-mdgrey p-4 text-left mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_COLOURS[store.retailer]}`}>
                {RETAILER_LABELS[store.retailer]}
              </span>
            </div>
            <p className="font-semibold text-abh-dktext text-sm">{store.name}</p>
            <p className="text-xs text-gray-500 mb-3">{store.suburb}, {store.state}</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-abh-ltgrey rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-abh-navy">{totalChecked}</p>
                <p className="text-xs text-gray-500">SKUs checked</p>
              </div>
              <div className={`flex-1 rounded-lg px-3 py-2 text-center ${oosCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-lg font-bold ${oosCount > 0 ? 'text-abh-red' : 'text-abh-green'}`}>{oosCount}</p>
                <p className="text-xs text-gray-500">Out of stock</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-abh-navy text-white font-semibold rounded-xl py-3 text-sm"
          >
            New visit
          </button>
          <a
            href="#/route"
            className="flex-1 border border-abh-navy text-abh-navy font-semibold rounded-xl py-3 text-sm flex items-center justify-center"
          >
            Back to route
          </a>
        </div>
      </div>
    )
  }

  // Progress: step 1 = pick store, step 2 = count SKUs
  const step = !store ? 1 : 2
  const totalSteps = 2

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 px-1" style={{ fontFamily: 'Arial, sans-serif' }}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
              s < step ? 'bg-abh-green text-white' : s === step ? 'bg-abh-navy text-white' : 'bg-abh-mdgrey text-white'
            }`}>
              {s < step ? '✓' : s}
            </div>
            <span className={`text-xs ${s === step ? 'font-bold text-abh-navy' : 'text-gray-400'}`}>
              {s === 1 ? 'Select store' : 'Count SKUs'}
            </span>
            {s < totalSteps && <div className="flex-1 h-px bg-abh-mdgrey" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Store */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-abh-navy mb-3 text-sm uppercase tracking-wide" style={{ fontFamily: 'Arial, sans-serif' }}>
          1. Select store
        </h2>
        <StorePicker onSelect={setStore} userLat={userLat ?? undefined} userLng={userLng ?? undefined} />
      </section>

      {/* Step 2: SKU observations — only show when store is selected */}
      {store && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-abh-navy text-sm uppercase tracking-wide" style={{ fontFamily: 'Arial, sans-serif' }}>
              2. Shelf availability
            </h2>
            <span className="text-xs text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>
              {Array.from(observations.values()).filter(o => o.backroom_status != null && o.backroom_status !== 'not_checked').length}/{visibleSkus.length} done
            </span>
          </div>

          {visibleSkus.map(sku => {
            const obs = observations.get(sku.id)
            const isDone = obs != null && obs.backroom_status != null && obs.backroom_status !== 'not_checked'
            const isOOS = (obs?.shelf_units ?? -1) === 0

            return (
              <div key={sku.id}
                   className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
                     isDone ? 'border-abh-green' : 'border-transparent'
                   }`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-abh-dktext text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {sku.name}
                  </p>
                  {isDone && (
                    <div className="w-6 h-6 bg-abh-green rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Shelf units — +/- stepper */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Shelf units <span className="text-abh-red">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => updateObs(sku.id, { shelf_units: Math.max(0, (obs?.shelf_units ?? 0) - 1) })}
                      className="w-10 h-10 rounded-xl bg-abh-ltgrey text-abh-navy font-bold text-xl
                                 flex items-center justify-center active:bg-gray-300 flex-shrink-0">
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      required
                      value={obs?.shelf_units ?? ''}
                      onChange={e => updateObs(sku.id, { shelf_units: parseInt(e.target.value, 10) || 0 })}
                      className={`flex-1 border rounded-xl px-3 py-2.5 text-lg font-bold text-center
                                 focus:outline-none focus:ring-2 focus:ring-abh-blue min-w-0 ${
                                   isOOS && isDone ? 'border-abh-red text-abh-red bg-red-50' : 'border-abh-mdgrey'
                                 }`}
                      style={{ fontFamily: 'Arial, sans-serif' }}
                      placeholder="–"
                    />
                    <button type="button"
                      onClick={() => updateObs(sku.id, { shelf_units: (obs?.shelf_units ?? 0) + 1 })}
                      className="w-10 h-10 rounded-xl bg-abh-blue text-white font-bold text-xl
                                 flex items-center justify-center active:bg-blue-700 flex-shrink-0">
                      +
                    </button>
                  </div>
                  {isOOS && isDone && (
                    <p className="text-xs text-abh-red font-medium mt-1 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Out of stock — check backroom below
                    </p>
                  )}
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

                {/* Photo capture */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                    Photo (optional)
                  </label>
                  {obs?.photo_blob ? (
                    <div className="relative">
                      <img
                        src={obs.photo_blob}
                        alt="Shelf"
                        className="w-full h-36 object-cover rounded-lg border border-abh-mdgrey"
                      />
                      <button
                        type="button"
                        onClick={() => updateObs(sku.id, { photo_blob: null })}
                        className="absolute top-1 right-1 bg-abh-red text-white rounded-full w-6 h-6
                                   flex items-center justify-center text-xs font-bold leading-none"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed
                                      border-abh-mdgrey rounded-lg p-3 cursor-pointer
                                      hover:border-abh-blue transition-colors">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs text-gray-500" style={{ fontFamily: 'Arial, sans-serif' }}>
                        Take photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const blob = await compressImage(file)
                          updateObs(sku.id, { photo_blob: blob })
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Spacer so content isn't hidden behind sticky footer */}
      {store && <div className="h-20" />}

      {/* Sticky submit footer */}
      {store && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          {validationError && (
            <p className="text-xs text-abh-red mb-2 text-center font-medium" style={{ fontFamily: 'Arial, sans-serif' }}>
              {validationError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-abh-navy text-white font-bold rounded-xl py-3.5 text-sm
                       hover:bg-opacity-90 active:bg-opacity-80 disabled:opacity-50 transition-colors"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {submitting ? 'Saving...' : `Save visit${visibleSkus.length > 0 ? ` · ${Array.from(observations.keys()).length}/${visibleSkus.length} SKUs` : ''}`}
          </button>
        </div>
      )}
    </form>
  )
}
