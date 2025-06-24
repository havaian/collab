// frontend/src/components/auth/LoginPage.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import Button from '../shared/Button';
import {
    CodeBracketIcon,
    RocketLaunchIcon,
    UserGroupIcon,
    SparklesIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const LoginPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { loginWithGitHub, isLoading, isAuthenticated } = useAuth();

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Handle OAuth errors from URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const error = urlParams.get('error');

        if (error) {
            let errorMessage = 'Authentication failed. Please try again.';

            switch (error) {
                case 'auth_failed':
                    errorMessage = 'GitHub authentication failed. Please try again.';
                    break;
                case 'user_fetch_failed':
                    errorMessage = 'Failed to get user information. Please try again.';
                    break;
                case 'callback_failed':
                    errorMessage = 'Authentication process failed. Please try again.';
                    break;
                case 'no_token':
                    errorMessage = 'No authentication token received. Please try again.';
                    break;
                default:
                    errorMessage = 'Authentication error occurred. Please try again.';
            }

            toast.error(errorMessage, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });

            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [location]);

    const handleGitHubLogin = () => {
        if (isLoading) return;
        loginWithGitHub();
    };

    // Don't render anything if already authenticated (will redirect)
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Standalone Header for Login */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                                <CodeBracketIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                GPT-Collab
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
                        {/* Left Side - Hero Content */}
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                                    Code Together with{' '}
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        AI Power
                                    </span>
                                </h1>
                                <p className="text-xl text-gray-600 leading-relaxed">
                                    Collaborative code editor with real-time AI assistance, instant execution, and seamless team collaboration.
                                </p>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Multi-language</h3>
                                        <p className="text-sm text-gray-600">50+ languages</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <UserGroupIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Collaboration</h3>
                                        <p className="text-sm text-gray-600">Real-time editing</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <SparklesIcon className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">AI Assistant</h3>
                                        <p className="text-sm text-gray-600">ChatGPT powered</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <RocketLaunchIcon className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">Instant Run</h3>
                                        <p className="text-sm text-gray-600">Execute instantly</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Login Card */}
                        <div className="lg:ml-8">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            Get Started
                                        </h2>
                                        <p className="text-gray-600">
                                            Sign in to start coding with AI assistance
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleGitHubLogin}
                                        disabled={isLoading}
                                        loading={isLoading}
                                        variant="dark"
                                        size="lg"
                                        className="w-full transform hover:scale-[1.02]"
                                    >
                                        {!isLoading && (
                                            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        {isLoading ? 'Signing in...' : 'Continue with GitHub'}
                                        {!isLoading && <ArrowRightIcon className="w-4 h-4 ml-2" />}
                                    </Button>

                                    <div className="pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-500 text-center">
                                            By signing in, you agree to our{' '}
                                            <a href="#" className="text-blue-600 hover:text-blue-700">terms of service</a>{' '}
                                            and{' '}
                                            <a href="#" className="text-blue-600 hover:text-blue-700">privacy policy</a>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-600">
                                    ✨ Free to use • 🚀 No setup required • 🔒 Secure authentication
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;