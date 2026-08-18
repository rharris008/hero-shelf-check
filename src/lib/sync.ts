// ============================================================
// Sync engine — drains the offline queue every 60 seconds
// when a network connection is available.
// ============================================================

import { supabase } from './supabase'
import { getQueue, dequeue, markAttempt } from './db'
import type { OfflineQueueItem, SkuObservation } from '../types'

async function uploadPhoto(visitId: string, skuId: string, blob: string): Promise<string | null> {
  const base64 = blob.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const path = `${visitId}/${skuId}.jpg`
  const { error } = await supabase.storage
    .from('shelf-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) { console.error('[Sync] Photo upload failed:', error); return null }
  return path
}

const SYNC_INTERVAL_MS = 60_000
const MAX_ATTEMPTS = 5

let syncTimer: ReturnType<typeof setInterval> | null = null
let syncListeners: Array<(pending: number) => void> = []

export function onSyncUpdate(cb: (pending: number) => void) {
  syncListeners.push(cb)
  return () => { syncListeners = syncListeners.filter(l => l !== cb) }
}

function notify(pending: number) {
  syncListeners.forEach(l => l(pending))
}

async function uploadVisit(item: OfflineQueueItem): Promise<boolean> {
  const { visit, localId } = item
  // sb cast bypasses Supabase's strict 'never[]' typing on tables without generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  try {
    // 1. Insert visit record
    const { data: visitData, error: visitErr } = await sb
      .from('visits')
      .insert({
        id: visit.id,
        store_id: visit.store_id,
        rep_id: visit.rep_id,
        visit_date: visit.visit_date,
        visit_time: visit.visit_time,
        created_at: visit.created_at,
      })
      .select()
      .single()

    if (visitErr) {
      // Conflict means it was already uploaded — treat as success
      if (visitErr.code === '23505') {
        await dequeue(localId)
        return true
      }
      throw visitErr
    }

    // 2. Upload any queued photos, then insert observations
    const resolvedObs: SkuObservation[] = await Promise.all(
      visit.observations.map(async o => {
        if (!o.photo_blob) return o
        const path = await uploadPhoto(visit.id, o.sku_id, o.photo_blob)
        return { ...o, photo_blob: null, photo_url: path }
      })
    )

    const obsRows = resolvedObs.map(o => ({
      visit_id: (visitData as { id: string }).id,
      sku_id: o.sku_id,
      shelf_units: o.shelf_units,
      backroom_status: o.backroom_status,
      backroom_units: o.backroom_units ?? null,
      notes: o.notes || null,
      photo_url: o.photo_url ?? null,
    }))

    const { error: obsErr } = await sb.from('observations').insert(obsRows)
    if (obsErr) throw obsErr

    await dequeue(localId)
    return true

  } catch (err) {
    console.error('[Sync] Upload failed for', localId, err)
    await markAttempt(localId)
    return false
  }
}

export async function runSync(): Promise<{ uploaded: number; pending: number; errors: number }> {
  if (!navigator.onLine) {
    const queue = await getQueue()
    notify(queue.length)
    return { uploaded: 0, pending: queue.length, errors: 0 }
  }

  const queue = await getQueue()
  let uploaded = 0
  let errors = 0

  for (const item of queue) {
    if (item.attempts >= MAX_ATTEMPTS) continue  // give up after 5 attempts — flag for review
    const ok = await uploadVisit(item)
    if (ok) uploaded++
    else errors++
  }

  const remaining = await getQueue()
  notify(remaining.length)
  return { uploaded, pending: remaining.length, errors }
}

export function startSyncEngine() {
  if (syncTimer) return  // already running

  // Run immediately on start
  runSync().catch(console.error)

  // Then every 60 seconds
  syncTimer = setInterval(() => {
    runSync().catch(console.error)
  }, SYNC_INTERVAL_MS)

  // Also sync when network comes back online
  window.addEventListener('online', () => {
    runSync().catch(console.error)
  })

  console.log('[Sync] Engine started — draining every 60s')
}

export function stopSyncEngine() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
