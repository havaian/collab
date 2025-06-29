// frontend/src/services/apiService.js
import axios from 'axios';

class ApiService {
    constructor() {
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: `${process.env.REACT_APP_API_URL || 'https://collab.ytech.space'}/api`,
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

    // Project files method with correct endpoint
    async getProjectFiles(projectId) {
        try {
            const response = await this.client.get(`/files/project/${projectId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch project files:', error);
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

    // File Operations with proper error handling and validation
    async createFile(fileData) {
        try {
            // Validate required fields
            if (!fileData.projectId) {
                throw new Error('Project ID is required');
            }
            if (!fileData.name || fileData.name.trim().length === 0) {
                throw new Error('File name is required');
            }

            const response = await this.client.post(`/files/project/${fileData.projectId}`, {
                name: fileData.name.trim(),
                type: fileData.type || 'file',
                content: fileData.content || '',
                parentFolder: fileData.parentId || null
            });
            return response.data;
        } catch (error) {
            console.error('Create file error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to create file');
        }
    }

    async deleteFile(fileId, permanent = false) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }

            const response = await this.client.delete(`/files/${fileId}`, {
                params: { permanent: permanent.toString() }
            });
            return response.data;
        } catch (error) {
            console.error('Delete file error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to delete file');
        }
    }

    // Rename file method with proper validation
    async renameFile(fileId, newName) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }
            if (!newName || newName.trim().length === 0) {
                throw new Error('New name is required');
            }

            const response = await this.client.put(`/files/${fileId}`, {
                name: newName.trim()
            });
            return response.data;
        } catch (error) {
            console.error('Rename file error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to rename file');
        }
    }

    // Move file method with proper null handling
    async moveFile(fileId, parentFolderId) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }

            // Handle null/undefined parent folder properly
            const requestBody = {
                parentFolder: parentFolderId === null || parentFolderId === undefined || parentFolderId === '' 
                    ? null 
                    : parentFolderId
            };

            const response = await this.client.put(`/files/${fileId}/move`, requestBody);
            return response.data;
        } catch (error) {
            console.error('Move file error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to move file');
        }
    }

    async duplicateFile(fileId, newName) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }

            const requestBody = {};
            if (newName && newName.trim().length > 0) {
                requestBody.name = newName.trim();
            }

            const response = await this.client.post(`/files/${fileId}/duplicate`, requestBody);
            return response.data;
        } catch (error) {
            console.error('Duplicate file error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to duplicate file');
        }
    }

    async getFileContent(fileId) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }

            const response = await this.client.get(`/files/${fileId}`);
            return response.data;
        } catch (error) {
            console.error('Get file content error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to load file content');
        }
    }

    // Update file content with comprehensive error handling
    async updateFileContent(fileId, content, metadata = {}) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }
            if (content === undefined || content === null) {
                throw new Error('Content is required');
            }

            // Log request for debugging
            console.log(`Updating file ${fileId} with content length: ${content.length}`);

            const requestBody = { content };
            
            // Only add metadata if it's not empty
            if (metadata && Object.keys(metadata).length > 0) {
                requestBody.metadata = metadata;
            }

            const response = await this.client.put(`/files/${fileId}`, requestBody);
            
            // Log successful response
            console.log(`File ${fileId} updated successfully`);
            
            return response.data;
        } catch (error) {
            console.error('Update file content error:', error);
            
            // Better error message handling
            let errorMessage = 'Failed to update file content';
            
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    }

    // Batch operations for frontend
    async batchDeleteFiles(fileIds, permanent = false) {
        try {
            if (!Array.isArray(fileIds) || fileIds.length === 0) {
                throw new Error('File IDs array is required');
            }

            const response = await this.client.post('/files/batch/delete', {
                fileIds,
                permanent
            });
            return response.data;
        } catch (error) {
            console.error('Batch delete files error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to delete files');
        }
    }

    async batchMoveFiles(fileIds, parentFolderId) {
        try {
            if (!Array.isArray(fileIds) || fileIds.length === 0) {
                throw new Error('File IDs array is required');
            }

            const response = await this.client.post('/files/batch/move', {
                fileIds,
                parentFolder: parentFolderId === null || parentFolderId === undefined || parentFolderId === ''
                    ? null 
                    : parentFolderId
            });
            return response.data;
        } catch (error) {
            console.error('Batch move files error:', error);
            throw new Error(error.response?.data?.error || error.message || 'Failed to move files');
        }
    }

    // GitHub Operations
    async getGitHubRepositories(page = 1, perPage = 30) {
        try {
            const response = await this.client.get('/github/repos', {
                params: { page, per_page: perPage }
            });
            return response.data;
        } catch (error) {
            console.error('Get GitHub repositories error:', error);
            throw new Error(error.response?.data?.error || 'Failed to load GitHub repositories');
        }
    }

    async importGitHubRepository(repositoryData) {
        try {
            const response = await this.client.post('/github/import', repositoryData);
            return response.data;
        } catch (error) {
            console.error('Import GitHub repository error:', error);
            throw new Error(error.response?.data?.error || 'Failed to import repository');
        }
    }

    async syncGitHubRepository(projectId, repositoryUrl, branch = 'main') {
        try {
            const response = await this.client.post('/github/sync', {
                projectId,
                repositoryUrl,
                branch
            });
            return response.data;
        } catch (error) {
            console.error('Sync GitHub repository error:', error);
            throw new Error(error.response?.data?.error || 'Failed to sync repository');
        }
    }

    async executeCode(codeData) {
        try {
            const response = await this.client.post('/execute', codeData);
            return response.data;
        } catch (error) {
            console.error('Failed to execute code:', error);
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

    // Error handling with more specific error types
    handleError(error) {
        const errorResponse = {
            message: 'An unexpected error occurred',
            status: null,
            data: null,
            code: null,
        };

        if (error.response) {
            // Server responded with error status
            errorResponse.status = error.response.status;
            errorResponse.data = error.response.data;
            
            // Extract error message from various possible structures
            if (error.response.data?.error) {
                errorResponse.message = error.response.data.error;
            } else if (error.response.data?.message) {
                errorResponse.message = error.response.data.message;
            } else if (error.response.data?.details) {
                errorResponse.message = error.response.data.details;
            } else {
                errorResponse.message = `Server error: ${error.response.status}`;
            }
            
            // Set error code based on status
            switch (error.response.status) {
                case 401:
                    errorResponse.code = 'UNAUTHORIZED';
                    break;
                case 403:
                    errorResponse.code = 'FORBIDDEN';
                    break;
                case 404:
                    errorResponse.code = 'NOT_FOUND';
                    break;
                case 409:
                    errorResponse.code = 'CONFLICT';
                    break;
                case 413:
                    errorResponse.code = 'PAYLOAD_TOO_LARGE';
                    break;
                case 422:
                    errorResponse.code = 'VALIDATION_ERROR';
                    break;
                case 429:
                    errorResponse.code = 'RATE_LIMITED';
                    break;
                case 500:
                    errorResponse.code = 'SERVER_ERROR';
                    break;
                default:
                    errorResponse.code = 'UNKNOWN_ERROR';
            }
        } else if (error.request) {
            // Request made but no response received
            errorResponse.message = 'Network error. Please check your connection.';
            errorResponse.code = 'NETWORK_ERROR';
        } else {
            // Something else happened
            errorResponse.message = error.message || 'Request failed';
            errorResponse.code = 'REQUEST_ERROR';
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