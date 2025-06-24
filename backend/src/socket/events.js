// src/socket/events.js
const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',

  // Project events
  PROJECT_JOIN: 'project:join',
  PROJECT_LEAVE: 'project:leave',
  PROJECT_JOINED: 'project:joined',
  PROJECT_LEFT: 'project:left',
  PROJECT_USER_LIST: 'project:user-list',

  // File collaboration events
  FILE_JOIN: 'file:join',
  FILE_LEAVE: 'file:leave',
  FILE_EDIT: 'file:edit',
  FILE_SAVE: 'file:save',
  FILE_SAVED: 'file:saved',
  FILE_CURSOR: 'file:cursor',
  FILE_SELECTION: 'file:selection',
  FILE_CREATED: 'file:created',
  FILE_DELETED: 'file:deleted',
  FILE_RENAMED: 'file:renamed',

  // Chat events
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop-typing',
  CHAT_AI_RESPONSE: 'chat:ai-response',

  // Code execution events
  CODE_EXECUTE: 'code:execute',
  CODE_RESULT: 'code:result',
  CODE_ERROR: 'code:error',

  // System events
  ERROR: 'error',
  NOTIFICATION: 'notification'
};

module.exports = SOCKET_EVENTS;

// src/socket/middleware.js
const jwt = require('jsonwebtoken');
const User = require('../auth/model');
const EVENTS = require('./events');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-accessToken -refreshToken');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar
    };

    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
};

module.exports = { socketAuthMiddleware };