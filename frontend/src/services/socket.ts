// client/src/services/socket.ts
import { io, Socket } from 'socket.io-client'
import type { ChatMessage, ProjectFile } from '@/types'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private currentProjectId: string | null = null

  connect(token: string) {
    if (this.socket?.connected) return

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:10141'
    
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id)
      this.reconnectAttempts = 0
      
      // Rejoin project room if we were in one
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🔌 Max reconnection attempts reached')
        this.disconnect()
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Socket reconnected after ${attemptNumber} attempts`)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Socket reconnection error:', error)
    })

    this.socket.on('auth_error', (error) => {
      console.error('🔌 Socket authentication error:', error)
      this.disconnect()
      // Redirect to login page
      window.location.href = '/login'
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.currentProjectId = null
    }
  }

  // Project management
  joinProject(projectId: string) {
    if (!this.socket?.connected) return

    this.currentProjectId = projectId
    this.socket.emit('project:join', projectId)
  }

  leaveProject(projectId: string) {
    if (!this.socket?.connected) return

    this.socket.emit('project:leave', projectId)
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null
    }
  }

  // File collaboration
  onFileUpdate(callback: (data: { fileId: string; content: string; userId: string }) => void) {
    this.socket?.on('file:updated', callback)
  }

  onFileCreate(callback: (file: ProjectFile) => void) {
    this.socket?.on('file:created', callback)
  }

  onFileDelete(callback: (fileId: string) => void) {
    this.socket?.on('file:deleted', callback)
  }

  emitFileUpdate(fileId: string, content: string, projectId: string) {
    this.socket?.emit('file:update', { fileId, content, projectId })
  }

  // Chat functionality
  onChatMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('chat:message', callback)
  }

  onChatTyping(callback: (data: { userId: string; username: string; isTyping: boolean }) => void) {
    this.socket?.on('chat:typing', callback)
  }

  emitChatTyping(projectId: string, isTyping: boolean) {
    this.socket?.emit('chat:typing', { projectId, isTyping })
  }

  // Code execution
  onCodeExecuted(callback: (data: { result: any; user: any; fileId?: string }) => void) {
    this.socket?.on('code:executed', callback)
  }

  // Collaborator presence
  onUserJoined(callback: (user: { id: string; username: string; avatar?: string }) => void) {
    this.socket?.on('user:joined', callback)
  }

  onUserLeft(callback: (userId: string) => void) {
    this.socket?.on('user:left', callback)
  }

  onUserTyping(callback: (data: { userId: string; username: string; fileId?: string; isTyping: boolean }) => void) {
    this.socket?.on('user:typing', callback)
  }

  emitUserTyping(projectId: string, fileId: string | undefined, isTyping: boolean) {
    this.socket?.emit('user:typing', { projectId, fileId, isTyping })
  }

  // Cursor position tracking
  onCursorMove(callback: (data: { userId: string; username: string; fileId: string; position: { line: number; column: number } }) => void) {
    this.socket?.on('cursor:move', callback)
  }

  emitCursorMove(projectId: string, fileId: string, position: { line: number; column: number }) {
    this.socket?.emit('cursor:move', { projectId, fileId, position })
  }

  // System notifications
  onNotification(callback: (notification: { type: string; message: string; data?: any }) => void) {
    this.socket?.on('notification', callback)
  }

  // Project updates
  onProjectUpdate(callback: (project: any) => void) {
    this.socket?.on('project:updated', callback)
  }

  onCollaboratorJoined(callback: (collaborator: any) => void) {
    this.socket?.on('collaborator:joined', callback)
  }

  onCollaboratorLeft(callback: (collaboratorId: string) => void) {
    this.socket?.on('collaborator:left', callback)
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  // Clean up event listeners
  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback)
    } else {
      this.socket?.off(event)
    }
  }
}

export default new SocketService()