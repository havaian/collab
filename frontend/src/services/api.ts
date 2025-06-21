import axios from 'axios'
import type { User, Project, ProjectFile, ChatMessage, KnowledgeItem } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10141'

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/sessions
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

// Auth API - Fixed paths based on backend routes
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { username: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get('/auth/user'),
  
  updateProfile: (profileData: Partial<User>) =>
    api.put('/auth/profile', profileData),
  
  // Fixed: backend uses /auth/api-key, not /auth/api-keys
  updateApiKey: (service: string, apiKey: string) =>
    api.put('/auth/api-key', { service, apiKey }),
  
  // Additional auth endpoints from backend
  getApiKeys: () => api.get('/auth/api-keys'),
  
  deleteApiKey: (service: string) => api.delete(`/auth/api-key/${service}`),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),
  
  deleteAccount: (password: string) =>
    api.delete('/auth/account', { data: { password } }),
  
  // OAuth endpoints (these redirect to backend)
  githubAuth: () => api.get('/auth/github'),
  googleAuth: () => api.get('/auth/google')
}

// Projects API - Fixed paths and structure
export const projectsAPI = {
  getProjects: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/projects', { params }),
  
  getProject: (id: string) => api.get(`/projects/${id}`),
  
  createProject: (projectData: Partial<Project>) =>
    api.post('/projects', projectData),
  
  updateProject: (id: string, projectData: Partial<Project>) =>
    api.put(`/projects/${id}`, projectData),
  
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  
  // Collaborator management
  addCollaborator: (projectId: string, email: string, role: string) =>
    api.post(`/projects/${projectId}/collaborators`, { email, role }),
  
  removeCollaborator: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/collaborators/${userId}`),
  
  updateCollaboratorRole: (projectId: string, userId: string, role: string) =>
    api.put(`/projects/${projectId}/collaborators/${userId}`, { role }),
  
  // Additional project endpoints
  getPublicProjects: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/projects/public', { params }),
  
  forkProject: (projectId: string) => api.post(`/projects/${projectId}/fork`),
  
  toggleProjectVisibility: (projectId: string) =>
    api.put(`/projects/${projectId}/visibility`),
}

// Files API - Fixed structure based on backend routes
export const filesAPI = {
  // Fixed: backend uses /projects/:projectId/files not /files/:projectId
  getFiles: (projectId: string) => api.get(`/projects/${projectId}/files`),
  
  // Fixed: backend uses individual file IDs, not projectId/fileId structure
  getFile: (fileId: string) => api.get(`/files/${fileId}`),
  
  createFile: (projectId: string, fileData: Partial<ProjectFile>) =>
    api.post(`/projects/${projectId}/files`, fileData),
  
  updateFile: (fileId: string, fileData: Partial<ProjectFile>) =>
    api.put(`/files/${fileId}`, fileData),
  
  deleteFile: (fileId: string) => api.delete(`/files/${fileId}`),
  
  getFileHistory: (fileId: string) => api.get(`/files/${fileId}/history`),
  
  // Additional file operations from backend
  uploadFile: (projectId: string, formData: FormData) =>
    api.post(`/projects/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  downloadFile: (fileId: string) => api.get(`/files/${fileId}/download`, {
    responseType: 'blob'
  }),
}

// Chat API - Fixed structure
export const chatAPI = {
  // Fixed: backend uses /projects/:projectId/chat not /chat/:projectId
  getMessages: (projectId: string) => api.get(`/projects/${projectId}/chat`),
  
  sendMessage: (projectId: string, message: string, context?: string[]) =>
    api.post(`/projects/${projectId}/chat`, { message, context }),
  
  // Fixed: backend uses different structure for clearing chat
  clearChat: (projectId: string) => api.delete(`/projects/${projectId}/chat`),
  
  // Additional chat endpoints
  deleteMessage: (messageId: string) => api.delete(`/chat/messages/${messageId}`),
  
  updateMessage: (messageId: string, content: string) =>
    api.put(`/chat/messages/${messageId}`, { content }),
}

// Knowledge API - Fixed structure
export const knowledgeAPI = {
  // Fixed: backend uses /projects/:projectId/knowledge
  getKnowledge: (projectId: string) => api.get(`/projects/${projectId}/knowledge`),
  
  addKnowledge: (projectId: string, knowledgeData: Partial<KnowledgeItem>) =>
    api.post(`/projects/${projectId}/knowledge`, knowledgeData),
  
  // Fixed: uses individual knowledge IDs
  updateKnowledge: (knowledgeId: string, knowledgeData: Partial<KnowledgeItem>) =>
    api.put(`/knowledge/${knowledgeId}`, knowledgeData),
  
  deleteKnowledge: (knowledgeId: string) => api.delete(`/knowledge/${knowledgeId}`),
  
  searchKnowledge: (projectId: string, query: string) =>
    api.get(`/projects/${projectId}/knowledge/search`, { params: { q: query } }),
}

// Code Execution API - Structure looks correct based on backend
export const codeExecutionAPI = {
  executeCode: (data: {
    code: string;
    languageId: number;
    stdin?: string;
    fileId?: string;
    projectId: string;
  }) => api.post('/code/execute', data),
  
  getLanguages: () => api.get('/code/languages'),
  
  getExecutionHistory: (projectId: string) =>
    api.get(`/code/history/${projectId}`),
  
  // Additional endpoints that might exist
  getExecutionStatus: (token: string) => api.get(`/code/execution/${token}`),
}

// Health check endpoint
export const healthAPI = {
  check: () => api.get('/health'),
}

export default api