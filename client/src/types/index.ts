export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  githubId?: string
  googleId?: string
  apiKeys?: {
    openai?: string
  }
  createdAt: Date
  lastActive: Date
}

export interface Project {
  id: string
  name: string
  description: string
  owner: string
  collaborators: Collaborator[]
  githubRepo?: {
    url: string
    lastSync: Date
  }
  settings: ProjectSettings
  createdAt: Date
  updatedAt: Date
}

export interface Collaborator {
  user: string
  role: 'owner' | 'collaborator' | 'viewer'
  joinedAt: Date
}

export interface ProjectSettings {
  aiModel: string
  defaultTheme: string
  permissions: Record<string, any>
}

export interface ProjectFile {
  id: string
  projectId: string
  name: string
  path: string
  type: 'code' | 'text' | 'markdown'
  content: string
  language?: string
  version: number
  lastModified: Date
  lastModifiedBy: string
  history: FileHistory[]
}

export interface FileHistory {
  version: number
  content: string
  modifiedBy: string
  modifiedAt: Date
  changes: string
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  author: string
  content: string
  timestamp: Date
  context?: string[]
}

export interface Chat {
  id: string
  projectId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeItem {
  id: string
  projectId: string
  title: string
  content: string
  type: 'document' | 'code-snippet' | 'note'
  tags: string[]
  embedding?: number[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}