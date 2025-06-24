// API Base URL
const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

// API Service Class
class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
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

    // Make authenticated API request with error handling
    async apiRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Handle non-JSON responses
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    window.location.reload(); // Force re-authentication
                }
                throw new Error(data.message || data || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // ==================== PROJECT ENDPOINTS ====================

    // Get all projects for current user
    async getProjects(options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.page) queryParams.append('page', options.page);
            if (options.limit) queryParams.append('limit', options.limit);
            if (options.search) queryParams.append('search', options.search);
            if (options.sortBy) queryParams.append('sortBy', options.sortBy);

            const query = queryParams.toString();
            const endpoint = `/projects${query ? `?${query}` : ''}`;

            return await this.apiRequest(endpoint, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch projects');
        }
    }

    // Get single project by ID
    async getProject(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch project');
        }
    }

    // Create new project
    async createProject(projectData) {
        try {
            return await this.apiRequest('/projects', {
                method: 'POST',
                body: JSON.stringify(projectData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to create project');
        }
    }

    // Update project
    async updateProject(projectId, projectData) {
        try {
            return await this.apiRequest(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(projectData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to update project');
        }
    }

    // Delete project
    async deleteProject(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to delete project');
        }
    }

    // Join project with invite code
    async joinProject(projectId, inviteCode) {
        try {
            return await this.apiRequest(`/projects/${projectId}/join`, {
                method: 'POST',
                body: JSON.stringify({ inviteCode })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to join project');
        }
    }

    // Leave project
    async leaveProject(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}/leave`, {
                method: 'POST'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to leave project');
        }
    }

    // Get public projects
    async getPublicProjects(options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.page) queryParams.append('page', options.page);
            if (options.limit) queryParams.append('limit', options.limit);
            if (options.search) queryParams.append('search', options.search);

            const query = queryParams.toString();
            const endpoint = `/projects/public${query ? `?${query}` : ''}`;

            return await this.apiRequest(endpoint, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch public projects');
        }
    }

    // ==================== FILE ENDPOINTS ====================

    // Get project files
    async getProjectFiles(projectId) {
        try {
            return await this.apiRequest(`/files/project/${projectId}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch project files');
        }
    }

    // Get single file
    async getFile(fileId) {
        try {
            return await this.apiRequest(`/files/${fileId}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch file');
        }
    }

    // Create new file
    async createFile(fileData) {
        try {
            return await this.apiRequest('/files', {
                method: 'POST',
                body: JSON.stringify(fileData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to create file');
        }
    }

    // Update file content
    async updateFile(fileId, fileData) {
        try {
            return await this.apiRequest(`/files/${fileId}`, {
                method: 'PUT',
                body: JSON.stringify(fileData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to update file');
        }
    }

    // Delete file
    async deleteFile(fileId) {
        try {
            return await this.apiRequest(`/files/${fileId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to delete file');
        }
    }

    // Rename file
    async renameFile(fileId, newName) {
        try {
            return await this.apiRequest(`/files/${fileId}/rename`, {
                method: 'PUT',
                body: JSON.stringify({ name: newName })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to rename file');
        }
    }

    // ==================== CODE EXECUTION ENDPOINTS ====================

    // Execute code
    async executeCode(executeData) {
        try {
            return await this.apiRequest('/execute', {
                method: 'POST',
                body: JSON.stringify(executeData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to execute code');
        }
    }

    // Get execution result
    async getExecutionResult(executionId) {
        try {
            return await this.apiRequest(`/execute/${executionId}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to get execution result');
        }
    }

    // ==================== CHAT ENDPOINTS ====================

    // Get project chat history
    async getChatHistory(projectId, options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.page) queryParams.append('page', options.page);
            if (options.limit) queryParams.append('limit', options.limit);

            const query = queryParams.toString();
            const endpoint = `/chat/${projectId}${query ? `?${query}` : ''}`;

            return await this.apiRequest(endpoint, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch chat history');
        }
    }

    // Send chat message
    async sendChatMessage(projectId, messageData) {
        try {
            return await this.apiRequest(`/chat/${projectId}`, {
                method: 'POST',
                body: JSON.stringify(messageData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to send chat message');
        }
    }

    // ==================== EXPORT ENDPOINTS ====================

    // Export project as ZIP
    async exportProjectAsZip(projectId) {
        try {
            const response = await fetch(`${this.baseURL}/export/${projectId}/zip`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to export project');
            }

            return response.blob(); // Return blob for download
        } catch (error) {
            throw new Error(error.message || 'Failed to export project');
        }
    }

    // Export to GitHub Gist
    async exportToGist(projectId, gistData) {
        try {
            return await this.apiRequest(`/export/${projectId}/gist`, {
                method: 'POST',
                body: JSON.stringify(gistData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to export to GitHub Gist');
        }
    }

    // ==================== GITHUB ENDPOINTS ====================

    // Get GitHub repositories
    async getGitHubRepositories() {
        try {
            return await this.apiRequest('/github/repositories', {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch GitHub repositories');
        }
    }

    // Connect project to GitHub repository
    async connectToRepository(projectId, repoData) {
        try {
            return await this.apiRequest(`/github/${projectId}/connect`, {
                method: 'POST',
                body: JSON.stringify(repoData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to connect to repository');
        }
    }

    // Pull from GitHub repository
    async pullFromRepository(projectId) {
        try {
            return await this.apiRequest(`/github/${projectId}/pull`, {
                method: 'POST'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to pull from repository');
        }
    }

    // Push to GitHub repository
    async pushToRepository(projectId, pushData) {
        try {
            return await this.apiRequest(`/github/${projectId}/push`, {
                method: 'POST',
                body: JSON.stringify(pushData)
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to push to repository');
        }
    }

    // Disconnect from GitHub repository
    async disconnectRepository(projectId) {
        try {
            return await this.apiRequest(`/github/${projectId}/disconnect`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to disconnect repository');
        }
    }

    // ==================== UTILITY METHODS ====================

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            throw new Error('Backend service unavailable');
        }
    }

    // Upload file
    async uploadFile(projectId, formData) {
        try {
            const token = this.getToken();
            const response = await fetch(`${this.baseURL}/files/upload/${projectId}`, {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` })
                    // Don't set Content-Type for FormData
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            return data;
        } catch (error) {
            throw new Error(error.message || 'Failed to upload file');
        }
    }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;