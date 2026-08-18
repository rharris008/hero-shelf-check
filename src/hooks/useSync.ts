// ============================================================
// useSync — exposes pending queue count to UI components
// ============================================================

import { useEffect, useState } from 'react'
import { onSyncUpdate, runSync } from '../lib/sync'
import { getQueue } from '../lib/db'

export function useSync() {
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Read current queue on mount
    getQueue().then(q => setPending(q.length))

    // Subscribe to sync updates
    const unsub = onSyncUpdate(setPending)
    return unsub
  }, [])

  async function syncNow() {
    setSyncing(true)
    await runSync()
    setSyncing(false)
  }

  return { pending, syncing, syncNow }
}
