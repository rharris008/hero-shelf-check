// ============================================================
// Supabase client
// PLACEHOLDER: replace VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// with the real project values from the Supabase dashboard.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[ShelfCheck] Supabase env vars not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type SupabaseClient = typeof supabase
