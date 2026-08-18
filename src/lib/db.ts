// ============================================================
// Dexie offline database — stores the pending sync queue
// and a local cache of stores for the searchable store picker.
// ============================================================

import Dexie, { type Table } from 'dexie'
import type { Store, Visit, OfflineQueueItem } from '../types'

class ShelfCheckDB extends Dexie {
  stores!: Table<Store>
  queue!: Table<OfflineQueueItem>
  synced_visits!: Table<Visit & { localId: string }>

  constructor() {
    super('hero-shelf-check')

    this.version(1).stores({
      // stores: searchable by retailer, state, suburb, name
      stores: 'id, retailer, state, suburb, postcode, name',

      // offline queue: visits pending upload
      queue: 'localId, [visit.store_id+visit.visit_date], attempts',

      // local cache of synced visits (for history view without network)
      synced_visits: 'localId, visit.store_id, visit.visit_date, visit.rep_id',
    })
  }
}

export const db = new ShelfCheckDB()

// ---- Store cache helpers ----------------------------------------

export async function loadStoreCache(stores: Store[]) {
  await db.stores.bulkPut(stores)
}

export async function searchStores(query: string, retailer?: string): Promise<Store[]> {
  const q = query.toLowerCase().trim()
  if (!q) {
    let collection = db.stores.where('is_active').equals(1 as unknown as boolean)
    if (retailer) collection = db.stores.where('retailer').equals(retailer)
    return collection.limit(50).toArray()
  }

  return db.stores
    .filter(s => {
      if (!s.is_active) return false
      if (retailer && s.retailer !== retailer) return false
      return (
        s.name.toLowerCase().includes(q) ||
        s.suburb.toLowerCase().includes(q) ||
        s.postcode.includes(q) ||
        s.store_number.includes(q)
      )
    })
    .limit(50)
    .toArray()
}

// ---- Queue helpers -----------------------------------------------

export async function enqueue(visit: Omit<Visit, 'sync_status'>): Promise<string> {
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await db.queue.add({ localId, visit, attempts: 0, lastAttempt: null })
  return localId
}

export async function dequeue(localId: string) {
  await db.queue.delete(localId)
}

export async function getQueue(): Promise<OfflineQueueItem[]> {
  return db.queue.toArray()
}

export async function markAttempt(localId: string) {
  const now = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })
  await db.queue.where('localId').equals(localId).modify(item => {
    item.attempts += 1
    item.lastAttempt = now
  })
}
