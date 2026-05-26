import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type GoogleResponse = {
  credential?: string;
  clientId?: string;
  select_by?: string;
  profileObj?: {
    googleId: string;
    name: string;
    email: string;
    imageUrl: string;
  };
};

const GoogleLoginButton: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (response: GoogleResponse) => {
    try {
      if (response.profileObj) {
        const result = await loginWithGoogle({
          profileObj: {
            googleId: response.profileObj.googleId,
            name: response.profileObj.name,
            email: response.profileObj.email,
            imageUrl: response.profileObj.imageUrl,
          },
          tokenId: response.credential || '',
          accessToken: response.credential || '',
        });
        
        if (result.success) {
          navigate('/');
        } else {
          console.error('Google login failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Error handling Google login:', error);
    }
  };

  const handleError = () => {
    console.error('Google login failed');
  };

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
          onSuccess={(response) => handleSuccess(response as unknown as GoogleResponse)}
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
