// src/socket/handlers.js
const EVENTS = require('./events');
const RoomManager = require('./rooms');
const FileService = require('../file/service');
const ProjectService = require('../project/service');
const ChatService = require('../chat/service');
const ExecuteService = require('../execute/service');

class SocketHandlers {
  constructor(io) {
    this.io = io;
    this.roomManager = new RoomManager(io);
    
    // Store active file editors: fileId -> { users: Map(userId -> cursor) }
    this.fileEditors = new Map();
    
    // Store typing indicators: roomId -> Set(userId)
    this.typingUsers = new Map();
  }
  
  handleConnection(socket) {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.username})`);
    
    // Authentication events
    this.setupAuthEvents(socket);
    
    // Project events
    this.setupProjectEvents(socket);
    
    // File collaboration events
    this.setupFileEvents(socket);
    
    // Chat events
    this.setupChatEvents(socket);
    
    // Code execution events
    this.setupExecutionEvents(socket);
    
    // Disconnect handler
    socket.on(EVENTS.DISCONNECT, () => {
      this.handleDisconnect(socket);
    });
  }
  
  setupAuthEvents(socket) {
    socket.on(EVENTS.AUTHENTICATE, async (data) => {
      try {
        // Additional authentication steps if needed
        socket.emit(EVENTS.AUTHENTICATED, { user: socket.user });
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: 'Authentication failed' });
      }
    });
  }
  
  setupProjectEvents(socket) {
    socket.on(EVENTS.PROJECT_JOIN, async (data) => {
      try {
        const { projectId } = data;
        
        // Verify project access
        const project = await ProjectService.getProjectById(projectId, socket.userId);
        
        const roomId = `project:${projectId}`;
        this.roomManager.joinRoom(socket, roomId, { type: 'project', projectId });
        
        socket.emit(EVENTS.PROJECT_JOINED, {
          projectId,
          project: {
            id: project._id,
            name: project.name,
            settings: project.settings
          }
        });
        
        // Send list of active users
        const activeUsers = this.roomManager.getRoomUsers(roomId);
        socket.emit(EVENTS.PROJECT_USER_LIST, { users: activeUsers });
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to join project: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.PROJECT_LEAVE, (data) => {
      const { projectId } = data;
      const roomId = `project:${projectId}`;
      this.roomManager.leaveRoom(socket, roomId);
      socket.emit(EVENTS.PROJECT_LEFT, { projectId });
    });
  }
  
  setupFileEvents(socket) {
    socket.on(EVENTS.FILE_JOIN, async (data) => {
      try {
        const { fileId } = data;
        
        // Verify file access
        const file = await FileService.getFileById(socket.userId, fileId);
        
        const roomId = `file:${fileId}`;
        this.roomManager.joinRoom(socket, roomId, { type: 'file', fileId });
        
        // Initialize file editors if not exists
        if (!this.fileEditors.has(fileId)) {
          this.fileEditors.set(fileId, { users: new Map() });
        }
        
        const fileEditor = this.fileEditors.get(fileId);
        fileEditor.users.set(socket.userId, {
          socketId: socket.id,
          user: socket.user,
          cursor: null,
          selection: null,
          lastActivity: new Date()
        });
        
        // Send current file state and active editors
        socket.emit('file:joined', {
          fileId,
          file: {
            id: file._id,
            name: file.name,
            content: file.content,
            language: file.language
          },
          activeEditors: Array.from(fileEditor.users.values()).map(editor => ({
            user: editor.user,
            cursor: editor.cursor,
            selection: editor.selection
          }))
        });
        
        // Notify other editors
        socket.to(roomId).emit('file:user-joined', {
          user: socket.user,
          fileId
        });
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to join file: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.FILE_LEAVE, (data) => {
      const { fileId } = data;
      this.leaveFileEditing(socket, fileId);
    });
    
    socket.on(EVENTS.FILE_EDIT, async (data) => {
      try {
        const { fileId, changes, version } = data;
        
        // Verify file access
        await FileService.getFileById(socket.userId, fileId);
        
        const roomId = `file:${fileId}`;
        
        // Broadcast changes to other editors
        socket.to(roomId).emit(EVENTS.FILE_EDIT, {
          fileId,
          changes,
          version,
          user: socket.user,
          timestamp: new Date()
        });
        
        // Update user activity
        if (this.fileEditors.has(fileId)) {
          const fileEditor = this.fileEditors.get(fileId);
          if (fileEditor.users.has(socket.userId)) {
            fileEditor.users.get(socket.userId).lastActivity = new Date();
          }
        }
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to broadcast edit: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.FILE_SAVE, async (data) => {
      try {
        const { fileId, content } = data;
        
        // Save file content
        const file = await FileService.updateFile(socket.userId, fileId, { content });
        
        const roomId = `file:${fileId}`;
        
        // Notify all editors that file was saved
        this.io.to(roomId).emit(EVENTS.FILE_SAVED, {
          fileId,
          version: file.version,
          savedBy: socket.user,
          timestamp: new Date()
        });
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to save file: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.FILE_CURSOR, (data) => {
      const { fileId, cursor } = data;
      this.updateUserCursor(socket, fileId, cursor);
    });
    
    socket.on(EVENTS.FILE_SELECTION, (data) => {
      const { fileId, selection } = data;
      this.updateUserSelection(socket, fileId, selection);
    });
  }
  
  setupChatEvents(socket) {
    socket.on(EVENTS.CHAT_JOIN, async (data) => {
      try {
        const { projectId } = data;
        
        // Verify project access
        await ProjectService.getProjectById(projectId, socket.userId);
        
        const roomId = `chat:${projectId}`;
        this.roomManager.joinRoom(socket, roomId, { type: 'chat', projectId });
        
        // Send recent chat history
        const chatHistory = await ChatService.getChatHistory(projectId, { limit: 50 });
        socket.emit('chat:history', { messages: chatHistory });
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to join chat: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.CHAT_MESSAGE, async (data) => {
      try {
        const { projectId, content, type = 'user', context } = data;
        
        // Save message to database
        const message = await ChatService.saveMessage(projectId, {
          content,
          type,
          author: socket.userId,
          context
        });
        
        const roomId = `chat:${projectId}`;
        
        // Broadcast message to all users in chat
        this.io.to(roomId).emit(EVENTS.CHAT_MESSAGE, {
          message: {
            id: message.id,
            content: message.content,
            type: message.type,
            author: socket.user,
            timestamp: message.timestamp,
            context: message.context
          }
        });
        
        // If it's a user message, trigger AI response
        if (type === 'user') {
          this.handleAIResponse(projectId, message, roomId);
        }
        
      } catch (error) {
        socket.emit(EVENTS.ERROR, { 
          message: `Failed to send message: ${error.message}` 
        });
      }
    });
    
    socket.on(EVENTS.CHAT_TYPING, (data) => {
      const { projectId } = data;
      const roomId = `chat:${projectId}`;
      
      // Track typing user
      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Set());
      }
      this.typingUsers.get(roomId).add(socket.userId);
      
      // Broadcast typing indicator
      socket.to(roomId).emit(EVENTS.CHAT_TYPING, {
        user: socket.user
      });
      
      // Auto-clear typing after 3 seconds
      setTimeout(() => {
        this.clearTyping(socket, roomId);
      }, 3000);
    });
    
    socket.on(EVENTS.CHAT_STOP_TYPING, (data) => {
      const { projectId } = data;
      const roomId = `chat:${projectId}`;
      this.clearTyping(socket, roomId);
    });
  }
  
  setupExecutionEvents(socket) {
    socket.on(EVENTS.CODE_EXECUTE, async (data) => {
      try {
        const { projectId, fileId, code, language, stdin } = data;
        
        // Verify project access
        await ProjectService.getProjectById(projectId, socket.userId);
        
        // Execute code
        const result = await ExecuteService.executeCode({
          code,
          language,
          stdin,
          userId: socket.userId,
          projectId,
          fileId
        });
        
        const roomId = `project:${projectId}`;
        
        // Send result back to user
        socket.emit(EVENTS.CODE_RESULT, {
          executionId: result.executionId,
          result: result.output,
          timestamp: new Date()
        });
        
        // Optionally broadcast to project room that code was executed
        socket.to(roomId).emit('code:executed', {
          user: socket.user,
          language,
          timestamp: new Date()
        });
        
      } catch (error) {
        socket.emit(EVENTS.CODE_ERROR, { 
          message: `Code execution failed: ${error.message}` 
        });
      }
    });
  }
  
  async handleAIResponse(projectId, userMessage, roomId) {
    try {
      // Show AI typing indicator
      this.io.to(roomId).emit(EVENTS.CHAT_TYPING, {
        user: { username: 'AI Assistant', avatar: null }
      });
      
      // Generate AI response
      const aiResponse = await ChatService.generateAIResponse(projectId, userMessage);
      
      // Save AI message to database
      const aiMessage = await ChatService.saveMessage(projectId, {
        content: aiResponse,
        type: 'assistant',
        author: null,
        context: userMessage.context
      });
      
      // Stop AI typing indicator
      this.io.to(roomId).emit(EVENTS.CHAT_STOP_TYPING, {
        user: { username: 'AI Assistant' }
      });
      
      // Send AI response
      this.io.to(roomId).emit(EVENTS.CHAT_AI_RESPONSE, {
        message: {
          id: aiMessage.id,
          content: aiMessage.content,
          type: 'assistant',
          author: { username: 'AI Assistant', avatar: null },
          timestamp: aiMessage.timestamp,
          context: aiMessage.context
        }
      });
      
    } catch (error) {
      // Stop typing and send error
      this.io.to(roomId).emit(EVENTS.CHAT_STOP_TYPING, {
        user: { username: 'AI Assistant' }
      });
      
      this.io.to(roomId).emit(EVENTS.ERROR, {
        message: 'AI response failed. Please try again.'
      });
    }
  }
  
  updateUserCursor(socket, fileId, cursor) {
    if (this.fileEditors.has(fileId)) {
      const fileEditor = this.fileEditors.get(fileId);
      if (fileEditor.users.has(socket.userId)) {
        fileEditor.users.get(socket.userId).cursor = cursor;
        
        // Broadcast cursor position to other editors
        const roomId = `file:${fileId}`;
        socket.to(roomId).emit(EVENTS.FILE_CURSOR, {
          fileId,
          user: socket.user,
          cursor
        });
      }
    }
  }
  
  updateUserSelection(socket, fileId, selection) {
    if (this.fileEditors.has(fileId)) {
      const fileEditor = this.fileEditors.get(fileId);
      if (fileEditor.users.has(socket.userId)) {
        fileEditor.users.get(socket.userId).selection = selection;
        
        // Broadcast selection to other editors
        const roomId = `file:${fileId}`;
        socket.to(roomId).emit(EVENTS.FILE_SELECTION, {
          fileId,
          user: socket.user,
          selection
        });
      }
    }
  }
  
  leaveFileEditing(socket, fileId) {
    const roomId = `file:${fileId}`;
    this.roomManager.leaveRoom(socket, roomId);
    
    // Remove user from file editors
    if (this.fileEditors.has(fileId)) {
      const fileEditor = this.fileEditors.get(fileId);
      fileEditor.users.delete(socket.userId);
      
      // Clean up empty file editor sessions
      if (fileEditor.users.size === 0) {
        this.fileEditors.delete(fileId);
      } else {
        // Notify remaining editors
        socket.to(roomId).emit('file:user-left', {
          user: socket.user,
          fileId
        });
      }
    }
  }
  
  clearTyping(socket, roomId) {
    if (this.typingUsers.has(roomId)) {
      this.typingUsers.get(roomId).delete(socket.userId);
      
      // Broadcast stop typing
      socket.to(roomId).emit(EVENTS.CHAT_STOP_TYPING, {
        user: socket.user
      });
      
      // Clean up empty typing sets
      if (this.typingUsers.get(roomId).size === 0) {
        this.typingUsers.delete(roomId);
      }
    }
  }
  
  handleDisconnect(socket) {
    console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.user.username})`);
    
    // Leave all rooms
    this.roomManager.leaveAllRooms(socket);
    
    // Clean up file editing sessions
    this.fileEditors.forEach((fileEditor, fileId) => {
      if (fileEditor.users.has(socket.userId)) {
        this.leaveFileEditing(socket, fileId);
      }
    });
    
    // Clean up typing indicators
    this.typingUsers.forEach((typingSet, roomId) => {
      this.clearTyping(socket, roomId);
    });
  }
}

module.exports = SocketHandlers;