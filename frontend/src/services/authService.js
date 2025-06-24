// services/authService.js
import apiService from './apiService';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.initializeAuthState();
    }

    // Initialize authentication state on service creation
    async initializeAuthState() {
        try {
            const token = apiService.getToken();
            if (token) {
                // Validate token and get user info
                await this.getCurrentUser();
            }
        } catch (error) {
            console.error('Failed to initialize auth state:', error);
            this.logout();
        }
    }

    // Get current user information
    async getCurrentUser() {
        try {
            const response = await apiService.get('/auth/user');
            this.currentUser = response.user || response;
            this.notifyAuthStateChange(true, this.currentUser);
            return this.currentUser;
        } catch (error) {
            console.error('Failed to get current user:', error);
            this.currentUser = null;
            this.notifyAuthStateChange(false, null);
            throw error;
        }
    }

    // GitHub OAuth login
    async loginWithGitHub() {
        try {
            // Redirect to GitHub OAuth
            const githubAuthUrl = `${apiService.client.defaults.baseURL}/auth/github`;
            window.location.href = githubAuthUrl;
        } catch (error) {
            console.error('GitHub login failed:', error);
            throw error;
        }
    }

    // Google OAuth login
    async loginWithGoogle() {
        try {
            // Redirect to Google OAuth
            const googleAuthUrl = `${apiService.client.defaults.baseURL}/auth/google`;
            window.location.href = googleAuthUrl;
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    }

    // Handle OAuth callback (called after redirect from OAuth provider)
    async handleOAuthCallback(code, state, provider = 'github') {
        try {
            const response = await apiService.post(`/auth/${provider}/callback`, {
                code,
                state
            });

            const { token, refreshToken, user } = response;

            // Store tokens
            apiService.setToken(token);
            if (refreshToken) {
                apiService.setRefreshToken(refreshToken);
            }

            // Set current user
            this.currentUser = user;
            this.notifyAuthStateChange(true, user);

            return { user, token };
        } catch (error) {
            console.error(`${provider} OAuth callback failed:`, error);
            throw error;
        }
    }

    // Manual login (if you have email/password)
    async login(credentials) {
        try {
            const response = await apiService.post('/auth/login', credentials);
            const { token, refreshToken, user } = response;

            // Store tokens
            apiService.setToken(token);
            if (refreshToken) {
                apiService.setRefreshToken(refreshToken);
            }

            // Set current user
            this.currentUser = user;
            this.notifyAuthStateChange(true, user);

            return { user, token };
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    // Register new user
    async register(userData) {
        try {
            const response = await apiService.post('/auth/register', userData);
            const { token, refreshToken, user } = response;

            // Store tokens
            apiService.setToken(token);
            if (refreshToken) {
                apiService.setRefreshToken(refreshToken);
            }

            // Set current user
            this.currentUser = user;
            this.notifyAuthStateChange(true, user);

            return { user, token };
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            // Call logout endpoint to invalidate token on server
            if (apiService.getToken()) {
                await apiService.post('/auth/logout');
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with client-side logout even if server call fails
        } finally {
            // Clear tokens and user data
            apiService.clearTokens();
            this.currentUser = null;
            this.notifyAuthStateChange(false, null);
        }
    }

    // Update user profile
    async updateProfile(userData) {
        try {
            const response = await apiService.put('/auth/profile', userData);
            this.currentUser = { ...this.currentUser, ...response.user };
            this.notifyAuthStateChange(true, this.currentUser);
            return this.currentUser;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    // Update user password
    async updatePassword(passwordData) {
        try {
            const response = await apiService.put('/auth/password', passwordData);
            return response;
        } catch (error) {
            console.error('Password update failed:', error);
            throw error;
        }
    }

    // Request password reset
    async requestPasswordReset(email) {
        try {
            const response = await apiService.post('/auth/password-reset', { email });
            return response;
        } catch (error) {
            console.error('Password reset request failed:', error);
            throw error;
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            const response = await apiService.post('/auth/password-reset/confirm', {
                token,
                password: newPassword
            });
            return response;
        } catch (error) {
            console.error('Password reset failed:', error);
            throw error;
        }
    }

    // Verify email
    async verifyEmail(token) {
        try {
            const response = await apiService.post('/auth/verify-email', { token });
            return response;
        } catch (error) {
            console.error('Email verification failed:', error);
            throw error;
        }
    }

    // Resend verification email
    async resendVerification() {
        try {
            const response = await apiService.post('/auth/resend-verification');
            return response;
        } catch (error) {
            console.error('Resend verification failed:', error);
            throw error;
        }
    }

    // Get user settings
    async getUserSettings() {
        try {
            const response = await apiService.get('/auth/settings');
            return response.settings || response;
        } catch (error) {
            console.error('Failed to get user settings:', error);
            throw error;
        }
    }

    // Update user settings
    async updateUserSettings(settings) {
        try {
            const response = await apiService.put('/auth/settings', settings);
            return response.settings || response;
        } catch (error) {
            console.error('Failed to update user settings:', error);
            throw error;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser && !!apiService.getToken();
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser?.roles?.includes(role) || false;
    }

    // Check if user has specific permission
    hasPermission(permission) {
        return this.currentUser?.permissions?.includes(permission) || false;
    }

    // Get current user
    getUser() {
        return this.currentUser;
    }

    // Get user ID
    getUserId() {
        return this.currentUser?.id || this.currentUser?._id;
    }

    // Get user email
    getUserEmail() {
        return this.currentUser?.email;
    }

    // Get user display name
    getUserDisplayName() {
        return this.currentUser?.displayName ||
            this.currentUser?.username ||
            this.currentUser?.email;
    }

    // Get user avatar
    getUserAvatar() {
        return this.currentUser?.avatar || this.currentUser?.profilePicture;
    }

    // Auth state management
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);

        // Immediately call with current state
        callback(this.isAuthenticated(), this.currentUser);

        // Return unsubscribe function
        return () => {
            this.authStateListeners = this.authStateListeners.filter(
                listener => listener !== callback
            );
        };
    }

    notifyAuthStateChange(isAuthenticated, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(isAuthenticated, user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    // Token management helpers
    getToken() {
        return apiService.getToken();
    }

    isTokenExpired() {
        const token = apiService.getToken();
        return !apiService.isTokenValid(token);
    }

    // Utility methods
    async checkServerHealth() {
        try {
            const response = await apiService.healthCheck();
            return response;
        } catch (error) {
            console.error('Server health check failed:', error);
            throw error;
        }
    }

    // Force token refresh
    async refreshToken() {
        try {
            const newToken = await apiService.refreshAuthToken();
            return newToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            throw error;
        }
    }

    // Clear all auth data (for testing/debugging)
    clearAuthData() {
        apiService.clearTokens();
        this.currentUser = null;
        this.notifyAuthStateChange(false, null);
    }

    // Get auth headers for manual requests
    getAuthHeaders() {
        const token = apiService.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // Validate session
    async validateSession() {
        try {
            const response = await apiService.get('/auth/validate');
            return response.valid === true;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService;