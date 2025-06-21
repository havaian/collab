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

// Auth API - All authentication endpoints
export const authAPI = {
  // Basic auth
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { username: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  // User profile
  getProfile: () => api.get('/auth/user'),
  
  updateProfile: (profileData: Partial<User>) =>
    api.put('/auth/user', profileData),
  
  // Password management
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),
  
  // Account management
  deleteAccount: (password: string) =>
    api.delete('/auth/account', { data: { password } }),
  
  // API key management
  getApiKeys: () => api.get('/auth/api-keys'),
  
  updateApiKey: (service: string, apiKey: string) =>
    api.put('/auth/api-key', { service, apiKey }),
  
  deleteApiKey: (service: string) => 
    api.delete(`/auth/api-key/${service}`),
  
  // OAuth URLs - These return the correct URLs for OAuth redirects
  getGithubAuthUrl: () => `${API_BASE_URL}/api/auth/github`,
  getGoogleAuthUrl: () => `${API_BASE_URL}/api/auth/google`,
  
  // Email verification
  resendVerification: () => api.post('/auth/resend-verification'),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  
  // Password reset
  requestPasswordReset: (email: string) => 
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword })
}

// Projects API - All project management endpoints
export const projectsAPI = {
  getProjects: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/projects', { params }),
  
  getProject: (id: string) => api.get(`/projects/${id}`),
  
  createProject: (projectData: {
    name: string;
    description?: string;
    visibility: 'private' | 'public';
    settings?: any;
  }) => api.post('/projects', projectData),
  
  updateProject: (id: string, updates: Partial<Project>) =>
    api.put(`/projects/${id}`, updates),
  
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  
  // Project collaboration
  getProjectMembers: (projectId: string) =>
    api.get(`/projects/${projectId}/members`),
  
  addProjectMember: (projectId: string, memberData: {
    email?: string;
    username?: string;
    role: 'owner' | 'collaborator' | 'viewer';
  }) => api.post(`/projects/${projectId}/members`, memberData),
  
  updateMemberRole: (projectId: string, memberId: string, role: string) =>
    api.put(`/projects/${projectId}/members/${memberId}`, { role }),
  
  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),
  
  // Project invitations
  getProjectInvitations: (projectId: string) =>
    api.get(`/projects/${projectId}/invitations`),
  
  sendInvitation: (projectId: string, invitationData: {
    email: string;
    role: 'collaborator' | 'viewer';
    message?: string;
  }) => api.post(`/projects/${projectId}/invitations`, invitationData),
  
  acceptInvitation: (token: string) =>
    api.post('/projects/invitations/accept', { token }),
  
  declineInvitation: (token: string) =>
    api.post('/projects/invitations/decline', { token }),
  
  // Project settings
  updateProjectSettings: (projectId: string, settings: any) =>
    api.put(`/projects/${projectId}/settings`, settings),
  
  // GitHub integration
  importFromGithub: (repoUrl: string) =>
    api.post('/projects/import/github', { repoUrl }),
  
  syncWithGithub: (projectId: string) =>
    api.post(`/projects/${projectId}/sync/github`)
}

