import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { isSupabaseConfigured } from '../lib/supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Wrap the component with GoogleOAuthProvider
const LoginPageContent: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectLocation = (location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null)?.from;
  const redirectPath = redirectLocation?.pathname;
  const from = redirectPath?.startsWith('/') && !redirectPath.startsWith('//')
    ? `${redirectPath}${redirectLocation?.search ?? ''}${redirectLocation?.hash ?? ''}`
    : '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const result = isSignUp
        ? await signUp(email, password)
        : await login(email, password);
      if (!result.success) {
        setError(result.error || (isSignUp ? 'Could not create your account.' : 'Login failed. Please try again.'));
      } else if (result.requiresConfirmation) {
        setNotice('Check your email for the confirmation link, then sign in here.');
        setIsSignUp(false);
        setPassword('');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{isSignUp ? 'Save roles and build your internship plan' : 'Sign in to continue to your dashboard'}</p>
          </div>

          {!isSupabaseConfigured && (
            <div role="alert" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Sign-in is not connected yet</p>
              <p className="mt-1">
                This deployment needs <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> configured before accounts can sign in or register. After adding them to the frontend environment, restart or redeploy the app.
              </p>
              <Link to="/internships" className="mt-2 inline-block font-medium underline underline-offset-2">
                Browse internships without an account
              </Link>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-md">
              {error}
            </div>
          )}

          {notice && (
            <div role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              {notice}
            </div>
          )}

          {/* Regular Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                {isSignUp && <span className="text-xs text-gray-500">Use at least 8 characters.</span>}
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={isSignUp ? 8 : undefined}
                disabled={isLoading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !isSupabaseConfigured || !email || !password}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing in...
                  </>
                ) : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Divider with "or" */}
          <div className="flex items-center my-8">
            <hr className="w-full border-gray-300 dark:border-gray-600" />
            <span className="px-4 text-sm text-gray-500">OR</span>
            <hr className="w-full border-gray-300 dark:border-gray-600" />
          </div>

          {/* Google Sign-In Button */}
          <div className="mt-4">
            <GoogleLoginButton onError={setError} />
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp((current) => !current); setError(null); setNotice(null); }}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap the component with GoogleOAuthProvider
const LoginPage: React.FC = () => {
  const loginPage = (
    <LoginPageContent />
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {loginPage}
    </GoogleOAuthProvider>
  ) : loginPage;
};

export default LoginPage;
