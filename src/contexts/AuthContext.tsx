import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'vendor' | 'operations';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  emailNotVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
};

async function fetchUserRole(userId: string): Promise<UserRole> {
  try {
    const { data } = await withTimeout(supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle(), 8000, 'fetchUserRole');
    return (data?.role as UserRole) || 'vendor';
  } catch (e) {
    console.warn('fetchUserRole failed, defaulting to vendor:', e);
    return 'vendor';
  }
}

async function fetchProfile(userId: string): Promise<{ name: string; avatar_url: string | null } | null> {
  try {
    const { data } = await withTimeout(supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', userId)
      .single(), 8000, 'fetchProfile');
    return data;
  } catch (e) {
    console.warn('fetchProfile failed:', e);
    return null;
  }
}

async function buildAppUser(session: Session): Promise<AppUser | null> {
  const supaUser = session.user;
  const role = await fetchUserRole(supaUser.id);
  if (!supaUser.email_confirmed_at && role !== 'admin') {
    return null;
  }
  const profile = await fetchProfile(supaUser.id);
  return {
    id: supaUser.id,
    name: profile?.name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
    email: supaUser.email || '',
    role,
    avatar: profile?.avatar_url || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setEmailNotVerified(false);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000, 'getSession');
        if (!mounted) return;

        if (session) {
          const appUser = await withTimeout(buildAppUser(session), 15000, 'buildAppUser');
          if (!mounted) return;
          if (appUser) {
            setUser(appUser);
            setEmailNotVerified(false);
          } else {
            setUser(null);
            setEmailNotVerified(true);
          }
        } else {
          // No session - user not logged in
          setUser(null);
          setEmailNotVerified(false);
        }
      } catch (e) {
        console.error('Auth initialization failed:', e);
        // Don't log out on init failure - keep previous state or null
        if (mounted) {
          setUser(null);
          setEmailNotVerified(false);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignore token refresh events - they don't indicate actual auth state change
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (session) {
        try {
          const appUser = await withTimeout(buildAppUser(session), 15000, 'buildAppUser');
          if (!mounted) return;
          if (appUser) {
            setUser(appUser);
            setEmailNotVerified(false);
          } else {
            setUser(null);
            setEmailNotVerified(true);
          }
        } catch (e) {
          console.error('Auth state change failed:', e);
          // Don't log out on temporary failures - keep existing user
          if (!mounted) return;
        }
      } else {
        // Explicit sign out or session expired
        setUser(null);
        setEmailNotVerified(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured for this deployment.');
    }
    const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 15000, 'Login');
    if (error) throw new Error(error.message);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured for this deployment.');
    }
    const { error } = await withTimeout(supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    }), 15000, 'Sign up');
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      return;
    }
    try {
      await withTimeout(supabase.auth.signOut(), 8000, 'Logout');
    } catch {
      // Sign out locally even if network fails
    }
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    emailNotVerified,
    login,
    signup,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
