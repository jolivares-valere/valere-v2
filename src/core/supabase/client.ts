import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logError } from '../utils/logger'

export type Database = Record<string, unknown>

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  logError(
    new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env'),
    'supabase/client',
  )
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url ?? '',
  anonKey ?? '',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
