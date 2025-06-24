// src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
                error: null,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true
            };
        case 'LOGIN_ERROR':
            return {
                ...state,
                loading: false,
                error: action.payload,
                user: null,
                token: null,
                isAuthenticated: false
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                error: null
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: { ...state.user, ...action.payload }
            };
        default:
            return state;
    }
};

const initialState = {
    user: null,
    token: localStorage.getItem('gpt-collab-token'),
    isAuthenticated: false,
    loading: false,
    error: null
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Check for token in URL (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (token) {
            localStorage.setItem('gpt-collab-token', token);
            window.history.replaceState({}, document.title, window.location.pathname);
            loadUser(token);
        } else if (error) {
            dispatch({ type: 'LOGIN_ERROR', payload: 'Authentication failed' });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (state.token) {
            loadUser(state.token);
        }
    }, []);

    const loadUser = async (token) => {
        try {
            dispatch({ type: 'LOGIN_START' });
            const user = await authService.getCurrentUser(token);
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user, token }
            });
        } catch (error) {
            localStorage.removeItem('gpt-collab-token');
            dispatch({ type: 'LOGIN_ERROR', payload: error.message });
        }
    };

    const login = () => {
        window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/github`;
    };

    const logout = async () => {
        try {
            await authService.logout(state.token);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('gpt-collab-token');
            dispatch({ type: 'LOGOUT' });
        }
    };

    const updateUser = (userData) => {
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                logout,
                updateUser
            }}
        >
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