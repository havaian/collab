// API Base URL
const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

// Auth Service Class
class AuthService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/auth`;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem('authToken');
    }

    // Set auth headers for requests
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    }

    // Make authenticated API request
    async apiRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Login with email and password
    async login(credentials) {
        try {
            const response = await this.apiRequest('/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (response.token) {
                localStorage.setItem('authToken', response.token);
            }

            return response;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    // Register new user
    async register(userData) {
        try {
            const response = await this.apiRequest('/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.token) {
                localStorage.setItem('authToken', response.token);
            }

            return response;
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }

    // GitHub OAuth login
    async loginWithGitHub() {
        try {
            // Redirect to GitHub OAuth
            window.location.href = `${this.baseURL}/github`;
        } catch (error) {
            throw new Error('GitHub login initialization failed');
        }
    }

    // Handle GitHub OAuth callback
    async handleGitHubCallback(code, state) {
        try {
            const response = await this.apiRequest('/github/callback', {
                method: 'POST',
                body: JSON.stringify({ code, state })
            });

            if (response.token) {
                localStorage.setItem('authToken', response.token);
            }

            return response;
        } catch (error) {
            throw new Error(error.message || 'GitHub authentication failed');
        }
    }

    // Validate existing token
    async validateToken(token = null) {
        try {
            const tokenToValidate = token || this.getToken();
            if (!tokenToValidate) {
                throw new Error('No token provided');
            }

            const response = await this.apiRequest('/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tokenToValidate}`
                }
            });

            return response;
        } catch (error) {
            // Clear invalid token
            localStorage.removeItem('authToken');
            throw new Error('Token validation failed');
        }
    }

    // Get current user profile
    async getCurrentUser() {
        try {
            const response = await this.apiRequest('/user', {
                method: 'GET'
            });

            return response;
        } catch (error) {
            throw new Error(error.message || 'Failed to get user profile');
        }
    }

    // Update user profile
    async updateProfile(userData) {
        try {
            const response = await this.apiRequest('/profile', {
                method: 'PUT',
                body: JSON.stringify(userData)
            });

            return response;
        } catch (error) {
            throw new Error(error.message || 'Profile update failed');
        }
    }

    // Logout user
    async logout() {
        try {
            await this.apiRequest('/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout request failed:', error);
            // Continue with local logout even if server request fails
        } finally {
            // Always clear local storage
            localStorage.removeItem('authToken');
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.apiRequest('/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            return response;
        } catch (error) {
            throw new Error(error.message || 'Password change failed');
        }
    }

    // Request password reset
    async requestPasswordReset(email) {
        try {
            const response = await this.apiRequest('/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            return response;
        } catch (error) {
            throw new Error(error.message || 'Password reset request failed');
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            const response = await this.apiRequest('/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });

            return response;
        } catch (error) {
            throw new Error(error.message || 'Password reset failed');
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Get user ID from token (client-side decode - for display only)
    getUserIdFromToken() {
        try {
            const token = this.getToken();
            if (!token) return null;

            // Basic JWT decode (not for security, just for convenience)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || payload.id || null;
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    }
}

// Create and export singleton instance
const authService = new AuthService();

export default authService;