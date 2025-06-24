// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API Service Class
class ApiService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/api`;
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

            // Handle non-JSON responses
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
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
    async getProjects() {
        try {
            return await this.apiRequest('/projects', {
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

    // ==================== FILE ENDPOINTS ====================

    // Get project files
    async getProjectFiles(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}/files`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch project files');
        }
    }

    // Get single file content
    async getFileContent(projectId, filePath) {
        try {
            return await this.apiRequest(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch file content');
        }
    }

    // Create or update file
    async saveFile(projectId, filePath, content) {
        try {
            return await this.apiRequest(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to save file');
        }
    }

    // Delete file
    async deleteFile(projectId, filePath) {
        try {
            return await this.apiRequest(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to delete file');
        }
    }

    // ==================== CHAT ENDPOINTS ====================

    // Get chat history for project
    async getChatHistory(projectId, limit = 50, offset = 0) {
        try {
            return await this.apiRequest(`/projects/${projectId}/chat?limit=${limit}&offset=${offset}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch chat history');
        }
    }

    // Send chat message
    async sendChatMessage(projectId, message, context = {}) {
        try {
            return await this.apiRequest(`/projects/${projectId}/chat`, {
                method: 'POST',
                body: JSON.stringify({ message, context })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to send chat message');
        }
    }

    // ==================== CODE EXECUTION ENDPOINTS ====================

    // Execute code
    async executeCode(projectId, code, language, input = '') {
        try {
            return await this.apiRequest(`/projects/${projectId}/execute`, {
                method: 'POST',
                body: JSON.stringify({ code, language, input })
            });
        } catch (error) {
            throw new Error(error.message || 'Code execution failed');
        }
    }

    // Get execution history
    async getExecutionHistory(projectId, limit = 20) {
        try {
            return await this.apiRequest(`/projects/${projectId}/executions?limit=${limit}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch execution history');
        }
    }

    // ==================== COLLABORATION ENDPOINTS ====================

    // Get project collaborators
    async getCollaborators(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}/collaborators`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch collaborators');
        }
    }

    // Add collaborator to project
    async addCollaborator(projectId, email, role = 'viewer') {
        try {
            return await this.apiRequest(`/projects/${projectId}/collaborators`, {
                method: 'POST',
                body: JSON.stringify({ email, role })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to add collaborator');
        }
    }

    // Update collaborator role
    async updateCollaboratorRole(projectId, userId, role) {
        try {
            return await this.apiRequest(`/projects/${projectId}/collaborators/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ role })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to update collaborator role');
        }
    }

    // Remove collaborator
    async removeCollaborator(projectId, userId) {
        try {
            return await this.apiRequest(`/projects/${projectId}/collaborators/${userId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to remove collaborator');
        }
    }

    // ==================== GITHUB INTEGRATION ENDPOINTS ====================

    // Get user's GitHub repositories
    async getGitHubRepos() {
        try {
            return await this.apiRequest('/github/repos', {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch GitHub repositories');
        }
    }

    // Import project from GitHub
    async importFromGitHub(repoUrl, projectName) {
        try {
            return await this.apiRequest('/github/import', {
                method: 'POST',
                body: JSON.stringify({ repoUrl, projectName })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to import from GitHub');
        }
    }

    // Export project to GitHub
    async exportToGitHub(projectId, repoName, isPrivate = true) {
        try {
            return await this.apiRequest(`/projects/${projectId}/export/github`, {
                method: 'POST',
                body: JSON.stringify({ repoName, isPrivate })
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to export to GitHub');
        }
    }

    // ==================== EXPORT ENDPOINTS ====================

    // Export project as ZIP
    async exportProjectAsZip(projectId) {
        try {
            const response = await fetch(`${this.baseURL}/projects/${projectId}/export/zip`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            return response.blob();
        } catch (error) {
            throw new Error(error.message || 'Failed to export project as ZIP');
        }
    }

    // Export project as standalone HTML
    async exportProjectAsHTML(projectId) {
        try {
            return await this.apiRequest(`/projects/${projectId}/export/html`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to export project as HTML');
        }
    }

    // ==================== SEARCH ENDPOINTS ====================

    // Search across all projects
    async searchProjects(query, filters = {}) {
        try {
            const params = new URLSearchParams({
                q: query,
                ...filters
            });

            return await this.apiRequest(`/search/projects?${params}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Search failed');
        }
    }

    // Search within project files
    async searchInProject(projectId, query) {
        try {
            const params = new URLSearchParams({ q: query });

            return await this.apiRequest(`/projects/${projectId}/search?${params}`, {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Project search failed');
        }
    }

    // ==================== UTILITY METHODS ====================

    // Upload file
    async uploadFile(file, projectId, path = '') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', path);

            const response = await fetch(`${this.baseURL}/projects/${projectId}/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.getToken()}`
                    // Don't set Content-Type for FormData, let browser set it
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Upload failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'File upload failed');
        }
    }

    // Get system status
    async getSystemStatus() {
        try {
            return await this.apiRequest('/status', {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(error.message || 'Failed to get system status');
        }
    }
}

// Create and export singleton instance
const apiService = new ApiService();

export default apiService;