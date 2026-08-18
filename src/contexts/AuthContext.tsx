// ============================================================
// Auth context — wraps Supabase email/password auth
// ============================================================

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { RepUser } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  repUser: RepUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [repUser, setRepUser] = useState<RepUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchRepUser(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchRepUser(session.user.id)
      else setRepUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRepUser(userId: string) {
    // PLACEHOLDER: rep_users table must exist in Supabase.
    // Schema defined in database/001_schema.sql.
    const { data } = await supabase
      .from('rep_users')
      .select('*')
      .eq('id', userId)
      .single()
    setRepUser(data as RepUser | null)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      repUser,
      loading,
      signIn,
      signOut,
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
