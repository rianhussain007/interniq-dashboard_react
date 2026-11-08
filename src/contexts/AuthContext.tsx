import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authMode, isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  clearLocalAccessToken,
  getLocalAccessToken,
  localAuthRequest,
  saveLocalAccessToken,
  type LocalAuthResponse,
  type LocalAuthUser,
} from '../lib/authSession';

export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  authProvider: 'google' | 'email' | 'local';
};

type AuthResult = {
  success: boolean;
  error?: string;
  requiresConfirmation?: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  updateDisplayName: (name: string) => void;
  logout: () => Promise<void>;
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

  return { id: session.user.id, name, email, picture, authProvider: provider };
}

function userFromLocal(user: LocalAuthUser): User {
  return { id: user.id, name: user.name, email: user.email, authProvider: 'local' };
}

const configuredAuthMode = authMode === 'supabase' ? 'supabase' : 'local';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Remove the legacy demo identity so it cannot be mistaken for a verified session.
    localStorage.removeItem('user');

    if (configuredAuthMode === 'local') {
      const token = getLocalAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      let mounted = true;
      void localAuthRequest<LocalAuthUser>('/api/auth/me', token)
        .then((localUser) => {
          if (mounted) setUser(userFromLocal(localUser));
        })
        .catch(() => {
          clearLocalAccessToken();
          if (mounted) setUser(null);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
      return () => { mounted = false; };
    }

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

  const login = async (email: string, password: string): Promise<AuthResult> => {
    if (configuredAuthMode === 'local') {
      try {
        const result = await localAuthRequest<LocalAuthResponse>('/api/auth/login', undefined, { email, password });
        saveLocalAccessToken(result.access_token);
        setUser(userFromLocal(result.user));
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Could not sign in.' };
      }
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Authentication needs the Supabase URL and public anon key configured.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { success: false, error: error.message } : { success: true };
  };

  const signUp = async (name: string, email: string, password: string): Promise<AuthResult> => {
    if (configuredAuthMode === 'local') {
      try {
        const result = await localAuthRequest<LocalAuthResponse>('/api/auth/register', undefined, { name, email, password });
        saveLocalAccessToken(result.access_token);
        setUser(userFromLocal(result.user));
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Could not create your account.' };
      }
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: 'Authentication needs the Supabase URL and public anon key configured.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) return { success: false, error: error.message };
    if (data.session) setUser(userFromSession(data.session));
    return { success: true, requiresConfirmation: !data.session };
  };

  const loginWithGoogle = async (idToken: string): Promise<AuthResult> => {
    if (configuredAuthMode === 'local') {
      return { success: false, error: 'Google sign-in is available after connecting a Supabase provider.' };
    }
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Authentication needs the Supabase URL and public anon key configured.' };
    }
    if (!idToken) return { success: false, error: 'Google did not return a sign-in token.' };
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) return { success: false, error: error.message };
    setUser(userFromSession(data.session));
    return { success: true };
  };

  const logout = async () => {
    if (configuredAuthMode === 'local') {
      const token = getLocalAccessToken();
      clearLocalAccessToken();
      setUser(null);
      if (token) await localAuthRequest('/api/auth/logout', token, undefined, 'POST').catch(() => undefined);
      return;
    }

    setUser(null);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Could not sign out of Supabase:', error.message);
    }
  };

  const updateDisplayName = (name: string) => {
    setUser((current) => current ? { ...current, name } : current);
  };

  const value: AuthContextType = {
    user,
    login,
    signUp,
    loginWithGoogle,
    updateDisplayName,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
