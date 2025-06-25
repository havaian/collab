// services/apiService.js
import axios from 'axios';

class ApiService {
    constructor() {
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Token management
        this.tokenKey = 'auth_token';
        this.refreshTokenKey = 'refresh_token';

        // Setup request interceptor
        this.setupRequestInterceptor();

        // Setup response interceptor
        this.setupResponseInterceptor();
    }

    setupRequestInterceptor() {
        this.client.interceptors.request.use(
            (config) => {
                // Add auth token to every request
                const token = this.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                // Add request timestamp for debugging
                config.metadata = { startTime: new Date() };

                console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('❌ Request interceptor error:', error);
                return Promise.reject(error);
            }
        );
    }

    setupResponseInterceptor() {
        this.client.interceptors.response.use(
            (response) => {
                // Log successful responses
                const duration = new Date() - response.config.metadata.startTime;
                console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
                return response;
            },
            async (error) => {
                const originalRequest = error.config;

                // Log error details
                console.error('❌ API Error:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });

                // Handle 401 Unauthorized errors
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        // Try to refresh token
                        await this.refreshAuthToken();

                        // Retry original request with new token
                        const newToken = this.getToken();
                        if (newToken) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        // Clear tokens and redirect to login
                        this.clearTokens();
                        this.redirectToLogin();
                        return Promise.reject(refreshError);
                    }
                }

                // Handle network errors
                if (!error.response) {
                    error.message = 'Network error. Please check your connection.';
                }

                return Promise.reject(error);
            }
        );
    }

    // Token management methods
    getToken() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            if (token && this.isTokenValid(token)) {
                return token;
            }
            return null;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    setToken(token) {
        try {
            if (token) {
                localStorage.setItem(this.tokenKey, token);
            } else {
                localStorage.removeItem(this.tokenKey);
            }
        } catch (error) {
            console.error('Error setting token:', error);
        }
    }

    getRefreshToken() {
        try {
            return localStorage.getItem(this.refreshTokenKey);
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    }

    setRefreshToken(refreshToken) {
        try {
            if (refreshToken) {
                localStorage.setItem(this.refreshTokenKey, refreshToken);
            } else {
                localStorage.removeItem(this.refreshTokenKey);
            }
        } catch (error) {
            console.error('Error setting refresh token:', error);
        }
    }

    clearTokens() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.refreshTokenKey);
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    isTokenValid(token) {
        try {
            if (!token) return false;

            // Check if JWT token is expired
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);

            // Add 5 minute buffer for token expiration
            return payload.exp > (currentTime + 300);
        } catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }

    async refreshAuthToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh`, {
                refreshToken
            });

            const { token, refreshToken: newRefreshToken } = response.data;
            this.setToken(token);
            if (newRefreshToken) {
                this.setRefreshToken(newRefreshToken);
            }

            return token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }

    redirectToLogin() {
        // Clear any stored user data
        this.clearTokens();

        // Redirect to login page
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    // Generic HTTP methods
    async get(url, config = {}) {
        try {
            const response = await this.client.get(url, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async post(url, data = {}, config = {}) {
        try {
            const response = await this.client.post(url, data, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async put(url, data = {}, config = {}) {
        try {
            const response = await this.client.put(url, data, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async patch(url, data = {}, config = {}) {
        try {
            const response = await this.client.patch(url, data, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(url, config = {}) {
        try {
            const response = await this.client.delete(url, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getProjects({ search, sortBy = 'updatedAt', page = 1, limit = 10 } = {}) {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (sortBy) params.append('sortBy', sortBy);
            if (page) params.append('page', page.toString());
            if (limit) params.append('limit', limit.toString());

            const response = await this.client.get(`/projects?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            throw this.handleError(error);
        }
    }

    async getPublicProjects({ search, page = 1, limit = 10 } = {}) {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (page) params.append('page', page.toString());
            if (limit) params.append('limit', limit.toString());

            const response = await this.client.get(`/projects/public?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch public projects:', error);
            throw this.handleError(error);
        }
    }

    async createProject(projectData) {
        try {
            const response = await this.client.post('/projects', projectData);
            return response.data;
        } catch (error) {
            console.error('Failed to create project:', error);
            throw this.handleError(error);
        }
    }

    async getProject(projectId) {
        try {
            const response = await this.client.get(`/projects/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch project:', error);
            throw this.handleError(error);
        }
    }

    async updateProject(projectId, projectData) {
        try {
            const response = await this.client.put(`/projects/${projectId}`, projectData);
            return response.data;
        } catch (error) {
            console.error('Failed to update project:', error);
            throw this.handleError(error);
        }
    }

    async deleteProject(projectId) {
        try {
            const response = await this.client.delete(`/projects/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw this.handleError(error);
        }
    }

    async addCollaborator(projectId, collaboratorData) {
        try {
            const response = await this.client.post(`/projects/${projectId}/collaborators`, collaboratorData);
            return response.data;
        } catch (error) {
            console.error('Failed to add collaborator:', error);
            throw this.handleError(error);
        }
    }

    // File upload method
    async uploadFile(url, file, onUploadProgress = null) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            if (onUploadProgress) {
                config.onUploadProgress = onUploadProgress;
            }

            const response = await this.client.post(url, formData, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Download file method
    async downloadFile(url, filename) {
        try {
            const response = await this.client.get(url, {
                responseType: 'blob',
            });

            // Create download link
            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getPendingInvites() {
        try {
            const response = await this.get('/invite/user');
            return response;
        } catch (error) {
            console.error('Failed to get pending invites:', error);
            throw error;
        }
    }

    // Error handling
    handleError(error) {
        const errorResponse = {
            message: 'An unexpected error occurred',
            status: null,
            data: null,
        };

        if (error.response) {
            // Server responded with error status
            errorResponse.status = error.response.status;
            errorResponse.data = error.response.data;
            errorResponse.message = error.response.data?.message ||
                error.response.data?.error ||
                `Server error: ${error.response.status}`;
        } else if (error.request) {
            // Request made but no response received
            errorResponse.message = 'Network error. Please check your connection.';
        } else {
            // Something else happened
            errorResponse.message = error.message || 'Request failed';
        }

        return errorResponse;
    }

    // Health check method
    async healthCheck() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.data;
        } catch (error) {
            console.error('Health check failed:', error);
            throw this.handleError(error);
        }
    }

    // Get current request count (for debugging)
    getRequestCount() {
        return this.client.defaults.metadata?.requestCount || 0;
    }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;