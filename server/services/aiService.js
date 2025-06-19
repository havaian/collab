const axios = require('axios');
const KnowledgeBase = require('../models/KnowledgeBase');
const File = require('../models/File');
const Chat = require('../models/Chat');

class AIService {
  constructor() {
    this.baseURL = 'https://api.openai.com/v1';
    this.maxTokens = {
      'gpt-3.5-turbo': 4096,
      'gpt-4': 8192
    };
    this.pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4': { input: 0.03, output: 0.06 }
    };
  }

  async sendMessage(options) {
    const {
      message,
      apiKey,
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 2000,
      projectId,
      userId,
      includeContext = true,
      previousMessages = []
    } = options;

    try {
      // Build context if requested
      let contextMessages = [];
      
      if (includeContext && projectId) {
        contextMessages = await this.buildContext(projectId, message);
      }

      // Prepare messages array
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt(projectId, contextMessages)
        },
        ...previousMessages.slice(-10), // Last 10 messages for context
        {
          role: 'user',
          content: message
        }
      ];

      // Call OpenAI API
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          user: userId?.toString()
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const completion = response.data;
      const assistantMessage = completion.choices[0].message.content;

      // Calculate cost
      const inputTokens = completion.usage.prompt_tokens;
      const outputTokens = completion.usage.completion_tokens;
      const cost = this.calculateCost(model, inputTokens, outputTokens);

      // Mark knowledge items as used
      if (contextMessages.length > 0) {
        await this.markKnowledgeAsUsed(contextMessages);
      }

      return {
        message: assistantMessage,
        model,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: completion.usage.total_tokens
        },
        cost,
        context: contextMessages.map(ctx => ({
          type: ctx.type,
          reference: ctx.reference,
          title: ctx.title
        })),
        finishReason: completion.choices[0].finish_reason
      };

    } catch (error) {
      console.error('AI Service error:', error);
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 401:
            throw new Error('Invalid API key');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 400:
            throw new Error(errorData.error?.message || 'Invalid request');
          case 500:
            throw new Error('OpenAI service unavailable');
          default:
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
        }
      }
      
      throw new Error('Failed to communicate with AI service');
    }
  }

  async buildContext(projectId, query) {
    const context = [];
    
    try {
      // Get relevant knowledge base items
      const knowledgeItems = await KnowledgeBase.findForAIContext(projectId, query, 3);
      
      for (const item of knowledgeItems) {
        context.push({
          type: 'knowledge',
          reference: item._id.toString(),
          title: item.title,
          content: this.truncateContent(item.content, 1000),
          priority: item.contextPriority
        });
      }

      // Get relevant files (prioritize recently modified)
      const files = await File.find({
        projectId,
        includeInAIContext: true,
        type: { $in: ['code', 'markdown', 'config'] }
      })
      .sort({ lastModified: -1 })
      .limit(5)
      .select('name path content type language');

      for (const file of files) {
        // Only include files that might be relevant to the query
        if (this.isFileRelevant(file, query)) {
          context.push({
            type: 'file',
            reference: file._id.toString(),
            title: `${file.name} (${file.path})`,
            content: this.truncateContent(file.content, 800),
            language: file.language
          });
        }
      }

      // Sort by relevance/priority
      context.sort((a, b) => {
        if (a.priority && b.priority) {
          return b.priority - a.priority;
        }
        return a.type === 'knowledge' ? -1 : 1;
      });

      return context.slice(0, 5); // Limit to top 5 context items

    } catch (error) {
      console.error('Error building context:', error);
      return [];
    }
  }

  getSystemPrompt(projectId, contextItems = []) {
    let prompt = `You are an AI assistant helping with a collaborative software development project. You have access to the project's knowledge base and files.

Guidelines:
- Provide helpful, accurate, and contextual responses
- Reference specific files or knowledge items when relevant
- Suggest best practices and improvements
- Be concise but thorough
- If you're unsure about something, say so
- Help with coding, documentation, and project planning`;

    if (contextItems.length > 0) {
      prompt += `\n\nProject Context:\n`;
      
      contextItems.forEach((item, index) => {
        prompt += `\n${index + 1}. ${item.title} (${item.type}):\n${item.content}\n`;
      });
      
      prompt += `\nUse this context to provide more accurate and relevant responses.`;
    }

    return prompt;
  }

  isFileRelevant(file, query) {
    const queryLower = query.toLowerCase();
    const fileName = file.name.toLowerCase();
    const fileContent = file.content.toLowerCase();
    
    // Check if query mentions the file name or contains relevant keywords
    if (fileName.includes(queryLower) || queryLower.includes(fileName.replace(/\.[^/.]+$/, ""))) {
      return true;
    }
    
    // Check for programming language mentions
    if (file.language && queryLower.includes(file.language)) {
      return true;
    }
    
    // Check for common technical terms
    const technicalTerms = ['function', 'class', 'import', 'export', 'const', 'let', 'var', 'def', 'public', 'private'];
    if (technicalTerms.some(term => queryLower.includes(term) && fileContent.includes(term))) {
      return true;
    }
    
    return false;
  }

  truncateContent(content, maxLength) {
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '... [truncated]';
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.pricing[model] || this.pricing['gpt-3.5-turbo'];
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  async markKnowledgeAsUsed(contextItems) {
    try {
      const knowledgeIds = contextItems
        .filter(item => item.type === 'knowledge')
        .map(item => item.reference);
      
      if (knowledgeIds.length > 0) {
        await KnowledgeBase.updateMany(
          { _id: { $in: knowledgeIds } },
          { 
            $inc: { 'usage.usedInAI': 1 },
            $set: { 'usage.lastUsedInAI': new Date() }
          }
        );
      }
    } catch (error) {
      console.error('Error marking knowledge as used:', error);
    }
  }

  async validateApiKey(apiKey) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return { valid: true };
    } catch (error) {
      if (error.response?.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: 'Unable to validate API key' };
    }
  }

  async getModelInfo(apiKey) {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const models = response.data.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          owned_by: model.owned_by,
          created: model.created
        }));
      
      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  async estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  async optimizePrompt(prompt, maxTokens) {
    if (await this.estimateTokens(prompt) <= maxTokens) {
      return prompt;
    }
    
    // Simple truncation strategy - in production, use more sophisticated methods
    const targetLength = maxTokens * 4 * 0.9; // Leave some buffer
    return prompt.substring(0, targetLength) + '... [truncated for length]';
  }
}

module.exports = new AIService();