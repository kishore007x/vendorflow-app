import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

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

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return (data?.role as UserRole) || 'vendor';
}

async function fetchProfile(userId: string): Promise<{ name: string; avatar_url: string | null } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', userId)
    .single();
  return data;
}

async function buildAppUser(session: Session): Promise<AppUser | null> {
  const supaUser = session.user;
  
  // Block unverified email users
  if (!supaUser.email_confirmed_at) {
    return null;
  }
  
  const [role, profile] = await Promise.all([
    fetchUserRole(supaUser.id),
    fetchProfile(supaUser.id),
  ]);
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
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setTimeout(async () => {
          try {
            const appUser = await buildAppUser(session);
            if (appUser) {
              setUser(appUser);
              setEmailNotVerified(false);
            } else {
              setUser(null);
              setEmailNotVerified(true);
            }
          } catch {
            setUser(null);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setEmailNotVerified(false);
        setIsLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const appUser = await buildAppUser(session);
          if (appUser) {
            setUser(appUser);
            setEmailNotVerified(false);
          } else {
            setUser(null);
            setEmailNotVerified(true);
          }
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
