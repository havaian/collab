// Supported programming languages for Judge0
const SUPPORTED_LANGUAGES = [
  { id: 63, name: 'JavaScript (Node.js 12.14.0)', value: 'javascript', extension: '.js' },
  { id: 71, name: 'Python (3.8.1)', value: 'python', extension: '.py' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)', value: 'java', extension: '.java' },
  { id: 54, name: 'C++ (GCC 9.2.0)', value: 'cpp', extension: '.cpp' },
  { id: 50, name: 'C (GCC 9.2.0)', value: 'c', extension: '.c' },
  { id: 51, name: 'C# (Mono 6.6.0.161)', value: 'csharp', extension: '.cs' },
  { id: 60, name: 'Go (1.13.5)', value: 'go', extension: '.go' },
  { id: 78, name: 'Kotlin (1.3.70)', value: 'kotlin', extension: '.kt' },
  { id: 72, name: 'Ruby (2.7.0)', value: 'ruby', extension: '.rb' },
  { id: 73, name: 'Rust (1.40.0)', value: 'rust', extension: '.rs' },
  { id: 74, name: 'TypeScript (3.7.4)', value: 'typescript', extension: '.ts' },
  { id: 68, name: 'PHP (7.4.1)', value: 'php', extension: '.php' }
];

// Judge0 execution status codes
const EXECUTION_STATUSES = {
  1: { name: 'In Queue', description: 'Submission is in queue', color: 'yellow' },
  2: { name: 'Processing', description: 'Submission is being processed', color: 'blue' },
  3: { name: 'Accepted', description: 'Submission executed successfully', color: 'green' },
  4: { name: 'Wrong Answer', description: 'Output doesn\'t match expected', color: 'red' },
  5: { name: 'Time Limit Exceeded', description: 'Execution time exceeded limit', color: 'orange' },
  6: { name: 'Compilation Error', description: 'Code failed to compile', color: 'purple' },
  7: { name: 'Runtime Error (SIGSEGV)', description: 'Segmentation fault', color: 'red' },
  8: { name: 'Runtime Error (SIGXFSZ)', description: 'File size limit exceeded', color: 'red' },
  9: { name: 'Runtime Error (SIGFPE)', description: 'Floating point exception', color: 'red' },
  10: { name: 'Runtime Error (SIGABRT)', description: 'Abort signal', color: 'red' },
  11: { name: 'Runtime Error (NZEC)', description: 'Non-zero exit code', color: 'red' },
  12: { name: 'Runtime Error (Other)', description: 'Other runtime error', color: 'red' },
  13: { name: 'Internal Error', description: 'Judge0 internal error', color: 'red' },
  14: { name: 'Exec Format Error', description: 'Executable format error', color: 'red' }
};

// File type mappings
const FILE_TYPES = {
  CODE: 'code',
  TEXT: 'text',
  MARKDOWN: 'markdown',
  JSON: 'json',
  CONFIG: 'config'
};

// File format mappings
const FILE_FORMATS = {
  MARKDOWN: 'markdown',
  TEXT: 'text',
  CODE: 'code',
  JSON: 'json',
  YAML: 'yaml'
};

// Knowledge base item types
const KNOWLEDGE_TYPES = {
  DOCUMENT: 'document',
  CODE_SNIPPET: 'code-snippet',
  NOTE: 'note',
  REFERENCE: 'reference',
  API_DOC: 'api-doc',
  TUTORIAL: 'tutorial'
};

// User roles in projects
const PROJECT_ROLES = {
  OWNER: 'owner',
  COLLABORATOR: 'collaborator',
  VIEWER: 'viewer'
};

// Project status
const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

// User themes
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// AI models
const AI_MODELS = {
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
};

// Message types
const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  ERROR: 'error'
};

// Context types for AI
const CONTEXT_TYPES = {
  FILE: 'file',
  KNOWLEDGE: 'knowledge',
  PREVIOUS_MESSAGE: 'previous_message'
};

