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
// Singleton de inicializacion a nivel de modulo (corre 1 sola vez por SPA).
//
// Patron canonico Supabase v2:
//   1) getSession() hidrata desde localStorage y RESUELVE loading=false.
//   2) onAuthStateChange() solo maneja eventos futuros (SIGNED_IN, SIGNED_OUT,
//      TOKEN_REFRESHED). NO toca loading.
//
// No usamos solo onAuthStateChange porque INITIAL_SESSION no siempre se emite
// de forma fiable cuando hay sesion persistida (HMR Vite, versiones de
// supabase-js, etc). Sin timeouts, sin reintentos, sin bucles.
// ---------------------------------------------------------------------------
let initialized = false

function ensureAuthInitialized() {
  if (initialized) return
  initialized = true

  // 1. Hidratacion inicial: lee la sesion persistida y resuelve loading.
  supabase.auth.getSession().then(async ({ data: { session }, error }) => {
    if (error) logError(error, 'useAuth.getSession')
    console.log('[useAuth] getSession resolved - session:', !!session)
    const store = useAuthStore.getState()
    store.setSession(session)
    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      useAuthStore.getState().setUser(profile)
    }
    useAuthStore.getState().setLoading(false)
  })

  // 2. Cambios futuros: SIGNED_IN (post-login), SIGNED_OUT, TOKEN_REFRESHED.
  //    NO tocamos loading aqui - ya se resolvio en getSession().
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[useAuth] onAuthStateChange:', event, 'session:', !!session)
    const store = useAuthStore.getState()
    store.setSession(session)
    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      useAuthStore.getState().setUser(profile)
    } else {
      store.setUser(null)
    }
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
    // No navigate. onAuthStateChange disparara SIGNED_IN, populara el store
    // y LoginRoute (en App.tsx) redirigira reactivamente.
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
