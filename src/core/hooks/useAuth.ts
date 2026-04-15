import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../stores/authStore'
import { logError } from '../utils/logger'
import type { UserProfile } from '../types/entities'

async function fetchProfile(userId: string | undefined): Promise<UserProfile | null> {
  if (!userId) return null
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    logError(error, 'useAuth.fetchProfile')
    return null
  }
  return (data as UserProfile | null) ?? null
}

export function useAuth() {
  const state = useAuthStore()
  const { user, session, loading, setUser, setSession, setLoading, logout } = state

  useEffect(() => {
    let mounted = true
    setLoading(true)

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) {
        const profile = await fetchProfile(data.session.user.id)
        if (mounted) setUser(profile)
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
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
      sub.subscription.unsubscribe()
    }
  }, [setLoading, setSession, setUser])

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
