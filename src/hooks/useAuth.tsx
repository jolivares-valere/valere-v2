import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/database';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isManager: boolean;
  isMaster: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Deduplicates concurrent profile-init calls (StrictMode double-mount, HMR, fast
// re-subscribes). Without this, two effect runs can both observe "no profile"
// and race to INSERT, causing a primary-key collision on the second write.
const profileInflight = new Map<string, Promise<UserProfile | null>>();

async function ensureUserProfile(userId: string, email: string): Promise<UserProfile | null> {
  const pending = profileInflight.get(userId);
  if (pending) return pending;

  const promise = (async (): Promise<UserProfile | null> => {
    const { data: existing, error: selectError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('[useAuth] profile select error:', selectError);
      return null;
    }
    if (existing) return existing as UserProfile;

    const isMasterEmail = email === 'jolivares@valereconsultores.com';
    const { data: created, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: email.split('@')[0],
        role: isMasterEmail ? 'master' : 'client',
        status: 'active',
        approved: isMasterEmail,
      })
      .select()
      .single();

    if (!insertError) return created as UserProfile;

    // If another caller won the insert race (e.g. HMR reload re-imported this
    // module and dropped our in-flight cache), the INSERT hits a unique-violation.
    // Re-read: the row now exists and is canonical.
    const { data: retry } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (retry) return retry as UserProfile;

    console.error('[useAuth] profile insert error:', insertError);
    return null;
  })();

  profileInflight.set(userId, promise);
  promise.finally(() => {
    if (profileInflight.get(userId) === promise) profileInflight.delete(userId);
  });
  return promise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(false);
      const p = await ensureUserProfile(s.user.id, s.user.email ?? '');
      if (mounted && p) setProfile(p);
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void applySession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      void applySession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const isManager = profile?.role === 'manager' || profile?.role === 'master';
  const isMaster = profile?.role === 'master';

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, login, register, logout, isManager, isMaster }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
