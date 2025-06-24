// src/components/auth/ProtectedRoute.js
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginButton from './LoginButton';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to GPT-Collab
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Collaborative coding with AI assistance
            </p>
          </div>
          <div className="text-center">
            <LoginButton className="w-full" />
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;