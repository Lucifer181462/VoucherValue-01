import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const sessionId = params.get('session_id');

    if (!sessionId) {
      toast.error('Invalid session');
      navigate('/');
      return;
    }

    const exchangeSession = async () => {
      try {
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        if (response.data) {
          toast.success('Login successful!');
          navigate('/dashboard', {
            replace: true,
            state: { user: response.data },
          });
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        navigate('/', { replace: true });
      }
    };

    exchangeSession();
  }, [location.hash, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-text-secondary" data-testid="auth-callback-text">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
