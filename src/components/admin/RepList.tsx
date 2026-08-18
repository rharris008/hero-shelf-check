// ============================================================
// RepList — admin view of all reps with activity metrics
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface RepRow {
  id: string
  full_name: string
  email: string
  role: string
  state_territory: string | null
  terms_accepted_at: string | null
}

interface RepActivity {
  rep_id: string
  visits_30d: number
  visits_7d: number
  last_visit: string | null
  stores_covered: number
}

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT']

export function RepList() {
  const [reps, setReps] = useState<RepRow[]>([])
  const [activity, setActivity] = useState<Map<string, RepActivity>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  useEffect(() => {
    async function load() {
      const [repRes, actRes] = await Promise.all([
        sb.from('rep_users').select('id,full_name,email,role,state_territory,terms_accepted_at').order('full_name'),
        sb.from('visits')
          .select('rep_id,visit_date,store_id')
          .gte('visit_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
      ])

      const repsData: RepRow[] = repRes.data ?? []
      setReps(repsData)

      // Compute activity from visit rows
      const visits: Array<{ rep_id: string; visit_date: string; store_id: string }> = actRes.data ?? []
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const actMap = new Map<string, RepActivity>()

      for (const r of repsData) {
        const repVisits = visits.filter(v => v.rep_id === r.id)
        const stores7d = new Set(repVisits.filter(v => v.visit_date >= sevenDaysAgo).map(v => v.store_id))
        const allDates = repVisits.map(v => v.visit_date).sort().reverse()
        actMap.set(r.id, {
          rep_id: r.id,
          visits_30d: repVisits.length,
          visits_7d: repVisits.filter(v => v.visit_date >= sevenDaysAgo).length,
          last_visit: allDates[0] ?? null,
          stores_covered: stores7d.size,
        })
      }
      setActivity(actMap)
      setLoading(false)
    }
    load()
  }, [])

  async function updateTerritory(repId: string, territory: string | null) {
    setSaving(repId)
    await sb.from('rep_users').update({ state_territory: territory || null }).eq('id', repId)
    setReps(prev => prev.map(r => r.id === repId ? { ...r, state_territory: territory || null } : r))
    setSaving(null)
  }

  async function updateRole(repId: string, role: string) {
    setSaving(repId)
    await sb.from('rep_users').update({ role }).eq('id', repId)
    setReps(prev => prev.map(r => r.id === repId ? { ...r, role } : r))
    setSaving(null)
  }

  function daysSince(dateStr: string | null): string {
    if (!dateStr) return 'Never'
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  function activityColour(act: RepActivity | undefined): string {
    if (!act || !act.last_visit) return 'bg-gray-100 text-gray-500'
    const days = Math.floor((Date.now() - new Date(act.last_visit).getTime()) / 86400000)
    if (days <= 7) return 'bg-abh-green/10 text-abh-green'
    if (days <= 14) return 'bg-abh-amber/10 text-abh-amber'
    return 'bg-abh-red/10 text-abh-red'
  }

  const [copied, setCopied] = useState(false)
  const signupUrl = window.location.origin + window.location.pathname

  function copyInviteLink() {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Arial, sans-serif' }}>Loading reps…</p>
      </div>
    )
  }

  const activeThisWeek = reps.filter(r => {
    const a = activity.get(r.id)
    if (!a?.last_visit) return false
    return Math.floor((Date.now() - new Date(a.last_visit).getTime()) / 86400000) <= 7
  }).length
  const termsPending = reps.filter(r => !r.terms_accepted_at).length

  return (
    <div className="space-y-3" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Summary tile */}
      <div className="bg-abh-navy rounded-xl p-4 text-white">
        <p className="text-[11px] text-blue-200 uppercase tracking-wide mb-0.5">Rep Management</p>
        <p className="text-3xl font-bold">{reps.length}</p>
        <div className="flex gap-3 mt-1">
          <p className="text-xs text-blue-300">{activeThisWeek} active this week</p>
          {termsPending > 0 && (
            <p className="text-xs text-abh-amber">{termsPending} terms pending</p>
          )}
        </div>
      </div>

      {/* Invite link */}
      <div className="bg-white rounded-xl border border-abh-mdgrey p-4">
        <p className="text-xs font-bold text-abh-navy mb-1">Invite a rep</p>
        <p className="text-[11px] text-gray-500 mb-2">Share this link. They sign up, accept terms, and appear below.</p>
        <div className="flex gap-2">
          <p className="flex-1 text-[11px] text-gray-400 bg-abh-ltgrey rounded-lg px-3 py-2 truncate">
            {signupUrl}
          </p>
          <button
            onClick={copyInviteLink}
            className={`text-xs font-bold rounded-lg px-3 py-2 flex-shrink-0 transition-colors ${
              copied ? 'bg-abh-green text-white' : 'bg-abh-navy text-white hover:bg-opacity-80'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {reps.map(rep => {
        const act = activity.get(rep.id)
        return (
          <div key={rep.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-abh-navy truncate">{rep.full_name}</p>
                  <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                    rep.role === 'admin' ? 'bg-abh-navy text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {rep.role}
                  </span>
                  {!rep.terms_accepted_at && (
                    <span className="text-[10px] bg-abh-amber text-white rounded px-1.5 py-0.5">
                      Terms pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{rep.email}</p>
              </div>
              <div className={`text-right rounded-lg px-2 py-1.5 ${activityColour(act)}`}>
                <p className="text-xs font-bold">{act ? daysSince(act.last_visit) : 'Never'}</p>
                <p className="text-[10px]">last visit</p>
              </div>
            </div>

            {/* Activity metrics */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-abh-ltgrey rounded-lg p-2 text-center">
                <p className="text-base font-bold text-abh-navy">{act?.visits_7d ?? 0}</p>
                <p className="text-[10px] text-gray-400">visits 7d</p>
              </div>
              <div className="bg-abh-ltgrey rounded-lg p-2 text-center">
                <p className="text-base font-bold text-abh-navy">{act?.visits_30d ?? 0}</p>
                <p className="text-[10px] text-gray-400">visits 30d</p>
              </div>
              <div className="bg-abh-ltgrey rounded-lg p-2 text-center">
                <p className="text-base font-bold text-abh-navy">{act?.stores_covered ?? 0}</p>
                <p className="text-[10px] text-gray-400">stores 7d</p>
              </div>
            </div>

            {/* Territory + role selectors */}
            <div className="flex gap-2">
              <select
                value={rep.state_territory ?? ''}
                onChange={e => updateTerritory(rep.id, e.target.value)}
                disabled={saving === rep.id}
                className="flex-1 text-xs border border-abh-mdgrey rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-1 focus:ring-abh-blue bg-white
                           disabled:opacity-50"
              >
                <option value="">No territory</option>
                {AU_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="National">National</option>
              </select>

              <select
                value={rep.role}
                onChange={e => updateRole(rep.id, e.target.value)}
                disabled={saving === rep.id}
                className="text-xs border border-abh-mdgrey rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-1 focus:ring-abh-blue bg-white
                           disabled:opacity-50"
              >
                <option value="rep">Rep</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        )
      })}
    </div>
  )
}
