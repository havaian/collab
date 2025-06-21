const axios = require('axios');
const ExecutionResult = require('../models/ExecutionResult');

class CodeExecutionService {
  constructor() {
    this.rapidApiHost = process.env.RAPID_API_HOST;
    this.rapidApiKey = process.env.RAPID_API_KEY;
    this.submissionsUrl = process.env.RAPID_API_URL;
    this.isConfigured = !!(this.rapidApiHost && this.rapidApiKey && this.submissionsUrl);
    
    // Judge0 language mappings
    this.languageMap = {
      'javascript': 63,
      'python': 71,
      'java': 62,
      'cpp': 54,
      'c': 50,
      'csharp': 51,
      'go': 60,
      'kotlin': 78,
      'ruby': 72,
      'rust': 73,
      'typescript': 74,
      'php': 68
    };
  }

  async executeCode(options) {
    if (!this.isConfigured) {
      throw new Error('Code execution service is not configured');
    }

    const {
      code,
      language,
      stdin = '',
      userId,
      projectId,
      fileId,
      timeout = 30,
      memoryLimit = 128
    } = options;

    try {
      const languageId = this.languageMap[language];
      
      if (!languageId) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Create execution record
      const executionResult = new ExecutionResult({
        projectId,
        fileId,
        userId,
        code,
        language,
        languageId,
        stdin,
        status: { id: 1, description: 'In Queue' },
        executionContext: {
          timeout,
          memoryLimit,
          environment: 'judge0'
        }
      });

      // Submit to Judge0
      const submissionData = {
        language_id: languageId,
        source_code: Buffer.from(code).toString('base64'),
        stdin: Buffer.from(stdin).toString('base64'),
        cpu_time_limit: timeout,
        memory_limit: memoryLimit * 1024 // Convert MB to KB
      };

      const response = await axios.post(this.submissionsUrl, submissionData, {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Host': this.rapidApiHost,
          'X-RapidAPI-Key': this.rapidApiKey,
        },
        params: {
          base64_encoded: 'true',
          fields: '*'
        }
      });

      const token = response.data.token;
      executionResult.token = token;
      await executionResult.save();

      // Start polling for results
      const result = await this.pollExecutionStatus(token, executionResult._id);
      
      return result;

    } catch (error) {
      console.error('Code execution error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 401:
            throw new Error('Invalid Judge0 API key');
          case 429:
            throw new Error('Execution rate limit exceeded');
          case 422:
            throw new Error('Invalid submission data');
          default:
            throw new Error(`Execution service error: ${errorData.error || 'Unknown error'}`);
        }
      }
      
