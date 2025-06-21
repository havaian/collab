import axios from 'axios'
import type { User, Project, ProjectFile, ChatMessage, KnowledgeItem } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10141'

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { username: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (profileData: Partial<User>) =>
    api.put('/auth/profile', profileData),
  
  updateApiKey: (service: string, apiKey: string) =>
    api.put('/auth/api-keys', { service, apiKey }),
}

// Projects API
export const projectsAPI = {
  getProjects: () => api.get('/projects'),
  
  getProject: (id: string) => api.get(`/projects/${id}`),
  
  createProject: (projectData: Partial<Project>) =>
    api.post('/projects', projectData),
  
  updateProject: (id: string, projectData: Partial<Project>) =>
    api.put(`/projects/${id}`, projectData),
  
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  
  addCollaborator: (projectId: string, email: string, role: string) =>
    api.post(`/projects/${projectId}/collaborators`, { email, role }),
  
  removeCollaborator: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/collaborators/${userId}`),
  
  updateCollaboratorRole: (projectId: string, userId: string, role: string) =>
    api.put(`/projects/${projectId}/collaborators/${userId}`, { role }),
}

// Files API
export const filesAPI = {
  getFiles: (projectId: string) => api.get(`/files/${projectId}`),
  
  getFile: (projectId: string, fileId: string) =>
    api.get(`/files/${projectId}/${fileId}`),
  
  createFile: (projectId: string, fileData: Partial<ProjectFile>) =>
    api.post(`/files/${projectId}`, fileData),
  
  updateFile: (projectId: string, fileId: string, fileData: Partial<ProjectFile>) =>
    api.put(`/files/${projectId}/${fileId}`, fileData),
  
  deleteFile: (projectId: string, fileId: string) =>
    api.delete(`/files/${projectId}/${fileId}`),
  
  getFileHistory: (projectId: string, fileId: string) =>
    api.get(`/files/${projectId}/${fileId}/history`),
}

// Chat API
export const chatAPI = {
  getMessages: (projectId: string) => api.get(`/chat/${projectId}`),
  
  sendMessage: (projectId: string, message: string, context?: string[]) =>
    api.post(`/chat/${projectId}`, { message, context }),
  
  clearChat: (projectId: string) => api.delete(`/chat/${projectId}`),
}

// Knowledge API
export const knowledgeAPI = {
  getKnowledge: (projectId: string) => api.get(`/knowledge/${projectId}`),
  
  addKnowledge: (projectId: string, knowledgeData: Partial<KnowledgeItem>) =>
    api.post(`/knowledge/${projectId}`, knowledgeData),
  
  updateKnowledge: (projectId: string, knowledgeId: string, knowledgeData: Partial<KnowledgeItem>) =>
    api.put(`/knowledge/${projectId}/${knowledgeId}`, knowledgeData),
  
  deleteKnowledge: (projectId: string, knowledgeId: string) =>
    api.delete(`/knowledge/${projectId}/${knowledgeId}`),
  
  searchKnowledge: (projectId: string, query: string) =>
    api.get(`/knowledge/${projectId}/search`, { params: { q: query } }),
}

// Code Execution API
export const codeExecutionAPI = {
  executeCode: (projectId: string, data: {
    code: string;
    languageId: number;
    stdin?: string;
    fileId?: string;
  }) => api.post(`/code/execute`, { ...data, projectId }),
  
  getLanguages: () => api.get('/code/languages'),
  
  getExecutionHistory: (projectId: string) =>
    api.get(`/code/history/${projectId}`),
}

export default api