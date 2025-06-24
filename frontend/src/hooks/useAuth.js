import { useState, useEffect, useContext, createContext } from 'react';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // Validate token with backend
                const response = await fetch(`${API_BASE_URL}/auth/validate`, {
                    method: 'GET',
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
            console.error('Auth initialization failed:', error);
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

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

            // Notify backend of logout
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
            // Force logout even if backend call fails
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);

            return { success: false, error: error.message };
        }
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    // Handle OAuth callback
    useEffect(() => {
        const handleOAuthCallback = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const error = urlParams.get('error');

            if (token) {
                localStorage.setItem('authToken', token);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                // Reinitialize auth to fetch user data
                initializeAuth();
            } else if (error) {
                console.error('OAuth error:', error);
                setIsLoading(false);
            }
        };

        handleOAuthCallback();
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        loginWithGitHub,
        logout,
        updateUser
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