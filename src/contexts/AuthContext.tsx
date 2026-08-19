// ============================================================
// Auth context — wraps Supabase email/password auth
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loadStoreCache } from '../lib/db'
import type { RepUser, Store, SKU, Retailer } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  repUser: RepUser | null
  liveSKUs: SKU[]          // real SKU UUIDs from Supabase — use these for observations
  loading: boolean
  repLoading: boolean
  storeVersion: number
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  acceptTerms: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [repUser, setRepUser] = useState<RepUser | null>(null)
  const [liveSKUs, setLiveSKUs] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)
  const [repLoading, setRepLoading] = useState(false)
  const [storeVersion, setStoreVersion] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setRepLoading(true)
        fetchRepUser(session.user.id)
        syncReferenceData()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setRepLoading(true)
        fetchRepUser(session.user.id)
        syncReferenceData()
      }
      else {
        setRepUser(null)
        setRepLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function syncReferenceData() {
    const [storeRes, skuRes] = await Promise.all([
      supabase
        .from('stores')
        .select('id, retailer, store_number, name, address_line1, suburb, state, postcode, latitude, longitude, is_active')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('skus')
        .select('id, code, name, retailers')
        .eq('is_active', true)
        .order('name'),
    ])
    if (storeRes.data && storeRes.data.length > 0) {
      await loadStoreCache(storeRes.data as Store[])
      setStoreVersion(v => v + 1)
    }
    if (skuRes.data && skuRes.data.length > 0) {
      setLiveSKUs(
        (skuRes.data as Array<{ id: string; code: string; name: string; retailers: string[] }>)
          .map(s => ({ ...s, retailers: s.retailers as Retailer[] }))
      )
    }
  }

  async function fetchRepUser(userId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt))
      const { data, error } = await (supabase as any)
        .from('rep_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('[auth] fetchRepUser attempt', attempt + 1, 'error:', error.code)
        if (attempt < 2) continue
      }
      setRepUser(data as RepUser | null)
      setRepLoading(false)
      return
    }
    setRepLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function acceptTerms(): Promise<string | null> {
    if (!session?.user) return 'Not signed in'
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('rep_users')
      .update({ terms_accepted_at: now })
      .eq('id', session.user.id)
    if (error) return error.message
    // Optimistically update local state so the modal doesn't re-show
    // even if there is a brief propagation delay.
    setRepUser(prev => prev ? { ...prev, terms_accepted_at: now } : prev)
    return null
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      repUser,
      liveSKUs,
      loading,
      repLoading,
      storeVersion,
      signIn,
      signOut,
      acceptTerms,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
