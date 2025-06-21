const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const File = require('../models/File');

const configureSocket = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Track connected users per project
  const projectUsers = new Map(); // projectId -> Set of userIds
  const userSockets = new Map(); // userId -> Set of socket IDs

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.user.username} connected (${socket.id})`);

    // Track user socket
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    // Join user to their projects
    socket.on('join:projects', async () => {
      try {
        const projects = await Project.findUserProjects(socket.userId);
        
        for (const project of projects) {
          const projectId = project._id.toString();
          socket.join(`project:${projectId}`);
          
          // Track user in project
          if (!projectUsers.has(projectId)) {
            projectUsers.set(projectId, new Set());
          }
          projectUsers.get(projectId).add(socket.userId);
          
          // Notify other users in project
          socket.to(`project:${projectId}`).emit('user:online', {
            userId: socket.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          });
        }
        
        socket.emit('projects:joined', projects.map(p => p._id));
      } catch (error) {
        console.error('Error joining projects:', error);
        socket.emit('error', { message: 'Failed to join projects' });
      }
    });

    // Join specific project room
    socket.on('join:project', async (projectId) => {
      try {
        const project = await Project.findById(projectId);
        
        if (!project || !project.canUserAccess(socket.userId)) {
          return socket.emit('error', { message: 'Access denied to project' });
        }

        socket.join(`project:${projectId}`);
        
        // Track user in project
        if (!projectUsers.has(projectId)) {
          projectUsers.set(projectId, new Set());
        }
        projectUsers.get(projectId).add(socket.userId);

        // Get current online users in project
        const onlineUsers = Array.from(projectUsers.get(projectId) || []);
        
        // Notify others and send current users to joining user
        socket.to(`project:${projectId}`).emit('user:joined', {
          userId: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar
        });

        socket.emit('project:joined', {
          projectId,
          onlineUsers
        });

        // Update project activity
        project.updateActivity(socket.userId);
      } catch (error) {
        console.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Leave project room
    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      
      if (projectUsers.has(projectId)) {
        projectUsers.get(projectId).delete(socket.userId);
        
        // Clean up empty project
        if (projectUsers.get(projectId).size === 0) {
          projectUsers.delete(projectId);
        }
      }

      socket.to(`project:${projectId}`).emit('user:left', {
        userId: socket.userId,
        username: socket.user.username
      });
    });

    // File editing events
    socket.on('file:join', async (data) => {
      const { projectId, fileId } = data;
      
      try {
        const project = await Project.findById(projectId);
        const file = await File.findById(fileId);
        
        if (!project || !file || !project.canUserAccess(socket.userId, 'view')) {
          return socket.emit('error', { message: 'Access denied' });
        }

        const fileRoom = `file:${fileId}`;
        socket.join(fileRoom);

        // Update file editor presence
        await file.updateEditorPresence(socket.userId, { line: 0, character: 0 }, null);

        // Notify others
        socket.to(fileRoom).emit('file:user_joined', {
          userId: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar,
          fileId
        });

        // Send current active editors
        const activeEditors = file.activeEditors.map(editor => ({
          userId: editor.user,
          cursor: editor.cursor,
          selection: editor.selection,
          lastSeen: editor.lastSeen
        }));

        socket.emit('file:joined', { fileId, activeEditors });
      } catch (error) {
        console.error('Error joining file:', error);
        socket.emit('error', { message: 'Failed to join file' });
      }
    });

    socket.on('file:leave', async (data) => {
      const { fileId } = data;
      
      try {
        const file = await File.findById(fileId);
        if (file) {
          await file.removeEditor(socket.userId);
        }

        const fileRoom = `file:${fileId}`;
        socket.leave(fileRoom);

        socket.to(fileRoom).emit('file:user_left', {
          userId: socket.userId,
          fileId
        });
      } catch (error) {
        console.error('Error leaving file:', error);
      }
    });

    // Real-time file editing
    socket.on('file:edit', async (data) => {
      const { projectId, fileId, content, cursor, selection } = data;
      
      try {
        const project = await Project.findById(projectId);
        
        if (!project || !project.canUserAccess(socket.userId, 'edit')) {
          return socket.emit('error', { message: 'Edit permission denied' });
        }

        const file = await File.findById(fileId);
        if (!file || !file.canEdit(socket.userId, { canEdit: true })) {
          return socket.emit('error', { message: 'Cannot edit file' });
        }

        // Update file content (debounced saves will be handled client-side)
        file.content = content;
        file.lastModified = new Date();
        file.lastModifiedBy = socket.userId;
        
        // Update editor presence
        await file.updateEditorPresence(socket.userId, cursor, selection);
        await file.save();

        // Broadcast changes to other editors
        const fileRoom = `file:${fileId}`;
        socket.to(fileRoom).emit('file:content_changed', {
          fileId,
          content,
          userId: socket.userId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error handling file edit:', error);
        socket.emit('error', { message: 'Failed to save file changes' });
      }
    });

    // Cursor and selection updates
    socket.on('file:cursor', async (data) => {
      const { fileId, cursor, selection } = data;
      
      try {
        const file = await File.findById(fileId);
        if (file) {
          await file.updateEditorPresence(socket.userId, cursor, selection);
          
          const fileRoom = `file:${fileId}`;
          socket.to(fileRoom).emit('file:cursor_changed', {
            fileId,
            userId: socket.userId,
            cursor,
            selection,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating cursor:', error);
      }
    });

    // Chat events
    socket.on('chat:typing', (data) => {
      const { projectId, threadId } = data;
      socket.to(`project:${projectId}`).emit('chat:user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        threadId,
        timestamp: new Date()
      });
    });

    socket.on('chat:stop_typing', (data) => {
      const { projectId, threadId } = data;
      socket.to(`project:${projectId}`).emit('chat:user_stop_typing', {
        userId: socket.userId,
        threadId
      });
    });

    // Code execution events
    socket.on('code:executed', (data) => {
      const { projectId, fileId, result } = data;
      
      socket.to(`project:${projectId}`).emit('code:execution_result', {
        fileId,
        userId: socket.userId,
        username: socket.user.username,
        result,
        timestamp: new Date()
      });
    });

    // Project updates
    socket.on('project:updated', (data) => {
      const { projectId, changes } = data;
      
      socket.to(`project:${projectId}`).emit('project:changed', {
        projectId,
        changes,
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 User ${socket.user.username} disconnected: ${reason}`);

      // Remove from user sockets tracking
      if (userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }

      // Clean up project presence
      for (const [projectId, users] of projectUsers.entries()) {
        if (users.has(socket.userId)) {
          // Check if user has other active sockets
          const hasOtherSockets = userSockets.has(socket.userId) && 
            userSockets.get(socket.userId).size > 0;
          
          if (!hasOtherSockets) {
            users.delete(socket.userId);
            
            socket.to(`project:${projectId}`).emit('user:offline', {
              userId: socket.userId,
              username: socket.user.username
            });
            
            // Clean up empty projects
            if (users.size === 0) {
              projectUsers.delete(projectId);
            }
          }
        }
      }

      // Remove from file editing sessions
      try {
        const files = await File.find({ 'activeEditors.user': socket.userId });
        for (const file of files) {
          await file.removeEditor(socket.userId);
          
          const fileRoom = `file:${file._id}`;
          socket.to(fileRoom).emit('file:user_left', {
            userId: socket.userId,
            fileId: file._id
          });
        }
      } catch (error) {
        console.error('Error cleaning up file sessions:', error);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'Socket error occurred' });
    });
  });

  // Helper function to get online users for a project
  io.getProjectUsers = (projectId) => {
    return Array.from(projectUsers.get(projectId) || []);
  };

  // Helper function to broadcast to specific project
  io.toProject = (projectId, event, data) => {
    io.to(`project:${projectId}`).emit(event, data);
  };

  console.log('🔌 Socket.IO configured successfully');
};

module.exports = configureSocket;