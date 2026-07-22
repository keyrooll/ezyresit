import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, branch:branches(*), department:departments(*), position:positions(*), shift:shifts(*), supervisor:profiles!supervisor_id(id, full_name, avatar_url)')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as unknown as Profile | null);
  };

  useEffect(() => {
    let mounted = true;

    const isOAuthRedirect =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=');

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else if (!isOAuthRedirect) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    const timeoutId = isOAuthRedirect
      ? window.setTimeout(() => { if (mounted) setLoading(false); }, 5000)
      : undefined;

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCanAccess(requiredRoles: UserRole[]): boolean {
  const { profile } = useAuth();
  return profile ? requiredRoles.includes(profile.role) : false;
}
