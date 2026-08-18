// ============================================================
// GuestReportPage — public form, no auth required
// Geo-detects nearest Pureau stores, collects shelf count
// ============================================================

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { HERO_SKUS, type Store } from '../../types'

// Haversine distance in km
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
  const [selectedSkuId, setSelectedSkuId] = useState('')
  const [shelfUnits, setShelfUnits] = useState('')
  const [isOos, setIsOos] = useState(false)
  const [comment, setComment] = useState('')
  const [storeSearch, setStoreSearch] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch all stores (anon access) and request geo in parallel on mount
  useEffect(() => {
    supabase
      .from('stores')
      .select('id, retailer, store_number, name, address_line1, suburb, state, postcode, latitude, longitude, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { if (data) setStores(data as Store[]) })

    if (!navigator.geolocation) {
      setGeoState('unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setGeoState('granted')
      },
      () => setGeoState('denied'),
      { timeout: 12000, enableHighAccuracy: false, maximumAge: 60000 }
    )
  }, [])

  // Recompute nearest stores whenever position or store list changes
  useEffect(() => {
    if (!position || stores.length === 0) return
    const ranked = stores
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({ ...s, distanceKm: haversine(position.latitude, position.longitude, s.latitude!, s.longitude!) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3)
    setNearbyStores(ranked)
  }, [position, stores])

  const filteredStores = useCallback((): Store[] => {
    const q = storeSearch.toLowerCase().trim()
    if (!q) return []
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.suburb.toLowerCase().includes(q) ||
      (s.postcode && s.postcode.includes(q))
    ).slice(0, 6)
  }, [storeSearch, stores])

  const selectedSku = HERO_SKUS.find(s => s.id === selectedSkuId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStore || !selectedSkuId) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
      store_id:           selectedStore.id,
      sku_id:             selectedSkuId,
      sku_name:           selectedSku?.name ?? selectedSkuId,
      shelf_units:        isOos ? 0 : (shelfUnits === '' ? null : parseInt(shelfUnits, 10)),
      is_oos:             isOos,
      comment:            comment.trim() || null,
      reporter_lat:       position?.latitude ?? null,
      reporter_lng:       position?.longitude ?? null,
      distance_to_store_m: (position && (selectedStore as StoreWithDist).distanceKm != null)
        ? Math.round((selectedStore as StoreWithDist).distanceKm * 1000)
        : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('guest_reports').insert(payload)
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
    } else {
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
          Thank you for helping Pureau track shelf availability. Your report has been logged.
        </p>
        <button
          onClick={() => {
            setDone(false)
            setSelectedStore(null)
            setSelectedSkuId('')
            setShelfUnits('')
            setIsOos(false)
            setComment('')
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
      {/* Header */}
      <div className="bg-abh-navy px-5 py-4">
        <p className="text-white font-bold text-sm leading-none">Pureau Shelf Report</p>
        <p className="text-blue-300 text-xs mt-0.5">Spotted a gap? Takes 30 seconds.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-6 max-w-lg mx-auto pb-16">

        {/* ── STEP 1: Store ── */}
        <section>
          <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">
            1. Select Store
          </h2>

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
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="text-abh-blue text-sm font-medium ml-4 flex-shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Geo status banner */}
              {geoState === 'requesting' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-xl px-4 py-3 border border-gray-200">
                  <svg className="w-4 h-4 animate-spin flex-shrink-0 text-abh-blue" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
                  </svg>
                  Finding stores near you...
                </div>
              )}

              {/* Nearest stores (geo granted) */}
              {geoState === 'granted' && nearbyStores.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Nearest stores</p>
                  <ul className="space-y-2">
                    {nearbyStores.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedStore(s)}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 border border-gray-200
                                     hover:border-abh-blue hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm"
                        >
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

              {/* Denied / unavailable message */}
              {(geoState === 'denied' || geoState === 'unavailable') && (
                <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                  {geoState === 'denied'
                    ? 'Location access was denied. Search for your store below.'
                    : 'Location not available on this device. Search for your store below.'}
                </div>
              )}

              {/* Manual search — always shown below geo list */}
              <div>
                {nearbyStores.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2 mt-1">Or search</p>
                )}
                <input
                  type="search"
                  value={storeSearch}
                  onChange={e => setStoreSearch(e.target.value)}
                  placeholder="Store name, suburb or postcode..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white
                             focus:outline-none focus:ring-2 focus:ring-abh-blue shadow-sm"
                />
                {storeSearch.length > 1 && (
                  <ul className="mt-2 space-y-1">
                    {filteredStores().length === 0 ? (
                      <li className="text-xs text-gray-400 px-4 py-2">No stores found.</li>
                    ) : filteredStores().map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedStore(s); setStoreSearch('') }}
                          className="w-full text-left bg-white rounded-xl px-4 py-3 border border-gray-200
                                     hover:border-abh-blue hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm"
                        >
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

        {/* ── STEP 2: SKU ── */}
        {selectedStore && (
          <section>
            <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">
              2. Select Product
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {HERO_SKUS
                .filter(sku => sku.retailers.includes(selectedStore.retailer))
                .map(sku => (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => setSelectedSkuId(sku.id)}
                    className={`rounded-xl border-2 px-3 py-3 text-left transition-colors
                      ${selectedSkuId === sku.id
                        ? 'border-abh-blue bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <p className="text-xs font-bold text-abh-navy">{sku.code}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-tight">{sku.name}</p>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* ── STEP 3: Shelf count ── */}
        {selectedStore && selectedSkuId && (
          <section>
            <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">
              3. Shelf Status
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* OOS toggle */}
              <button
                type="button"
                onClick={() => { setIsOos(!isOos); if (!isOos) setShelfUnits('0') }}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors
                  ${isOos ? 'bg-red-50' : 'hover:bg-gray-50'}`}
              >
                <span className="text-sm font-semibold text-abh-dktext">Out of stock</span>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5
                  ${isOos ? 'bg-red-500 justify-end' : 'bg-gray-200 justify-start'}`}>
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                </div>
              </button>

              {/* Shelf units (hidden when OOS) */}
              {!isOos && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <label className="text-xs text-gray-500 block mb-2">Units on shelf</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShelfUnits(u => String(Math.max(0, parseInt(u || '0', 10) - 1)))}
                      className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-abh-navy
                                 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300"
                    >−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="999"
                      value={shelfUnits}
                      onChange={e => setShelfUnits(e.target.value)}
                      placeholder="0"
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold text-center
                                 focus:outline-none focus:ring-2 focus:ring-abh-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setShelfUnits(u => String(parseInt(u || '0', 10) + 1))}
                      className="w-10 h-10 rounded-full bg-abh-navy text-xl font-bold text-white
                                 flex items-center justify-center hover:bg-opacity-80 active:bg-opacity-70"
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── STEP 4: Comment (optional) ── */}
        {selectedStore && selectedSkuId && (
          <section>
            <h2 className="text-xs font-bold text-abh-navy uppercase tracking-wide mb-3">
              4. Notes <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </h2>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Anything else to note — empty bay, incorrect label, facing issue?"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-abh-blue shadow-sm resize-none"
            />
          </section>
        )}

        {/* ── Submit ── */}
        {selectedStore && selectedSkuId && (
          <div className="pt-2">
            {submitError && (
              <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-xl px-4 py-2">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || (!isOos && shelfUnits === '')}
              className="w-full bg-abh-blue text-white font-bold rounded-xl py-4 text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-blue-700 active:bg-blue-800 transition-colors shadow"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
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
