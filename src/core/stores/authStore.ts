import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '../types/entities'

interface AuthState {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  profileLoaded: boolean
  setUser: (user: UserProfile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setProfileLoaded: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  profileLoaded: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setProfileLoaded: (profileLoaded) => set({ profileLoaded }),
  logout: () => set({ user: null, session: null, loading: false, profileLoaded: false }),
}))
