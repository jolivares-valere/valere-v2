import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { logError } from '../utils/logger'
import { IS_DEMO } from '../demo'
import { mockSupabase } from '../demo/mock-supabase'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Switch DEMO MODE: si VITE_DEMO_MODE=true, usar mock local (fixtures).
// Si no, comportamiento idéntico al original (createClient real).
//
// Notas:
//   - Sin top-level await ni dynamic import (compatible con el target de Vite).
//   - El import estático del mock añade ~30KB al bundle de producción pero NO
//     ejecuta llamadas reales (mockSupabase no inicializa nada al cargarse;
//     el log de "DEMO MODE activo" sólo se imprime cuando se invoca .from).
//   - Tree-shaking: opcional / posterior. Aceptado por el usuario para la
//     auditoría; ver docs/DEMO_MODE.md sección "Limitaciones conocidas".

if (!IS_DEMO && (!url || !anonKey)) {
  logError(
    new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env'),
    'supabase/client',
  )
}

export const supabase: SupabaseClient<Database> = IS_DEMO
  ? (mockSupabase as unknown as SupabaseClient<Database>)
  : createClient<Database>(
      url ?? '',
      anonKey ?? '',
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    )
