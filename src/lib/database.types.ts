// ============================================================
// Database types — generated from 001_schema.sql
// Run `supabase gen types typescript --local > src/lib/database.types.ts`
// to regenerate after schema changes.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          retailer: 'woolworths' | 'coles' | 'metcash'
          store_number: string
          name: string
          address_line1: string | null
          suburb: string | null
          state: string | null
          postcode: string | null
          latitude: number | null
          longitude: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['stores']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['stores']['Insert']>
      }
      visits: {
        Row: {
          id: string
          store_id: string
          rep_id: string
          visit_date: string
          visit_time: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['visits']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['visits']['Insert']>
      }
      observations: {
        Row: {
          id: string
          visit_id: string
          sku_id: string
          shelf_units: number
          backroom_status: 'counted' | 'none_present' | 'not_checked'
          backroom_units: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['observations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['observations']['Insert']>
      }
      skus: {
        Row: {
          id: string
          code: string
          name: string
          retailers: string[]
          is_active: boolean
        }
        Insert: Omit<Database['public']['Tables']['skus']['Row'], never>
        Update: Partial<Database['public']['Tables']['skus']['Insert']>
      }
      guest_reports: {
        Row: {
          id: string
          created_at: string
          store_id: string | null
          store_name_manual: string | null
          sku_id: string
          sku_name: string
          shelf_units: number | null
          is_oos: boolean
          comment: string | null
          reporter_email: string | null
          reporter_lat: number | null
          reporter_lng: number | null
          distance_to_store_m: number | null
        }
        Insert: Omit<Database['public']['Tables']['guest_reports']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['guest_reports']['Insert']>
      }
      rep_users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'rep' | 'admin'
          state_territory: string | null
          terms_accepted_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rep_users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['rep_users']['Insert']>
      }
    }
    Views: {
      store_availability_summary: {
        Row: {
          store_id: string
          store_name: string
          retailer: string
          suburb: string | null
          state: string | null
          postcode: string | null
          last_visit_date: string | null
          days_since_visit: number | null
          last_rep_name: string | null
          sku_id: string
          sku_name: string
          latest_shelf_units: number | null
          latest_backroom_status: string | null
          latest_photo_url: string | null
          visits_last_30d: number
          avg_shelf_units_30d: number | null
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
