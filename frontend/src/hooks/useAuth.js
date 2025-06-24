import { useState, useEffect, useContext, createContext } from 'react';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // TODO: Validate token with backend
                // const response = await authService.validateToken(token);
                // if (response.valid) {
                //   setUser(response.user);
                //   setIsAuthenticated(true);
                // } else {
                //   localStorage.removeItem('authToken');
                // }

                // Mock user for development
                setUser({
                    id: 'user-123',
                    name: 'Developer User',
                    email: 'dev@example.com',
                    avatar: null
                });
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            localStorage.removeItem('authToken');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            setIsLoading(true);
            // TODO: Implement actual login
            // const response = await authService.login(credentials);
            // const { token, user } = response.data;

            // Mock login for development
            const mockUser = {
                id: 'user-123',
                name: credentials.name || 'Test User',
                email: credentials.email || 'test@example.com',
                avatar: null
            };

            const mockToken = 'mock-jwt-token-' + Date.now();

            localStorage.setItem('authToken', mockToken);
            setUser(mockUser);
            setIsAuthenticated(true);

            return { success: true, user: mockUser };
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
            // TODO: Implement GitHub OAuth
            // window.location.href = `${process.env.REACT_APP_API_URL}/auth/github`;

            // Mock GitHub login for development
            const mockUser = {
                id: 'github-user-123',
                name: 'GitHub User',
                email: 'github@example.com',
                avatar: 'https://github.com/identicons/user.png',
                provider: 'github'
            };

            const mockToken = 'mock-github-token-' + Date.now();

            localStorage.setItem('authToken', mockToken);
            setUser(mockUser);
            setIsAuthenticated(true);

            return { success: true, user: mockUser };
        } catch (error) {
            console.error('GitHub login failed:', error);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            // TODO: Notify backend of logout
            // await authService.logout();

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