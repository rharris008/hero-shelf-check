// ============================================================
// Hero Shelf Check — Core Types
// ============================================================

export type Retailer = 'woolworths' | 'coles' | 'metcash'
export type BackroomStatus = 'counted' | 'none_present' | 'not_checked'
export type SyncStatus = 'pending' | 'synced' | 'error'
export type UserRole = 'rep' | 'admin'

export interface Store {
  id: string
  retailer: Retailer
  store_number: string
  name: string
  address_line1: string
  suburb: string
  state: string
  postcode: string
  latitude: number | null
  longitude: number | null
  is_active: boolean
}

export interface SKU {
  id: string
  code: string
  name: string
  retailers: Retailer[]  // which retailers stock this SKU
}

// SKUs per confirmed brief:
// WW + Metcash: 10L Cask, 5L Cask, 2L Bottle
// Coles: above + 600ml 6 Pack
export const HERO_SKUS: SKU[] = [
  {
    id: 'sku-10l',
    code: 'PUREAU-10L',
    name: 'Pureau 10L Cask',
    retailers: ['woolworths', 'coles', 'metcash'],
  },
  {
    id: 'sku-5l',
    code: 'PUREAU-5L',
    name: 'Pureau 5L Cask',
    retailers: ['woolworths', 'coles', 'metcash'],
  },
  {
    id: 'sku-2l',
    code: 'PUREAU-2L',
    name: 'Pureau 2L Bottle',
    retailers: ['woolworths', 'coles', 'metcash'],
  },
  {
    id: 'sku-600-6pk',
    code: 'PUREAU-600-6PK',
    name: 'Pureau 600ml 6 Pack',
    retailers: ['coles'],
  },
]

export interface SkuObservation {
  sku_id: string
  shelf_units: number          // mandatory — actual units counted on shelf
  backroom_status: BackroomStatus
  backroom_units: number | null  // only set when backroom_status === 'counted'
  notes: string
  photo_blob?: string | null   // base64 JPEG held in offline queue until uploaded
  photo_url?: string | null    // Supabase Storage path set after successful upload
}

export interface Visit {
  id: string
  store_id: string
  rep_id: string
  visit_date: string           // YYYY-MM-DD AEST
  visit_time: string           // HH:MM AEST
  observations: SkuObservation[]
  sync_status: SyncStatus
  created_at: string
}

export interface RepUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  state_territory: string | null  // NSW, VIC, QLD, etc. — Stage 1 region grouping
  terms_accepted_at: string | null  // ISO timestamp — null means ToS not yet accepted
}

// Analytics view shape (from Supabase view)
export interface StoreAvailabilitySummary {
  store_id: string
  store_name: string
  retailer: Retailer
  state: string
  last_visit_date: string | null
  days_since_visit: number | null
  sku_id: string
  sku_name: string
  latest_shelf_units: number | null
  visits_last_30d: number
  avg_shelf_units_30d: number | null
}

export interface OfflineQueueItem {
  localId: string
  visit: Omit<Visit, 'sync_status'>
  attempts: number
  lastAttempt: string | null
}
