// ============================================================
// Auth context — wraps Supabase email/password auth
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { loadStoreCache } from '../lib/db'
import type { RepUser, Store } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  repUser: RepUser | null
  loading: boolean
  repLoading: boolean  // true until fetchRepUser has returned at least once
  repError: string | null  // diagnostic — Supabase error from fetchRepUser
  storeVersion: number     // increments after each store sync — triggers StorePicker re-search
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  acceptTerms: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [repUser, setRepUser] = useState<RepUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [repLoading, setRepLoading] = useState(false)
  const [repError, setRepError] = useState<string | null>(null)
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
    const { data } = await supabase
      .from('stores')
      .select('id, retailer, store_number, name, address_line1, suburb, state, postcode, latitude, longitude, is_active')
      .eq('is_active', true)
      .order('name')
    if (data && data.length > 0) {
      await loadStoreCache(data as Store[])
      setStoreVersion(v => v + 1)
    }
  }

  async function fetchRepUser(userId: string) {
    const { data, error } = await supabase
      .from('rep_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      setRepError(`${error.code}: ${error.message}`)
    } else if (!data) {
      setRepError(`No row found for id=${userId}`)
    } else {
      setRepError(null)
    }
    setRepUser(data as RepUser | null)
    setRepLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function acceptTerms() {
    if (!session?.user) return
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('rep_users')
      .update({ terms_accepted_at: now })
      .eq('id', session.user.id)
      .select()
      .single()
    if (data) setRepUser(data as RepUser)
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      repUser,
      loading,
      repLoading,
      repError,
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
