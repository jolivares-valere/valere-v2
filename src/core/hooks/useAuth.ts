import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../stores/authStore'
import { logError } from '../utils/logger'
import type { UserProfile } from '../types/entities'

async function fetchProfile(userId: string | undefined): Promise<UserProfile | null> {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      logError(error, 'useAuth.fetchProfile')
      return null
    }
    return (data as UserProfile | null) ?? null
  } catch (e) {
    logError(e, 'useAuth.fetchProfile')
    return null
  }
}

// ---------------------------------------------------------------------------
// Singleton de inicializacion a nivel de modulo.
// La suscripcion a onAuthStateChange se crea UNA sola vez por vida de la SPA.
// Cualquier instancia del hook useAuth() reutiliza esa misma suscripcion.
// ---------------------------------------------------------------------------
let initialized = false

function ensureAuthInitialized() {
  if (initialized) return
  initialized = true

  const safetyTimeout = setTimeout(() => {
    if (useAuthStore.getState().loading) {
      console.warn('[useAuth] safety timeout 3s - forzando loading=false')
      useAuthStore.getState().setLoading(false)
    }
  }, 3000)

  supabase.auth.onAuthStateChange(async (_evt, session) => {
    const store = useAuthStore.getState()
    store.setSession(session)
    if (session) {
      const profile = await fetchProfile(session.user.id)
      useAuthStore.getState().setUser(profile)
    } else {
      store.setUser(null)
    }
    useAuthStore.getState().setLoading(false)
    clearTimeout(safetyTimeout)
  })
}

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    ensureAuthInitialized()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      logError(error, 'useAuth.signIn')
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) logError(error, 'useAuth.signOut')
    logout()
  }

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    getCurrentUserProfile: () => fetchProfile(session?.user?.id),
  }
}
