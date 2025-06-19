const Project = require('../models/Project');
const File = require('../models/File');
const Chat = require('../models/Chat');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    this.projectRooms = new Map();   // projectId -> Set of userIds
    this.fileEditors = new Map();    // fileId -> Set of userIds
  }

  // Broadcast to all users in a project
  broadcastToProject(projectId, event, data, excludeUserId = null) {
    const room = `project:${projectId}`;
    
    if (excludeUserId) {
      // Get all sockets for the excluded user
      const userSockets = this.connectedUsers.get(excludeUserId) || new Set();
      
      // Broadcast to room except excluded user's sockets
      this.io.to(room).except([...userSockets]).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  // Broadcast to all editors of a file
  broadcastToFileEditors(fileId, event, data, excludeUserId = null) {
    const room = `file:${fileId}`;
    
    if (excludeUserId) {
      const userSockets = this.connectedUsers.get(excludeUserId) || new Set();
      this.io.to(room).except([...userSockets]).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  // Get online users for a project
  getProjectUsers(projectId) {
    return Array.from(this.projectRooms.get(projectId) || []);
  }

  // Get active editors for a file
  getFileEditors(fileId) {
    return Array.from(this.fileEditors.get(fileId) || []);
  }

  // Add user to project room
  addUserToProject(userId, projectId) {
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId).add(userId);
  }

  // Remove user from project room
  removeUserFromProject(userId, projectId) {
    if (this.projectRooms.has(projectId)) {
      this.projectRooms.get(projectId).delete(userId);
      
      // Clean up empty project rooms
      if (this.projectRooms.get(projectId).size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
  }

  // Add user to file editing session
  addUserToFile(userId, fileId) {
    if (!this.fileEditors.has(fileId)) {
      this.fileEditors.set(fileId, new Set());
    }
    this.fileEditors.get(fileId).add(userId);
  }

  // Remove user from file editing session
  removeUserFromFile(userId, fileId) {
    if (this.fileEditors.has(fileId)) {
      this.fileEditors.get(fileId).delete(userId);
      
      // Clean up empty file rooms
      if (this.fileEditors.get(fileId).size === 0) {
        this.fileEditors.delete(fileId);
      }
    }
  }

  // Track user connection
  addUserConnection(userId, socketId) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socketId);
  }

  // Remove user connection
  removeUserConnection(userId, socketId) {
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socketId);
      
      // If no more connections, remove user entirely
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
        return true; // User fully disconnected
      }
    }
    return false; // User still has other connections
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  // Get all online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Emit to specific user (all their connections)
  emitToUser(userId, event, data) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Handle file change notifications
  async notifyFileChange(fileId, userId, changes) {
    try {
      const file = await File.findById(fileId).populate('projectId', 'name');
      
      if (!file) return;

      const changeData = {
        fileId,
        fileName: file.name,
        filePath: file.path,
        projectId: file.projectId._id,
        projectName: file.projectId.name,
        userId,
        changes,
        timestamp: new Date()
      };

      // Notify file editors
      this.broadcastToFileEditors(fileId, 'file:changed', changeData, userId);
      
      // Notify project members
      this.broadcastToProject(file.projectId._id, 'project:file_changed', changeData, userId);

    } catch (error) {
      console.error('Error notifying file change:', error);
    }
  }

  // Handle chat message notifications
  async notifyNewMessage(projectId, message, authorId) {
    try {
      const messageData = {
        projectId,
        message: {
          id: message.id,
          type: message.type,
          content: message.content,
          author: message.author,
          threadId: message.threadId,
          timestamp: message.timestamp,
          context: message.context
        },
        timestamp: new Date()
      };

      // Notify all project members except the author
      this.broadcastToProject(projectId, 'chat:new_message', messageData, authorId);

    } catch (error) {
      console.error('Error notifying new message:', error);
    }
  }

  // Handle code execution notifications
  async notifyCodeExecution(projectId, executionResult, userId) {
    try {
      const executionData = {
        projectId,
        fileId: executionResult.fileId,
        userId,
        result: {
          id: executionResult._id,
          status: executionResult.status,
          language: executionResult.language,
          time: executionResult.time,
          memory: executionResult.memory,
          hasOutput: executionResult.hasOutput,
          isSuccess: executionResult.isSuccess
        },
        timestamp: new Date()
      };

      // Notify project members
      this.broadcastToProject(projectId, 'code:execution_completed', executionData, userId);

    } catch (error) {
      console.error('Error notifying code execution:', error);
    }
  }

  // Handle project updates
  async notifyProjectUpdate(projectId, updateType, data, userId) {
    try {
      const updateData = {
        projectId,
        type: updateType,
        data,
        userId,
        timestamp: new Date()
      };

      // Notify project members
      this.broadcastToProject(projectId, 'project:updated', updateData, userId);

    } catch (error) {
      console.error('Error notifying project update:', error);
    }
  }

  // Handle user presence updates
  async notifyUserPresence(projectId, userId, status, metadata = {}) {
    try {
      const presenceData = {
        projectId,
        userId,
        status, // 'online', 'offline', 'typing', 'editing'
        metadata,
        timestamp: new Date()
      };

      // Notify project members
      this.broadcastToProject(projectId, 'user:presence', presenceData, userId);

    } catch (error) {
      console.error('Error notifying user presence:', error);
    }
  }

  // Handle knowledge base updates
  async notifyKnowledgeUpdate(projectId, knowledgeId, action, userId) {
    try {
      const updateData = {
        projectId,
        knowledgeId,
        action, // 'created', 'updated', 'deleted'
        userId,
        timestamp: new Date()
      };

      // Notify project members
      this.broadcastToProject(projectId, 'knowledge:updated', updateData, userId);

    } catch (error) {
      console.error('Error notifying knowledge update:', error);
    }
  }

  // Handle file locking/unlocking
  async notifyFileLock(fileId, userId, isLocked) {
    try {
      const file = await File.findById(fileId).populate('projectId', '_id');
      
      if (!file) return;

      const lockData = {
        fileId,
        userId,
        isLocked,
        timestamp: new Date()
      };

      // Notify file editors
      this.broadcastToFileEditors(fileId, 'file:lock_changed', lockData, userId);
      
      // Notify project members
      this.broadcastToProject(file.projectId._id, 'project:file_locked', lockData, userId);

    } catch (error) {
      console.error('Error notifying file lock:', error);
    }
  }

  // Handle collaborative editing cursor updates
  async notifyCursorUpdate(fileId, userId, cursor, selection) {
    try {
      const cursorData = {
        fileId,
        userId,
        cursor,
        selection,
        timestamp: new Date()
      };

      // Notify other file editors
      this.broadcastToFileEditors(fileId, 'file:cursor_update', cursorData, userId);

    } catch (error) {
      console.error('Error notifying cursor update:', error);
    }
  }

  // Handle real-time collaboration conflicts
  async handleEditConflict(fileId, editorId, conflictData) {
    try {
      const conflictNotification = {
        fileId,
        editorId,
        conflict: conflictData,
        timestamp: new Date()
      };

      // Notify file editors about conflict
      this.broadcastToFileEditors(fileId, 'file:edit_conflict', conflictNotification);

    } catch (error) {
      console.error('Error handling edit conflict:', error);
    }
  }

  // Send system notification to user
  async sendSystemNotification(userId, notification) {
    try {
      const notificationData = {
        id: Date.now().toString(),
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        timestamp: new Date()
      };

      this.emitToUser(userId, 'system:notification', notificationData);

    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }

  // Broadcast system announcement to all users
  async broadcastAnnouncement(announcement) {
    try {
      const announcementData = {
        id: Date.now().toString(),
        type: announcement.type || 'announcement',
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority || 'normal',
        timestamp: new Date()
      };

      this.io.emit('system:announcement', announcementData);

    } catch (error) {
      console.error('Error broadcasting announcement:', error);
    }
  }

  // Handle user typing indicators
  async handleTypingIndicator(projectId, threadId, userId, isTyping) {
    try {
      const typingData = {
        projectId,
        threadId,
        userId,
        isTyping,
        timestamp: new Date()
      };

      // Notify project members
      this.broadcastToProject(projectId, 'chat:typing', typingData, userId);

    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  }

  // Get room statistics
  getRoomStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: Array.from(this.connectedUsers.values())
        .reduce((total, sockets) => total + sockets.size, 0),
      activeProjects: this.projectRooms.size,
      activeFiles: this.fileEditors.size,
      rooms: {
        projects: Array.from(this.projectRooms.entries()).map(([id, users]) => ({
          projectId: id,
          userCount: users.size
        })),
        files: Array.from(this.fileEditors.entries()).map(([id, users]) => ({
          fileId: id,
          editorCount: users.size
        }))
      }
    };
  }

  // Cleanup disconnected users and empty rooms
  cleanup() {
    // Remove empty project rooms
    for (const [projectId, users] of this.projectRooms.entries()) {
      if (users.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }

    // Remove empty file editor rooms
    for (const [fileId, editors] of this.fileEditors.entries()) {
      if (editors.size === 0) {
        this.fileEditors.delete(fileId);
      }
    }

    // Remove users with no active connections
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  // Force disconnect user from all rooms
  async forceDisconnectUser(userId, reason = 'Administrative action') {
    try {
      const userSockets = this.connectedUsers.get(userId);
      
      if (userSockets) {
        // Send disconnect notification to user
        this.emitToUser(userId, 'system:force_disconnect', {
          reason,
          timestamp: new Date()
        });

        // Disconnect all user's sockets
        userSockets.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
        });

        // Clean up user from all rooms
        this.connectedUsers.delete(userId);
        
        // Remove from project rooms
        for (const [projectId, users] of this.projectRooms.entries()) {
          if (users.has(userId)) {
            users.delete(userId);
            this.broadcastToProject(projectId, 'user:force_disconnected', {
              userId,
              reason,
              timestamp: new Date()
            });
          }
        }

        // Remove from file editor rooms
        for (const [fileId, editors] of this.fileEditors.entries()) {
          if (editors.has(userId)) {
            editors.delete(userId);
            this.broadcastToFileEditors(fileId, 'file:editor_disconnected', {
              userId,
              fileId,
              timestamp: new Date()
            });
          }
        }
      }

    } catch (error) {
      console.error('Error force disconnecting user:', error);
    }
  }
}

module.exports = SocketService;