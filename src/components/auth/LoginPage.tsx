// ============================================================
// LoginPage — email/password login screen
// ABH Navy branding, Arial font
// ============================================================

import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email.trim(), password)
    if (error) setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-abh-navy flex flex-col items-center justify-center px-4">
      {/* Logo area */}
      <div className="mb-8 text-center">
        {/* PLACEHOLDER: replace with base64 Pureau logo or hosted image */}
        <div className="w-32 h-16 mx-auto bg-white rounded flex items-center justify-center mb-4">
          <span className="text-abh-navy font-bold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
            PUREAU
          </span>
        </div>
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>
          Hero Shelf Check
        </h1>
        <p className="text-blue-200 text-sm mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
          Field Rep Portal
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-abh-dktext mb-1"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-abh-blue"
              style={{ fontFamily: 'Arial, sans-serif' }}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-abh-dktext mb-1"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-abh-mdgrey rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-abh-blue"
              style={{ fontFamily: 'Arial, sans-serif' }}
            />
          </div>

          {error && (
            <p className="text-sm text-abh-red bg-red-50 rounded-lg px-3 py-2" style={{ fontFamily: 'Arial, sans-serif' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-abh-navy text-white font-semibold rounded-lg py-3 text-sm
                       hover:bg-opacity-90 active:bg-opacity-80 disabled:opacity-50
                       transition-colors"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4" style={{ fontFamily: 'Arial, sans-serif' }}>
          ABH Pureau - Field Operations
        </p>
      </div>
    </div>
  )
}
