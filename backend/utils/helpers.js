const crypto = require('crypto');
const { REGEX_PATTERNS, FILE_LIMITS } = require('./constants');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
const generateRandomString = (length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
const generateUniqueId = () => {
  return `${Date.now()}_${generateRandomString(8)}`;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} Is valid username
 */
const isValidUsername = (username) => {
  return REGEX_PATTERNS.USERNAME.test(username);
};

/**
 * Validate filename
 * @param {string} filename - Filename to validate
 * @returns {boolean} Is valid filename
 */
const isValidFilename = (filename) => {
  return REGEX_PATTERNS.FILENAME.test(filename) && filename.length > 0 && filename.length <= 255;
};

/**
 * Validate file path
 * @param {string} path - Path to validate
 * @returns {boolean} Is valid path
 */
const isValidPath = (path) => {
  return REGEX_PATTERNS.SAFE_PATH.test(path) && path.length <= 1000;
};

/**
 * Sanitize HTML content to prevent XSS
 * @param {string} content - Content to sanitize
 * @returns {string} Sanitized content
 */
const sanitizeHtml = (content) => {
  if (typeof content !== 'string') return content;
  
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration in human readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (milliseconds) => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format timestamp for display
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('relative', 'short', 'long')
 * @returns {string} Formatted timestamp
 */
const formatTimestamp = (date, format = 'relative') => {
  const now = new Date();
  const diff = now - date;
  
  switch (format) {
    case 'relative':
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
      return date.toLocaleDateString();
    
    case 'short':
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    
    case 'long':
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    
    default:
      return date.toISOString();
  }
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of function execution
 */
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Distance
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity percentage (0-100)
 */
const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
};

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength, suffix = '...') => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @param {number} limit - Maximum number of keywords
 * @returns {string[]} Array of keywords
 */
const extractKeywords = (text, limit = 10) => {
  const stopWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did',
    'use', 'way', 'she', 'may', 'say', 'that', 'this', 'with', 'from',
    'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
    'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
    'such', 'take', 'than', 'them', 'well', 'were'
  ];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word);
};

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @param {number} maxLength - Maximum slug length
 * @returns {string} Slug
 */
const generateSlug = (text, maxLength = 50) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} Is empty
 */
const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  return Object.keys(obj).length === 0;
};

/**
 * Convert object to query string
 * @param {object} obj - Object to convert
 * @returns {string} Query string
 */
const objectToQueryString = (obj) => {
  return Object.keys(obj)
    .filter(key => obj[key] !== undefined && obj[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string to parse
 * @returns {object} Parsed object
 */
const queryStringToObject = (queryString) => {
  const obj = {};
  const params = new URLSearchParams(queryString);
  
  for (const [key, value] of params) {
    obj[key] = value;
  }
  
  return obj;
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension
 * @returns {string} MIME type
 */
const getMimeType = (extension) => {
  const mimeTypes = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size
 * @returns {boolean} Is valid size
 */
const isValidFileSize = (size, maxSize = FILE_LIMITS.MAX_FILE_SIZE) => {
  return size > 0 && size <= maxSize;
};

/**
 * Calculate hash of string
 * @param {string} data - Data to hash
 * @param {string} algorithm - Hash algorithm (default: 'sha256')
 * @returns {string} Hash
 */
const calculateHash = (data, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(data).digest('hex');
};

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Mask sensitive data for logging
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of visible characters at start/end
 * @returns {string} Masked data
 */
const maskSensitiveData = (data, visibleChars = 4) => {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 8);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(Math.max(8, data.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create error response object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} status - HTTP status code
 * @param {any} details - Additional error details
 * @returns {object} Error response object
 */
const createErrorResponse = (message, code = 'UNKNOWN_ERROR', status = 500, details = null) => {
  return {
    error: {
      message,
      code,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
};

/**
 * Create success response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {object} meta - Additional metadata
 * @returns {object} Success response object
 */
const createSuccessResponse = (data, message = 'Success', meta = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };
};

module.exports = {
  generateRandomString,
  generateUniqueId,
  isValidEmail,
  isValidUsername,
  isValidFilename,
  isValidPath,
  sanitizeHtml,
  escapeRegex,
  formatFileSize,
  formatDuration,
  formatTimestamp,
  deepClone,
  debounce,
  throttle,
  retryWithBackoff,
  levenshteinDistance,
  calculateSimilarity,
  truncateText,
  extractKeywords,
  generateSlug,
  isEmpty,
  objectToQueryString,
  queryStringToObject,
  getFileExtension,
  getMimeType,
  isValidFileSize,
  calculateHash,
  generateSecureToken,
  maskSensitiveData,
  sleep,
  createErrorResponse,
  createSuccessResponse
};