      throw new Error('Failed to execute code');
    }
  }

  async pollExecutionStatus(token, executionId, maxAttempts = 30) {
    let attempts = 0;
    const pollInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      try {
        const result = await this.checkExecutionStatus(token);
        
        // Update execution result in database
        await ExecutionResult.findByIdAndUpdate(executionId, {
          status: {
            id: result.status.id,
            description: result.status.description
          },
          stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : null,
          stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null,
          time: result.time,
          memory: result.memory,
          completedAt: result.status.id > 2 ? new Date() : null
        });

        // Status IDs: 1=In Queue, 2=Processing, 3+=Completed
        if (result.status.id > 2) {
          const finalResult = await ExecutionResult.findById(executionId)
            .populate('userId', 'username avatar')
            .populate('fileId', 'name path');
          
          return finalResult;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;

      } catch (error) {
        console.error(`Polling attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Mark as failed
          await ExecutionResult.findByIdAndUpdate(executionId, {
            status: { id: 13, description: 'Internal Error' },
            error: {
              hasError: true,
              errorType: 'system',
              errorMessage: 'Execution timeout'
            },
            completedAt: new Date()
          });
          
          throw new Error('Execution polling timeout');
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('Execution timeout');
  }

  async checkExecutionStatus(token) {
    const response = await axios.get(`${this.submissionsUrl}/${token}`, {
      headers: {
        'X-RapidAPI-Host': this.rapidApiHost,
        'X-RapidAPI-Key': this.rapidApiKey,
      },
      params: {
        base64_encoded: 'true',
        fields: '*'
      }
    });

    return response.data;
  }

  async getExecutionById(executionId) {
    try {
      return await ExecutionResult.findById(executionId)
        .populate('userId', 'username avatar')
        .populate('fileId', 'name path')
        .populate('projectId', 'name');
    } catch (error) {
      throw new Error('Execution result not found');
    }
  }

  async getExecutionsByProject(projectId, options = {}) {
    const {
      limit = 20,
      skip = 0,
      status = null,
      language = null,
      userId = null
    } = options;

    const query = { projectId };
    
    if (status) query['status.id'] = status;
    if (language) query.language = language;
    if (userId) query.userId = userId;

    return await ExecutionResult.find(query)
      .populate('userId', 'username avatar')
      .populate('fileId', 'name path')
      .sort({ executedAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async getExecutionsByUser(userId, limit = 20) {
    return await ExecutionResult.find({ userId })
      .populate('projectId', 'name')
      .populate('fileId', 'name path')
      .sort({ executedAt: -1 })
      .limit(limit);
  }

  async getExecutionStats(projectId, timeframe = 'week') {
    const stats = await ExecutionResult.getExecutionStats(projectId, timeframe);
    return stats[0] || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      avgMemoryUsage: 0
    };
  }

  async getLanguageStats(projectId, timeframe = 'month') {
    return await ExecutionResult.getLanguageStats(projectId, timeframe);
  }

  async deleteExecution(executionId, userId) {
    const execution = await ExecutionResult.findById(executionId);
    
    if (!execution) {
      throw new Error('Execution not found');
    }
    
    if (execution.userId.toString() !== userId.toString()) {
      throw new Error('Permission denied');
    }
    
    await ExecutionResult.findByIdAndDelete(executionId);
    return true;
  }

  async getSupportedLanguages() {
    return Object.entries(this.languageMap).map(([name, id]) => ({
      name,
      id,
      displayName: this.getLanguageDisplayName(name),
      extension: this.getLanguageExtension(name)
    }));
  }

  getLanguageDisplayName(language) {
    const displayNames = {
      'javascript': 'JavaScript (Node.js)',
      'python': 'Python 3',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'go': 'Go',
      'kotlin': 'Kotlin',
      'ruby': 'Ruby',
      'rust': 'Rust',
      'typescript': 'TypeScript',
      'php': 'PHP'
    };
    
    return displayNames[language] || language;
  }

  getLanguageExtension(language) {
    const extensions = {
      'javascript': '.js',
      'python': '.py',
      'java': '.java',
      'cpp': '.cpp',
      'c': '.c',
      'csharp': '.cs',
      'go': '.go',
      'kotlin': '.kt',
      'ruby': '.rb',
      'rust': '.rs',
      'typescript': '.ts',
      'php': '.php'
    };
    
    return extensions[language] || '.txt';
  }

  async cleanupOldExecutions(olderThanDays = 30) {
    try {
      const result = await ExecutionResult.cleanupOldExecutions(olderThanDays);
      console.log(`Cleaned up ${result.deletedCount} old execution results`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old executions:', error);
      throw error;
    }
  }

  // Check if the service is available
  async healthCheck() {
    if (!this.isConfigured) {
      return {
        status: 'unavailable',
        message: 'Code execution service not configured'
      };
    }

    try {
      // Simple health check - get languages
      const response = await axios.get(`${this.submissionsUrl.replace('/submissions', '/languages')}`, {
        headers: {
          'X-RapidAPI-Host': this.rapidApiHost,
          'X-RapidAPI-Key': this.rapidApiKey,
        }
      });

      return {
        status: 'available',
        message: 'Code execution service is operational',
        languages: response.data.length
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Code execution service is experiencing issues',
        error: error.message
      };
    }
  }

  // Validate code before execution
  validateCode(code, language) {
    const errors = [];

    // Check code length
    if (code.length === 0) {
      errors.push('Code cannot be empty');
    }

    if (code.length > 100000) {
      errors.push('Code exceeds maximum length (100KB)');
    }

    // Language-specific validations
    switch (language) {
      case 'python':
        if (code.includes('import os') || code.includes('import subprocess')) {
          errors.push('System imports are not allowed for security reasons');
        }
        break;
      case 'javascript':
        if (code.includes('require(') && (code.includes('fs') || code.includes('child_process'))) {
          errors.push('File system and process modules are not allowed');
        }
        break;
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /while\s*\(\s*true\s*\)/gi, // Infinite loops
      /for\s*\(\s*;\s*;\s*\)/gi,   // Infinite for loops
      /exec\(/gi,                   // Command execution
      /eval\(/gi,                   // Code evaluation
      /system\(/gi                  // System calls
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        errors.push('Code contains potentially dangerous patterns');
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new CodeExecutionService();