// Socket events
const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Project events
  JOIN_PROJECT: 'join:project',
  LEAVE_PROJECT: 'leave:project',
  PROJECT_JOINED: 'project:joined',
  PROJECT_UPDATED: 'project:updated',
  
  // File events
  FILE_JOIN: 'file:join',
  FILE_LEAVE: 'file:leave',
  FILE_EDIT: 'file:edit',
  FILE_CURSOR: 'file:cursor',
  FILE_CHANGED: 'file:changed',
  FILE_LOCKED: 'file:locked',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop_typing',
  
  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  
  // Code execution events
  CODE_EXECUTED: 'code:executed',
  CODE_EXECUTION_RESULT: 'code:execution_result',
  
  // System events
  SYSTEM_NOTIFICATION: 'system:notification',
  SYSTEM_ANNOUNCEMENT: 'system:announcement',
  ERROR: 'error'
};

// Rate limiting configurations
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10
  },
  CODE_EXECUTION: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20
  },
  AI_CHAT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100
  },
  FILE_UPLOAD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50
  },
  PROJECT_CREATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5
  }
};

// File size limits
const FILE_LIMITS = {
  MAX_FILE_SIZE: 1024 * 1024, // 1MB
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CODE_LENGTH: 100000, // 100KB
  MAX_MESSAGE_LENGTH: 50000, // 50KB
  MAX_KNOWLEDGE_CONTENT: 100000 // 100KB
};

// API pricing (per 1K tokens)
const AI_PRICING = {
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002
  }
};

// Default project settings
const DEFAULT_PROJECT_SETTINGS = {
  aiModel: AI_MODELS.GPT_3_5_TURBO,
  defaultTheme: THEMES.AUTO,
  codeExecution: {
    enabled: true,
    allowedLanguages: ['javascript', 'python', 'java'],
    timeout: 30,
    memoryLimit: 128
  },
  collaboration: {
    allowGuestUsers: false,
    requireApprovalForJoin: true,
    maxCollaborators: 10
  }
};

// Default user preferences
const DEFAULT_USER_PREFERENCES = {
  theme: THEMES.AUTO,
  defaultAIModel: AI_MODELS.GPT_3_5_TURBO,
  notifications: {
    email: true,
    push: true,
    mentions: true
  }
};

// Error codes
const ERROR_CODES = {
  // Authentication errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  
  // Authorization errors
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OWNER_REQUIRED: 'OWNER_REQUIRED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  RESOURCE_DELETED: 'RESOURCE_DELETED',
  
  // Service errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Environment constants
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// Database collection names
const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  FILES: 'files',
  CHATS: 'chats',
  KNOWLEDGE_BASE: 'knowledgebases',
  EXECUTION_RESULTS: 'executionresults'
};

// Regular expressions for validation
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  FILENAME: /^[^<>:"/\\|?*\x00-\x1f]+$/,
  SAFE_PATH: /^(?!.*\.\.)(?!\/)[^<>:"|?*\x00-\x1f]*$/
};

// Notification types
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ANNOUNCEMENT: 'announcement'
};

// File permissions
const FILE_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  EXECUTE: 'execute'
};

// Knowledge base categories
const KNOWLEDGE_CATEGORIES = {
  GENERAL: 'General',
  DOCUMENTATION: 'Documentation',
  CODE_SNIPPETS: 'Code Snippets',
  TUTORIALS: 'Tutorials',
  API_REFERENCE: 'API Reference',
  BEST_PRACTICES: 'Best Practices',
  TROUBLESHOOTING: 'Troubleshooting'
};

// Export all constants
module.exports = {
  SUPPORTED_LANGUAGES,
  EXECUTION_STATUSES,
  FILE_TYPES,
  FILE_FORMATS,
  KNOWLEDGE_TYPES,
  PROJECT_ROLES,
  PROJECT_STATUS,
  THEMES,
  AI_MODELS,
  MESSAGE_TYPES,
  CONTEXT_TYPES,
  SOCKET_EVENTS,
  RATE_LIMITS,
  FILE_LIMITS,
  AI_PRICING,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  ERROR_CODES,
  HTTP_STATUS,
  ENVIRONMENTS,
  COLLECTIONS,
  REGEX_PATTERNS,
  NOTIFICATION_TYPES,
  FILE_PERMISSIONS,
  KNOWLEDGE_CATEGORIES
};