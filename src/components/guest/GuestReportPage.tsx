// GuestReportPage — public form, no auth required
// Multi-SKU: submit one row per SKU in a single batch insert

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { HERO_SKUS, type Store } from '../../types'

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

type GeoState = 'requesting' | 'granted' | 'denied' | 'unavailable'

interface StoreWithDist extends Store {
  distanceKm: number
}

interface SkuEntry {
  shelfUnits: string
  isOos: boolean
  comment: string
}

const RETAILER_BADGE: Record<string, string> = {
  woolworths: 'bg-green-100 text-green-800',
  coles:      'bg-red-100 text-red-800',
  metcash:    'bg-blue-100 text-blue-800',
}
const RETAILER_LABELS: Record<string, string> = {
  woolworths: 'Woolworths',
  coles:      'Coles',
  metcash:    'Metcash / IGA',
}

export function GuestReportPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [geoState, setGeoState] = useState<GeoState>('requesting')
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [nearbyStores, setNearbyStores] = useState<StoreWithDist[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [storeSearch, setStoreSearch] = useState('')

  // Per-SKU data: Map<sku.id, SkuEntry>
  const [skuData, setSkuData] = useState<Map<string, SkuEntry>>(new Map())

  // Single photo for the whole submission
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('stores')
      .select('id, retailer, store_number, name, address_line1, suburb, state, postcode, latitude, longitude, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { if (data) setStores(data as Store[]) })

    if (!navigator.geolocation) { setGeoState('unavailable'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setGeoState('granted') },
      () => setGeoState('denied'),
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (!position || stores.length === 0) return
    const ranked = stores
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({ ...s, distanceKm: haversine(position.latitude, position.longitude, s.latitude!, s.longitude!) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3)
    setNearbyStores(ranked)
  }, [position, stores])

  // Reset SKU data when store changes
  useEffect(() => { setSkuData(new Map()) }, [selectedStore])

  const filteredStores = useCallback((): Store[] => {
    const q = storeSearch.toLowerCase().trim()
    if (!q) return []
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.suburb.toLowerCase().includes(q) ||
      (s.postcode && s.postcode.includes(q))
    ).slice(0, 6)
  }, [storeSearch, stores])

  const visibleSkus = selectedStore
    ? HERO_SKUS.filter(s => s.retailers.includes(selectedStore.retailer as any))
    : []

  function updateSku(skuId: string, patch: Partial<SkuEntry>) {
    setSkuData(prev => {
      const next = new Map(prev)
      const existing = next.get(skuId) ?? { shelfUnits: '', isOos: false, comment: '' }
      next.set(skuId, { ...existing, ...patch })
      return next
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  function clearPhoto() {
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
  }

  // SKUs that have been touched (isOos OR shelfUnits set)
  const filledSkus = visibleSkus.filter(s => {
    const d = skuData.get(s.id)
    return d && (d.isOos || d.shelfUnits !== '')
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStore) return

    if (filledSkus.length === 0) {
      setValidationError('Please fill in at least one SKU before submitting.')
      return
    }
    setValidationError(null)
    setSubmitting(true)
    setSubmitError(null)

    // Upload photo if provided
    let photoUrl: string | null = null
    if (photo) {
      const ext = photo.name.split('.').pop() ?? 'jpg'
      const path = `guest/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('shelf-photos').upload(path, photo, { upsert: false })
      if (uploadError) {
        setSubmitError('Photo upload failed — please try again or submit without a photo.')
        setSubmitting(false)
        return
      }
      if (uploadData?.path) photoUrl = uploadData.path
    }

    const distanceKm = position && (selectedStore as StoreWithDist).distanceKm != null
      ? (selectedStore as StoreWithDist).distanceKm
      : null

    const rows = filledSkus.map(sku => {
      const d = skuData.get(sku.id)!
      return {
        store_id:             selectedStore.id,
        sku_id:               sku.id,
        sku_name:             sku.name,
        shelf_units:          d.isOos ? 0 : (d.shelfUnits === '' ? null : parseInt(d.shelfUnits, 10)),
        is_oos:               d.isOos,
        comment:              d.comment.trim() || null,
        photo_url:            photoUrl,
        reporter_lat:         position?.latitude ?? null,
        reporter_lng:         position?.longitude ?? null,
        distance_to_store_m:  distanceKm != null ? Math.round(distanceKm * 1000) : null,
      }
    })

    const { error } = await (supabase as any).from('guest_reports').insert(rows)
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
    } else {
      clearPhoto()
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-abh-navy flex flex-col items-center justify-center px-6 text-center"
           style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-bold text-xl mb-2">Report submitted</p>
        <p className="text-blue-200 text-sm max-w-xs mb-8">
          Thank you for helping Pureau track shelf availability. {filledSkus.length} SKU{filledSkus.length !== 1 ? 's' : ''} logged.
        </p>
        <button
          onClick={() => {
            setDone(false)
            setSelectedStore(null)
            setStoreSearch('')
            setSkuData(new Map())
          }}
          className="text-sm text-abh-blue underline"
        >
          Report another store
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-abh-navy px-5 py-4">
        <p className="text-white font-bold text-sm leading-none">Pureau Shelf Report</p>
        <p className="text-blue-300 text-xs mt-0.5">Spotted a gap? Takes 30 seconds.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-6 max-w-lg mx-auto pb-16">

        {/* ── STEP 1: Store ── */}
        <section>
          <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">1. Select Store</h2>

          {selectedStore ? (
            <div className="bg-white rounded-xl border-2 border-abh-blue p-4 flex items-start justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_BADGE[selectedStore.retailer]}`}>
                    {RETAILER_LABELS[selectedStore.retailer]}
                  </span>
                </div>
                <p className="font-semibold text-abh-dktext text-sm">{selectedStore.name}</p>
                <p className="text-xs text-gray-500">{selectedStore.suburb}, {selectedStore.state}</p>
              </div>
              <button type="button" onClick={() => setSelectedStore(null)}
                className="text-abh-blue text-sm font-medium ml-4 flex-shrink-0">
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {geoState === 'requesting' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-xl px-4 py-3 border border-gray-200">
                  <svg className="w-4 h-4 animate-spin flex-shrink-0 text-abh-blue" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                  </svg>
                  Finding stores near you...
                </div>
              )}

              {geoState === 'granted' && nearbyStores.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Nearest stores</p>
                  <ul className="space-y-2">
                    {nearbyStores.map(s => (
                      <li key={s.id}>
                        <button type="button" onClick={() => setSelectedStore(s)}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-abh-blue hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_BADGE[s.retailer]}`}>
                                  {RETAILER_LABELS[s.retailer]}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-abh-dktext">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.suburb}, {s.state}</p>
                            </div>
                            <span className="text-xs font-bold text-abh-blue ml-3 flex-shrink-0 bg-blue-50 rounded-lg px-2 py-1">
                              {fmtDist(s.distanceKm)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(geoState === 'denied' || geoState === 'unavailable') && (
                <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  {geoState === 'denied'
                    ? 'Location access was denied. Search for your store below.'
                    : 'Location not available on this device. Search for your store below.'}
                </div>
              )}

              <div>
                {nearbyStores.length > 0 && <p className="text-xs text-gray-500 mb-2 mt-1">Or search</p>}
                <input
                  type="search"
                  value={storeSearch}
                  onChange={e => setStoreSearch(e.target.value)}
                  placeholder="Store name, suburb or postcode..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-abh-blue shadow-sm"
                />
                {storeSearch.length > 1 && (
                  <ul className="mt-2 space-y-1">
                    {filteredStores().length === 0 ? (
                      <li className="text-xs text-gray-400 px-4 py-2">No stores found.</li>
                    ) : filteredStores().map(s => (
                      <li key={s.id}>
                        <button type="button" onClick={() => { setSelectedStore(s); setStoreSearch('') }}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-abh-blue hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${RETAILER_BADGE[s.retailer]}`}>
                              {RETAILER_LABELS[s.retailer]}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-abh-dktext">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.suburb}, {s.state}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── STEP 2: SKUs ── */}
        {selectedStore && (
          <section>
            <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-1">2. Shelf Status</h2>
            <p className="text-[10px] text-gray-400 mb-3">Fill in any SKUs you checked. Skip ones you didn't look at.</p>
            <div className="space-y-3">
              {visibleSkus.map(sku => {
                const d = skuData.get(sku.id) ?? { shelfUnits: '', isOos: false, comment: '' }
                const touched = d.isOos || d.shelfUnits !== ''
                return (
                  <div key={sku.id}
                    className={`bg-white rounded-xl border-2 p-4 shadow-sm transition-colors ${touched ? 'border-abh-green' : 'border-transparent'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-abh-dktext">{sku.name}</p>
                      {touched && (
                        <div className="w-5 h-5 bg-abh-green rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* OOS toggle */}
                    <button
                      type="button"
                      onClick={() => updateSku(sku.id, { isOos: !d.isOos, shelfUnits: !d.isOos ? '0' : '' })}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-3 transition-colors ${d.isOos ? 'bg-red-50' : 'bg-abh-ltgrey hover:bg-gray-200'}`}
                    >
                      <span className="text-xs font-semibold text-abh-dktext">Out of stock</span>
                      <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${d.isOos ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </button>

                    {/* Shelf units — hidden when OOS */}
                    {!d.isOos && (
                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-2">Units on shelf</label>
                        <div className="flex items-center gap-3">
                          <button type="button"
                            onClick={() => updateSku(sku.id, { shelfUnits: String(Math.max(0, parseInt(d.shelfUnits || '0', 10) - 1)) })}
                            className="w-10 h-10 rounded-xl bg-abh-ltgrey text-abh-navy font-bold text-xl flex items-center justify-center active:bg-gray-300 flex-shrink-0">
                            −
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={d.shelfUnits}
                            onChange={e => updateSku(sku.id, { shelfUnits: e.target.value })}
                            placeholder="–"
                            className="flex-1 border border-abh-mdgrey rounded-xl px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-abh-blue min-w-0"
                          />
                          <button type="button"
                            onClick={() => updateSku(sku.id, { shelfUnits: String(parseInt(d.shelfUnits || '0', 10) + 1) })}
                            className="w-10 h-10 rounded-xl bg-abh-blue text-white font-bold text-xl flex items-center justify-center active:bg-blue-700 flex-shrink-0">
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Comment */}
                    <input
                      type="text"
                      value={d.comment}
                      onChange={e => updateSku(sku.id, { comment: e.target.value })}
                      placeholder="Notes (optional)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-abh-blue"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── STEP 3: Photo ── */}
        {selectedStore && (
          <section>
            <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">
              3. Photo <span className="text-gray-400 normal-case font-normal">(optional — one per submission)</span>
            </h2>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Shelf photo" className="w-full object-cover max-h-52 rounded-xl" />
                <button type="button" onClick={clearPhoto}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer hover:border-abh-blue hover:bg-blue-50 active:bg-blue-100 transition-colors">
                <svg className="w-9 h-9 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm font-semibold text-abh-navy">Tap to add a photo</p>
                <p className="text-xs text-gray-400 mt-0.5">Take a photo or choose from gallery</p>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </section>
        )}

        {/* ── Submit ── */}
        {selectedStore && (
          <div className="pt-2">
            {validationError && (
              <p className="text-sm text-abh-red mb-3 bg-red-50 rounded-xl px-4 py-2">{validationError}</p>
            )}
            {submitError && (
              <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-xl px-4 py-2">{submitError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-abh-blue text-white font-bold rounded-xl py-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-colors shadow"
            >
              {submitting ? 'Submitting...' : `Submit Report${filledSkus.length > 0 ? ` · ${filledSkus.length} SKU${filledSkus.length !== 1 ? 's' : ''}` : ''}`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              Reports are anonymous. Data is used by Pureau to improve shelf availability.
            </p>
          </div>
        )}

      </form>
    </div>
  )
}
