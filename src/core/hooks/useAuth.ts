import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../stores/authStore'
import { logError, logInfo } from '../utils/logger'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '../types/entities'

async function fetchProfile(userId: string): Promise<UserProfile | null> {
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

function bootstrapFromSession(session: Session): UserProfile {
  const email = session.user.email ?? ''
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>

  const fullNameMeta =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.nombre_completo === 'string'
      ? meta.nombre_completo
      : null

  return {
    id: session.user.id,
    email,
    full_name: fullNameMeta ?? email.split('@')[0] ?? 'Usuario',
    role: 'client',
    status: 'active',
    approved: false,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// Mantener una sola suscripción global entre renders/StrictMode double-invoke.
let authSubscription: { unsubscribe: () => void } | null = null
let inFlightProfile: Promise<UserProfile | null> | null = null

function ensureAuthInitialized() {
  if (authSubscription) return

  logInfo('[useAuth] suscribiendo onAuthStateChange')

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    logInfo('[useAuth] onAuthStateChange', { event, hasSession: !!session })

    const store = useAuthStore.getState()
    store.setSession(session)

    if (session?.user) {
      store.setUser(bootstrapFromSession(session))
    } else {
      store.setUser(null)
    }

    store.setLoading(false)

    if (session?.user && !inFlightProfile) {
      const userId = session.user.id
      inFlightProfile = fetchProfile(userId)
        .then((profile) => {
          if (profile && useAuthStore.getState().session?.user.id === userId) {
            useAuthStore.getState().setUser(profile)
          }
          return profile
        })
        .catch((err) => {
          logError(err, 'useAuth.fetchProfile.bg')
          return null
        })
        .finally(() => {
          inFlightProfile = null
        })
    }
  })

  authSubscription = data.subscription
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
    getCurrentUserProfile: () =>
      session?.user ? fetchProfile(session.user.id) : Promise.resolve(null),
  }
}
