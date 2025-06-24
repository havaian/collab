// src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: true
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('gpt-collab-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('gpt-collab-token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Projects
  async getProjects(params = {}) {
    const response = await this.api.get('/api/projects', { params });
    return response.data;
  }

  async createProject(projectData) {
    const response = await this.api.post('/api/projects', projectData);
    return response.data;
  }

  async getProject(projectId) {
    const response = await this.api.get(`/api/projects/${projectId}`);
    return response.data;
  }

  async updateProject(projectId, updates) {
    const response = await this.api.put(`/api/projects/${projectId}`, updates);
    return response.data;
  }

  async deleteProject(projectId) {
    const response = await this.api.delete(`/api/projects/${projectId}`);
    return response.data;
  }

  async joinProject(projectId, inviteCode) {
    const response = await this.api.post(`/api/projects/${projectId}/join`, { inviteCode });
    return response.data;
  }

  // Files
  async getProjectFiles(projectId) {
    const response = await this.api.get(`/api/files/project/${projectId}`);
    return response.data;
  }

  async createFile(projectId, fileData) {
    const response = await this.api.post(`/api/files/project/${projectId}`, fileData);
    return response.data;
  }

  async getFile(fileId) {
    const response = await this.api.get(`/api/files/${fileId}`);
    return response.data;
  }

  async updateFile(fileId, updates) {
    const response = await this.api.put(`/api/files/${fileId}`, updates);
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.api.delete(`/api/files/${fileId}`);
    return response.data;
  }

  // Code execution
  async executeCode(codeData) {
    const response = await this.api.post('/api/execute', codeData);
    return response.data;
  }

  async getExecutionHistory(params = {}) {
    const response = await this.api.get('/api/execute/history', { params });
    return response.data;
  }

  // Chat
  async getChatHistory(projectId, params = {}) {
    const response = await this.api.get(`/api/chat/${projectId}/history`, { params });
    return response.data;
  }

  async sendMessage(projectId, messageData) {
    const response = await this.api.post(`/api/chat/${projectId}/messages`, messageData);
    return response.data;
  }
}

export default new ApiService();