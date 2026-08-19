// ============================================================
// PasswordResetPage — handles Supabase password-reset redirect
// Supabase emits PASSWORD_RECOVERY via onAuthStateChange once
// the code in the URL is exchanged. We wait for that event.
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const font = { fontFamily: 'Arial, sans-serif' }

export function PasswordResetPage() {
  const [ready, setReady]       = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message) } else { setDone(true) }
  }

  return (
    <div className="min-h-screen bg-abh-navy flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-abh-navy flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-abh-navy text-sm" style={font}>Reset your password</p>
            <p className="text-xs text-gray-400" style={font}>Pureau Shelf Check</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-abh-navy text-sm mb-1" style={font}>Password updated</p>
            <p className="text-xs text-gray-500 mb-5" style={font}>You can now sign in with your new password.</p>
            <a href="#/login"
               className="block w-full bg-abh-navy text-white font-bold rounded-xl py-3 text-sm text-center"
               style={font}>
              Go to sign in
            </a>
          </div>
        ) : !ready ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-4 border-abh-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500" style={font}>Verifying reset link…</p>
            <p className="text-xs text-gray-400 mt-2" style={font}>
              If this takes too long, the link may have expired.{' '}
              <a href="#/login" className="text-abh-blue underline">Request a new one.</a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-abh-dktext mb-1" style={font}>
                New password
              </label>
              <input
                id="new-pw"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-abh-blue"
                style={font}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label htmlFor="confirm-pw" className="block text-sm font-medium text-abh-dktext mb-1" style={font}>
                Confirm new password
              </label>
              <input
                id="confirm-pw"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-abh-blue"
                style={font}
              />
            </div>
            {error && (
              <p className="text-sm text-abh-red bg-red-50 rounded-lg px-3 py-2" style={font}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-abh-navy text-white font-semibold rounded-lg py-3 text-sm disabled:opacity-50"
              style={font}
            >
              {loading ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
