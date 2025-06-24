// frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_START':
            return { ...state, loading: true, error: null };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                loading: false,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                error: null
            };
        case 'LOGIN_ERROR':
            return {
                ...state,
                loading: false,
                isAuthenticated: false,
                user: null,
                token: null,
                error: action.payload
            };
        case 'LOGOUT':
            return {
                ...state,
                loading: false,
                isAuthenticated: false,
                user: null,
                token: null,
                error: null
            };
        case 'UPDATE_USER':
            return { ...state, user: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
};

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
    error: null
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        // Only initialize auth once
        if (!authInitialized) {
            initializeAuth();
            setAuthInitialized(true);
        }
    }, [authInitialized]);

    const initializeAuth = async () => {
        try {
            // Handle OAuth callback first
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const error = urlParams.get('error');

            if (token) {
                // Clear URL parameters immediately to prevent loops
                window.history.replaceState({}, document.title, window.location.pathname);
                await handleOAuthCallback(token);
                return;
            }

            if (error) {
                window.history.replaceState({}, document.title, window.location.pathname);
                dispatch({ type: 'LOGIN_ERROR', payload: 'Authentication failed' });
                return;
            }

            // Check existing auth state
            await checkExistingAuth();
        } catch (error) {
            console.error('Auth initialization failed:', error);
            dispatch({ type: 'LOGIN_ERROR', payload: error.message });
        }
    };

    const handleOAuthCallback = async (token) => {
        try {
            dispatch({ type: 'LOGIN_START' });

            // Store token using your existing service
            localStorage.setItem('auth_token', token);

            // Get user info - this will set authService.currentUser
            const user = await authService.getCurrentUser();

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user, token }
            });

            // Return success response for LoginCallback component
            return { success: true, user, token };
        } catch (error) {
            console.error('OAuth callback failed:', error);
            authService.clearAuthData();
            dispatch({ type: 'LOGIN_ERROR', payload: error.message });

            // Return error response for LoginCallback component
            return { success: false, error: error.message };
        }
    };

    const checkExistingAuth = async () => {
        try {
            // Check if authService already has a user (from its own initialization)
            if (authService.currentUser && authService.isAuthenticated()) {
                const token = authService.getToken();
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user: authService.currentUser, token }
                });
                return;
            }

            // If no current user but token exists, try to get user
            const token = authService.getToken();
            if (token) {
                dispatch({ type: 'LOGIN_START' });
                const user = await authService.getCurrentUser();
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user, token }
                });
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            dispatch({ type: 'LOGIN_ERROR', payload: error.message });
        }
    };

    const login = () => {
        authService.loginWithGitHub();
    };

    const loginWithGitHub = () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        authService.loginWithGitHub();
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            dispatch({ type: 'LOGOUT' });
        }
    };

    const updateUser = (userData) => {
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    // Helper function for LoginCallback component
    const processOAuthCallback = async (token) => {
        return await handleOAuthCallback(token);
    };

    const value = {
        ...state,
        login,
        loginWithGitHub,
        logout,
        updateUser,
        processOAuthCallback,
        // Expose these for compatibility
        isLoading: state.loading,
        setUser: (user) => dispatch({ type: 'UPDATE_USER', payload: user }),
        setIsAuthenticated: (auth) => {
            if (auth) {
                // Don't set without proper user data
                console.warn('setIsAuthenticated called without user data');
            } else {
                dispatch({ type: 'LOGOUT' });
            }
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;