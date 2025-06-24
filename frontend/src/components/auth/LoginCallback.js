// frontend/src/components/auth/LoginCallback.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginCallback = () => {
    const navigate = useNavigate();
    const { processOAuthCallback } = useAuth();

    useEffect(() => {
        const handleCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const error = urlParams.get('error');

            if (error) {
                console.error('OAuth error:', error);
                // Redirect to login/landing page with error
                navigate(`/login?error=${error}`, { replace: true });
                return;
            }

            if (token) {
                const result = await processOAuthCallback(token);

                if (result.success) {
                    // Redirect to dashboard/main app
                    navigate('/', { replace: true });
                } else {
                    navigate(`/login?error=callback_failed`, { replace: true });
                }
            } else {
                // No token provided, redirect to landing
                navigate('/login?error=no_token', { replace: true });
            }

            // Clean up URL parameters for security
            window.history.replaceState({}, document.title, window.location.pathname);
        };

        handleCallback();
    }, [navigate, processOAuthCallback]);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Completing Sign In...</h2>
                <p className="text-gray-500">Please wait while we process your authentication.</p>
            </div>
        </div>
    );
};

export default LoginCallback;