import React from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const GoogleLoginButton: React.FC<{ onError: (message: string) => void }> = ({ onError }) => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectLocation = (location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null)?.from;
  const redirectPath = redirectLocation?.pathname;
  const from = redirectPath?.startsWith('/') && !redirectPath.startsWith('//')
    ? `${redirectPath}${redirectLocation?.search ?? ''}${redirectLocation?.hash ?? ''}`
    : '/';

  const handleSuccess = async (response: CredentialResponse) => {
    try {
      const result = await loginWithGoogle(response.credential || '');
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        onError(result.error || 'Google sign-in failed. Please try again.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.');
    }
  };

  const handleError = () => {
    onError('Google sign-in failed. Please try again.');
  };

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return <p className="text-center text-xs text-gray-500">Google sign-in is not configured.</p>;
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="mt-6">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
          auto_select
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
          width="100%"
        />
      </div>
    </div>
  );
};

export default GoogleLoginButton;
