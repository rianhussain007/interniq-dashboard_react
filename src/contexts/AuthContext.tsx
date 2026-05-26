import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  authProvider?: 'google' | 'email';
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleData: GoogleLoginData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type GoogleLoginData = {
  profileObj: {
    googleId: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // For demo purposes, accept any non-empty credentials
      if (email && password) {
        // Create a user object with the provided email
        const user: User = {
          id: `user_${Date.now()}`,
          name: email.split('@')[0],
          email,
          authProvider: 'email' as const,
        };

        // Store user in state and localStorage
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));

        return { success: true };
      } else {
        return { success: false, error: 'Email and password are required' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const loginWithGoogle = async (googleData: GoogleLoginData) => {
    try {
      // In a real app, you would verify the token with your backend
      const profile = googleData.profileObj;

      const googleUser: User = {
        id: `google_${profile.googleId}`,
        name: profile.name,
        email: profile.email,
        picture: profile.imageUrl,
        authProvider: 'google',
      };

      // Store user in state and localStorage
      setUser(googleUser);
      localStorage.setItem('user', JSON.stringify(googleUser));

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'An error occurred during Google login' };
    }
  };

  const logout = () => {
    // Clear user from state and localStorage
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
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
