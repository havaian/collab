// frontend/src/hooks/useAuth.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://collab.ytech.space/api';

    // Check if user is already authenticated on app load
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    // Validate token and get user info
                    const response = await fetch(`${API_BASE_URL}/auth/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData.user);
                        setIsAuthenticated(true);
                    } else {
                        // Token is invalid, remove it
                        localStorage.removeItem('authToken');
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize auth state:', error);
                localStorage.removeItem('authToken');
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [API_BASE_URL]);

    const login = async (credentials) => {
        try {
            setIsLoading(true);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                setUser(data.user);
                setIsAuthenticated(true);
                return { success: true, user: data.user };
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithGitHub = async () => {
        try {
            setIsLoading(true);
            // Redirect to GitHub OAuth
            window.location.href = `${API_BASE_URL}/auth/github`;
        } catch (error) {
            console.error('GitHub login failed:', error);
            setIsLoading(false);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('authToken');

            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
            return { success: true };
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if logout fails on server, clear local state
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
            return { success: false, error: error.message };
        }
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        loginWithGitHub,
        logout,
        updateUser,
        setUser,
        setIsAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// useAuth Hook
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

// Higher-Order Component for Protected Routes
export const withAuth = (Component) => {
    return function AuthenticatedComponent(props) {
        const { isAuthenticated, isLoading } = useAuth();

        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
                        <p className="text-gray-600">Please log in to access this page.</p>
                    </div>
                </div>
            );
        }

        return <Component {...props} />;
    };
};

export default useAuth;