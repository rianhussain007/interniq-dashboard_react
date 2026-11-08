import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  authProvider: 'google' | 'email';
};

type AuthResult = {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function userFromSession(session: Session | null): User | null {
  if (!session?.user) return null;

  const metadata = session.user.user_metadata ?? {};
  const email = session.user.email ?? '';
  const provider = session.user.app_metadata?.provider === 'google' ? 'google' : 'email';
  const name = [metadata.full_name, metadata.name].find((value): value is string => typeof value === 'string')
    || email.split('@')[0]
    || 'InternIQ user';
  const picture = [metadata.avatar_url, metadata.picture].find((value): value is string => typeof value === 'string');

  return {
    id: session.user.id,
    name,
    email,
    picture,
    authProvider: provider,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Remove the old demo identity so it cannot be mistaken for a verified session.
    localStorage.removeItem('user');

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(userFromSession(session));
        setIsLoading(false);
      }
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.error('Could not restore the Supabase session:', error.message);
        setUser(userFromSession(data.session));
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error('Could not restore the Supabase session:', error);
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const missingConfig = (): AuthResult => ({
    success: false,
    error: 'Authentication is not configured. Set the Supabase URL and anon key in your environment.',
  });

  const login = async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return missingConfig();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { success: false, error: error.message } : { success: true };
  };

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return missingConfig();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };

    if (data.session) setUser(userFromSession(data.session));
    return { success: true, requiresConfirmation: !data.session };
  };

  const loginWithGoogle = async (idToken: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return missingConfig();
    if (!idToken) return { success: false, error: 'Google did not return a sign-in token.' };

    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { success: false, error: error.message };
    setUser(userFromSession(data.session));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    if (isSupabaseConfigured) {
      void supabase.auth.signOut().then(({ error }) => {
        if (error) console.error('Could not sign out of Supabase:', error.message);
      });
    }
  };

  const value: AuthContextType = {
    user,
    login,
    signUp,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