// Files API - All file management endpoints
export const filesAPI = {
  getProjectFiles: (projectId: string, path?: string) =>
    api.get(`/files/${projectId}`, { params: { path } }),
  
  getFile: (projectId: string, fileId: string) =>
    api.get(`/files/${projectId}/${fileId}`),
  
  createFile: (projectId: string, fileData: {
    name: string;
    content: string;
    type: string;
    path?: string;
  }) => api.post(`/files/${projectId}`, fileData),
  
  updateFile: (projectId: string, fileId: string, updates: {
    content?: string;
    name?: string;
  }) => api.put(`/files/${projectId}/${fileId}`, updates),
  
  deleteFile: (projectId: string, fileId: string) =>
    api.delete(`/files/${projectId}/${fileId}`),
  
  // File operations
  moveFile: (projectId: string, fileId: string, newPath: string) =>
    api.put(`/files/${projectId}/${fileId}/move`, { path: newPath }),
  
  copyFile: (projectId: string, fileId: string, newPath: string) =>
    api.post(`/files/${projectId}/${fileId}/copy`, { path: newPath }),
  
  // File history
  getFileHistory: (projectId: string, fileId: string) =>
    api.get(`/files/${projectId}/${fileId}/history`),
  
  revertFile: (projectId: string, fileId: string, versionId: string) =>
    api.post(`/files/${projectId}/${fileId}/revert`, { versionId }),
  
  // File upload
  uploadFile: (projectId: string, formData: FormData) =>
    api.post(`/files/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Bulk operations
  bulkDelete: (projectId: string, fileIds: string[]) =>
    api.delete(`/files/${projectId}/bulk`, { data: { fileIds } }),
  
  bulkMove: (projectId: string, operations: Array<{
    fileId: string;
    newPath: string;
  }>) => api.put(`/files/${projectId}/bulk/move`, { operations })
}

// Chat API - All chat and messaging endpoints
export const chatAPI = {
  getProjectMessages: (projectId: string, params?: {
    page?: number;
    limit?: number;
    before?: string;
    after?: string;
  }) => api.get(`/chat/${projectId}/messages`, { params }),
  
  sendMessage: (projectId: string, messageData: {
    content: string;
    type?: 'user' | 'assistant';
    threadId?: string;
    context?: any;
  }) => api.post(`/chat/${projectId}/messages`, messageData),
  
  getMessage: (projectId: string, messageId: string) =>
    api.get(`/chat/${projectId}/messages/${messageId}`),
  
  updateMessage: (projectId: string, messageId: string, updates: {
    content?: string;
    edited?: boolean;
  }) => api.put(`/chat/${projectId}/messages/${messageId}`, updates),
  
  deleteMessage: (projectId: string, messageId: string) =>
    api.delete(`/chat/${projectId}/messages/${messageId}`),
  
  // Message reactions and interactions
  reactToMessage: (projectId: string, messageId: string, reaction: string) =>
    api.post(`/chat/${projectId}/messages/${messageId}/reactions`, { reaction }),
  
  removeReaction: (projectId: string, messageId: string, reaction: string) =>
    api.delete(`/chat/${projectId}/messages/${messageId}/reactions/${reaction}`),
  
  // Thread management
  getThreads: (projectId: string) =>
    api.get(`/chat/${projectId}/threads`),
  
  createThread: (projectId: string, threadData: {
    title: string;
    description?: string;
    parentMessageId?: string;
  }) => api.post(`/chat/${projectId}/threads`, threadData),
  
  getThread: (projectId: string, threadId: string) =>
    api.get(`/chat/${projectId}/threads/${threadId}`),
  
  updateThread: (projectId: string, threadId: string, updates: {
    title?: string;
    description?: string;
    status?: 'active' | 'archived';
  }) => api.put(`/chat/${projectId}/threads/${threadId}`, updates),
  
  deleteThread: (projectId: string, threadId: string) =>
    api.delete(`/chat/${projectId}/threads/${threadId}`),
  
  // AI Chat interactions
  sendToAI: (projectId: string, data: {
    message: string;
    context?: any;
    model?: string;
    threadId?: string;
  }) => api.post(`/chat/${projectId}/ai`, data),
  
  // Chat settings
  getChatSettings: (projectId: string) =>
    api.get(`/chat/${projectId}/settings`),
  
  updateChatSettings: (projectId: string, settings: any) =>
    api.put(`/chat/${projectId}/settings`, settings)
}

// Knowledge API - All knowledge base endpoints
export const knowledgeAPI = {
  getKnowledgeItems: (projectId: string, params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }) => api.get(`/knowledge/${projectId}`, { params }),
  
  getKnowledgeItem: (projectId: string, itemId: string) =>
    api.get(`/knowledge/${projectId}/${itemId}`),
  
  createKnowledgeItem: (projectId: string, itemData: {
    title: string;
    content: string;
    type: 'document' | 'code' | 'reference' | 'note';
    tags?: string[];
    metadata?: any;
  }) => api.post(`/knowledge/${projectId}`, itemData),
  
  updateKnowledgeItem: (projectId: string, itemId: string, updates: Partial<KnowledgeItem>) =>
    api.put(`/knowledge/${projectId}/${itemId}`, updates),
  
  deleteKnowledgeItem: (projectId: string, itemId: string) =>
    api.delete(`/knowledge/${projectId}/${itemId}`),
  
  // Knowledge search and indexing
  searchKnowledge: (projectId: string, query: string, filters?: {
    type?: string;
    tags?: string[];
    dateRange?: { start: string; end: string };
  }) => api.post(`/knowledge/${projectId}/search`, { query, filters }),
  
  getRelatedItems: (projectId: string, itemId: string) =>
    api.get(`/knowledge/${projectId}/${itemId}/related`),
  
  // Knowledge organization
  getTags: (projectId: string) =>
    api.get(`/knowledge/${projectId}/tags`),
  
  createTag: (projectId: string, tagData: { name: string; color?: string }) =>
    api.post(`/knowledge/${projectId}/tags`, tagData),
  
  updateTag: (projectId: string, tagId: string, updates: { name?: string; color?: string }) =>
    api.put(`/knowledge/${projectId}/tags/${tagId}`, updates),
  
  deleteTag: (projectId: string, tagId: string) =>
    api.delete(`/knowledge/${projectId}/tags/${tagId}`),
  
  // Bulk operations
  bulkUpdateTags: (projectId: string, operations: Array<{
    itemId: string;
    tags: string[];
  }>) => api.put(`/knowledge/${projectId}/bulk/tags`, { operations }),
  
  bulkDelete: (projectId: string, itemIds: string[]) =>
    api.delete(`/knowledge/${projectId}/bulk`, { data: { itemIds } })
}

// Code Execution API - All code execution endpoints
export const codeExecutionAPI = {
  executeCode: (data: {
    language: string;
    code: string;
    input?: string;
    projectId?: string;
  }) => api.post('/code/execute', data),
  
  getExecutionHistory: (projectId?: string) =>
    api.get('/code/history', { params: { projectId } }),
  
  getExecution: (executionId: string) =>
    api.get(`/code/history/${executionId}`),
  
  deleteExecution: (executionId: string) =>
    api.delete(`/code/history/${executionId}`),
  
  // Supported languages and limits
  getSupportedLanguages: () => api.get('/code/languages'),
  getExecutionLimits: () => api.get('/code/limits')
}

// System API - Health checks and system information
export const systemAPI = {
  healthCheck: () => api.get('/health'),
  
  getSystemInfo: () => api.get('/system/info'),
  
  getSystemStats: () => api.get('/system/stats')
}

// Export all APIs
export {
  api as default,
  API_BASE_URL
}