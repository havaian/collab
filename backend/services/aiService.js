const axios = require('axios');
const KnowledgeBase = require('../models/KnowledgeBase');
const File = require('../models/File');

class AIService {
  constructor() {
    this.baseURL = 'https://api.openai.com/v1';
    this.maxTokens = {
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo-preview': 128000
    };
    this.pricing = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-32k': { input: 0.06, output: 0.12 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }
    };
  }

  /**
   * Send message to OpenAI and get response
   */
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
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      if (!this.isValidModel(model)) {
        throw new Error(`Invalid model: ${model}`);
      }

      // Build context if requested
      let contextMessages = [];
      let contextData = [];
      
      if (includeContext && projectId) {
        const contextResult = await this.buildContext(projectId, message);
        contextMessages = contextResult.messages;
        contextData = contextResult.data;
      }

      // Prepare messages array
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt(projectId, contextData)
        },
        ...contextMessages,
        ...previousMessages.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      // Optimize messages to fit token limit
      const optimizedMessages = await this.optimizeMessages(messages, model, maxTokens);

      // Call OpenAI API
      console.log(`Making OpenAI API call with model: ${model}`);
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages: optimizedMessages,
          temperature,
          max_tokens: Math.min(maxTokens, this.maxTokens[model] || 2000),
          user: userId?.toString(),
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minute timeout
        }
      );

      const completion = response.data;
      
      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      const assistantMessage = completion.choices[0].message.content;

      // Calculate cost
      const usage = completion.usage || {};
      const inputTokens = usage.prompt_tokens || 0;
      const outputTokens = usage.completion_tokens || 0;
      const cost = this.calculateCost(model, inputTokens, outputTokens);

      // Mark knowledge as used
      if (contextData.length > 0) {
        await this.markKnowledgeAsUsed(contextData);
      }

      const result = {
        message: assistantMessage,
        model,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: usage.total_tokens || (inputTokens + outputTokens)
        },
        cost,
        context: contextData.map(item => ({
          type: item.type,
          title: item.title,
          id: item.id
        }))
      };

      console.log(`OpenAI API call successful. Tokens used: ${result.usage.totalTokens}, Cost: $${cost.toFixed(6)}`);
      return result;

    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 401:
            throw new Error('Invalid OpenAI API key');
          case 429:
            throw new Error('OpenAI API rate limit exceeded. Please try again later.');
          case 400:
            throw new Error(data.error?.message || 'Invalid request to OpenAI API');
          case 500:
          case 502:
          case 503:
            throw new Error('OpenAI API is currently unavailable. Please try again later.');
          default:
            throw new Error(data.error?.message || 'OpenAI API Error');
        }
      }
      
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Build context from project knowledge and files
   */
  async buildContext(projectId, userMessage) {
    const contextData = [];
    const contextMessages = [];

    try {
      // Search relevant knowledge base items
      const knowledgeItems = await KnowledgeBase.find({
        projectId,
        $text: { $search: userMessage }
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(5);

      for (const item of knowledgeItems) {
        contextData.push({
          type: 'knowledge',
          id: item._id,
          title: item.title,
          content: item.content.substring(0, 1000), // Limit content length
          reference: item._id
        });
      }

      // Search relevant files
      const files = await File.find({
        projectId,
        $or: [
          { name: { $regex: userMessage, $options: 'i' } },
          { content: { $regex: userMessage, $options: 'i' } }
        ]
      })
      .limit(3);

      for (const file of files) {
        contextData.push({
          type: 'file',
          id: file._id,
          title: file.name,
          content: file.content.substring(0, 800), // Limit content length
          language: file.language,
          reference: file._id
        });
      }

      // Convert context data to messages
      if (contextData.length > 0) {
        let contextContent = "Here's relevant context from the project:\n\n";
        
        contextData.forEach((item, index) => {
          contextContent += `${index + 1}. **${item.title}** (${item.type}):\n`;
          contextContent += `${item.content}\n\n`;
        });

        contextMessages.push({
          role: 'system',
          content: contextContent
        });
      }

      return { messages: contextMessages, data: contextData };

    } catch (error) {
      console.error('Error building context:', error);
      return { messages: [], data: [] };
    }
  }

  /**
   * Generate system prompt
   */
  getSystemPrompt(projectId, contextData = []) {
    let prompt = `You are an AI assistant helping with a collaborative coding project. You have access to the project's knowledge base and files.

Key Guidelines:
- Provide helpful, accurate, and contextual responses
- When discussing code, be specific and provide examples
- If you reference project files or knowledge, mention them by name
- Be concise but thorough in your explanations
- Help with coding, debugging, architecture, and project management questions
- If you're not sure about something specific to this project, ask for clarification`;

    if (contextData.length > 0) {
      prompt += `\n\nYou have access to the following project context:
${contextData.map((item, index) => `${index + 1}. ${item.title} (${item.type})`).join('\n')}

Use this context to provide more relevant and specific answers.`;
    }

    return prompt;
  }

  /**
   * Calculate API usage cost
   */
  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.pricing[model];
    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Optimize messages to fit within token limits
   */
  async optimizeMessages(messages, model, maxResponseTokens) {
    const maxModelTokens = this.maxTokens[model] || 4096;
    const reservedTokens = maxResponseTokens + 200; // Buffer for response and system
    const availableTokens = maxModelTokens - reservedTokens;

    let totalTokens = 0;
    const optimizedMessages = [];

    // Start from the end (most recent messages) and work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = await this.estimateTokens(message.content);
      
      if (totalTokens + messageTokens > availableTokens) {
        // If this is a system message and we're at the limit, truncate it
        if (message.role === 'system') {
          const remainingTokens = availableTokens - totalTokens;
          if (remainingTokens > 100) { // Only include if we have reasonable space
            const truncatedContent = await this.truncateToTokens(message.content, remainingTokens);
            optimizedMessages.unshift({ ...message, content: truncatedContent });
          }
        }
        break;
      }
      
      totalTokens += messageTokens;
      optimizedMessages.unshift(message);
    }

    return optimizedMessages;
  }

  /**
   * Estimate token count for text
   */
  async estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is an approximation - for exact counting, you'd use tiktoken
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   */
  async truncateToTokens(text, maxTokens) {
    const maxChars = maxTokens * 4 * 0.9; // Leave some buffer
    
    if (text.length <= maxChars) {
      return text;
    }
    
    return text.substring(0, maxChars) + '\n\n[Content truncated to fit context window]';
  }

  /**
   * Mark knowledge base items as used
   */
  async markKnowledgeAsUsed(contextData) {
    try {
      const knowledgeIds = contextData
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

  /**
   * Validate OpenAI API key
   */
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

  /**
   * Get available models for the API key
   */
  async getAvailableModels(apiKey) {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.data.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          name: this.getModelDisplayName(model.id),
          contextWindow: this.maxTokens[model.id] || 4096,
          pricing: this.pricing[model.id]
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching models:', error);
      return this.getDefaultModels();
    }
  }

  /**
   * Get display name for model
   */
  getModelDisplayName(modelId) {
    const displayNames = {
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
      'gpt-4': 'GPT-4',
      'gpt-4-32k': 'GPT-4 32K',
      'gpt-4-turbo-preview': 'GPT-4 Turbo'
    };
    return displayNames[modelId] || modelId;
  }

  /**
   * Get default models when API call fails
   */
  getDefaultModels() {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 4096,
        pricing: this.pricing['gpt-3.5-turbo']
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        pricing: this.pricing['gpt-4']
      }
    ];
  }

  /**
   * Check if model is valid
   */
  isValidModel(model) {
    return Object.keys(this.maxTokens).includes(model);
  }

  /**
   * Stream response from OpenAI (for future implementation)
   */
  async streamMessage(options, onChunk, onComplete, onError) {
    // TODO: Implement streaming for real-time responses
    // This would use EventSource or similar for streaming responses
    console.log('Streaming not yet implemented');
    throw new Error('Streaming responses not yet implemented');
  }

  /**
   * Generate embeddings for text (for improved context search)
   */
  async generateEmbeddings(text, apiKey) {
    try {
      const response = await axios.post(
        `${this.baseURL}/embeddings`,
        {
          model: 'text-embedding-ada-002',
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return null;
    }
  }
}

module.exports = new AIService();