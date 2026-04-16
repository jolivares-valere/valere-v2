import { useEffect, useRef } from 'react'
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

export function useAuth() {
  const state = useAuthStore()
  const { user, session, loading, setUser, setSession, setLoading, logout } = state
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[useAuth] timeout 5s - forzando loading=false')
        setLoading(false)
      }
    }, 5000)

    const init = async () => {
      try {
        console.log('[useAuth] getSession start')
        const { data } = await supabase.auth.getSession()
        console.log('[useAuth] getSession ok, session:', !!data.session)
        if (!mounted) return
        setSession(data.session)
        if (data.session) {
          const profile = await fetchProfile(data.session.user.id)
          console.log('[useAuth] profile:', profile)
          if (mounted) setUser(profile)
        }
      } catch (err) {
        console.error('[useAuth] init error:', err)
      } finally {
        if (mounted) {
          clearTimeout(timeout)
          setLoading(false)
        }
      }
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, newSession) => {
      console.log('[useAuth] auth event:', evt)
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        const profile = await fetchProfile(newSession.user.id)
        if (mounted) setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      sub.subscription.unsubscribe()
    }
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
    user, session, loading, signIn, signOut,
    getCurrentUserProfile: () => fetchProfile(session?.user?.id),
  }
}
