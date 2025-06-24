// src/chat/service.js
const Chat = require('./model');
const Project = require('../project/model');
const File = require('../file/model');
const OpenAI = require('openai');

class ChatService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.model = process.env.OPENAI_MODEL || 'gpt-4';
        this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 2000;
    }

    async getOrCreateChat(projectId) {
        let chat = await Chat.findOne({ projectId });

        if (!chat) {
            chat = new Chat({
                projectId,
                messages: [],
                settings: {
                    aiEnabled: true,
                    aiModel: this.model,
                    autoResponse: true,
                    contextWindow: 10
                }
            });
            await chat.save();
        }

        return chat;
    }

    async saveMessage(projectId, messageData) {
        const chat = await this.getOrCreateChat(projectId);
        return await chat.addMessage(messageData);
    }

    async getChatHistory(projectId, { limit = 50, before = null } = {}) {
        const chat = await Chat.findOne({ projectId })
            .populate('messages.author', 'username avatar');

        if (!chat) {
            return [];
        }

        let messages = chat.messages;

        if (before) {
            const beforeIndex = messages.findIndex(m => m.id === before);
            if (beforeIndex > 0) {
                messages = messages.slice(0, beforeIndex);
            }
        }

        return messages
            .slice(-limit)
            .map(m => ({
                id: m.id,
                type: m.type,
                content: m.content,
                author: m.author ? {
                    id: m.author._id,
                    username: m.author.username,
                    avatar: m.author.avatar
                } : null,
                context: m.context,
                timestamp: m.timestamp,
                reactions: m.reactions,
                metadata: m.metadata
            }));
    }

    async generateAIResponse(projectId, userMessage) {
        const startTime = Date.now();

        try {
            const chat = await this.getOrCreateChat(projectId);

            if (!chat.settings.aiEnabled) {
                throw new Error('AI responses are disabled for this project');
            }

            // Get project context
            const project = await Project.findById(projectId);
            const projectFiles = await File.find({
                projectId,
                isDeleted: false
            }).select('name path language content').limit(10);

            // Build conversation context
            const contextMessages = chat.getContextMessages(chat.settings.contextWindow);

            // Create system prompt with project context
            const systemPrompt = this.buildSystemPrompt(project, projectFiles, userMessage.context);

            // Prepare messages for OpenAI
            const messages = [
                { role: 'system', content: systemPrompt },
                ...contextMessages,
                { role: 'user', content: userMessage.content }
            ];

            // Call OpenAI API
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: this.maxTokens,
                temperature: 0.7,
                stream: false
            });

            const response = completion.choices[0].message.content;
            const processingTime = Date.now() - startTime;

            // Save AI response with metadata
            await this.saveMessage(projectId, {
                type: 'assistant',
                content: response,
                author: null,
                context: userMessage.context,
                metadata: {
                    model: this.model,
                    tokens: completion.usage.total_tokens,
                    processingTime,
                    confidence: this.calculateConfidence(completion)
                }
            });

            return response;

        } catch (error) {
            console.error('AI response generation failed:', error);

            // Return a helpful fallback response
            const fallbackResponse = this.getFallbackResponse(userMessage.content);

            await this.saveMessage(projectId, {
                type: 'assistant',
                content: fallbackResponse,
                author: null,
                context: userMessage.context,
                metadata: {
                    model: 'fallback',
                    processingTime: Date.now() - startTime,
                    error: error.message
                }
            });

            return fallbackResponse;
        }
    }

    buildSystemPrompt(project, files, context) {
        let prompt = `You are an AI coding assistant helping with the project "${project.name}".

Project Details:
- Language: ${project.settings.language}
- Description: ${project.description || 'No description provided'}

Available Files:
${files.map(f => `- ${f.name} (${f.language}): ${f.path}`).join('\n')}

Current Context:`;

        if (context && context.length > 0) {
            context.forEach(ctx => {
                switch (ctx.type) {
                    case 'file':
                        prompt += `\n- Working with file: ${ctx.data.name}`;
                        if (ctx.data.content) {
                            prompt += `\n  Content preview:\n\`\`\`${ctx.data.language}\n${ctx.data.content.substring(0, 500)}${ctx.data.content.length > 500 ? '...' : ''}\n\`\`\``;
                        }
                        break;
                    case 'code':
                        prompt += `\n- Code snippet:\n\`\`\`${ctx.data.language}\n${ctx.data.code}\n\`\`\``;
                        break;
                    case 'error':
                        prompt += `\n- Error occurred: ${ctx.data.message}`;
                        break;
                    case 'execution':
                        prompt += `\n- Code execution result: ${ctx.data.output}`;
                        break;
                }
            });
        }

        prompt += `

Instructions:
- Provide helpful, accurate coding assistance
- Use the project's primary language (${project.settings.language}) when suggesting code
- Be concise but thorough in explanations
- If you don't know something, say so clearly
- Always format code with proper syntax highlighting
- Consider the existing project structure and files when making suggestions

Remember: You're helping with collaborative coding, so be encouraging and constructive!`;

        return prompt;
    }

    calculateConfidence(completion) {
        // Simple confidence calculation based on finish_reason and choice ranking
        const choice = completion.choices[0];

        if (choice.finish_reason === 'stop') {
            return 0.9; // High confidence for complete responses
        } else if (choice.finish_reason === 'length') {
            return 0.7; // Medium confidence for truncated responses
        } else {
            return 0.5; // Lower confidence for other cases
        }
    }

    getFallbackResponse(userMessage) {
        const lowercaseMessage = userMessage.toLowerCase();

        if (lowercaseMessage.includes('error') || lowercaseMessage.includes('bug')) {
            return "I'm having trouble accessing my AI capabilities right now, but I'd be happy to help debug your issue! Can you share the specific error message and the code that's causing problems?";
        }

        if (lowercaseMessage.includes('help') || lowercaseMessage.includes('how')) {
            return "I'm currently experiencing some technical difficulties, but I'm still here to help! Could you provide more details about what you're trying to accomplish? You can also check the project files and documentation for guidance.";
        }

        if (lowercaseMessage.includes('code') || lowercaseMessage.includes('function')) {
            return "I'm temporarily unable to access my full AI features, but I can still assist! Please share your code and let me know what specific functionality you're looking for.";
        }

        return "I'm experiencing some technical issues with my AI capabilities at the moment. However, I'm still here to help! Could you rephrase your question or provide more specific details about what you need assistance with?";
    }

    async updateChatSettings(projectId, userId, settings) {
        const project = await Project.findById(projectId);
        if (!project || !project.hasAccess(userId, 'write')) {
            throw new Error('Access denied');
        }

        const chat = await this.getOrCreateChat(projectId);
        Object.assign(chat.settings, settings);
        await chat.save();

        return chat.settings;
    }

    async deleteMessage(projectId, userId, messageId) {
        const chat = await Chat.findOne({ projectId });
        if (!chat) {
            throw new Error('Chat not found');
        }

        const message = chat.messages.id(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user owns the message or has admin access
        const project = await Project.findById(projectId);
        const isOwner = message.author && message.author.toString() === userId;
        const isAdmin = project && project.hasAccess(userId, 'admin');

        if (!isOwner && !isAdmin) {
            throw new Error('Permission denied');
        }

        message.remove();
        await chat.save();

        return { message: 'Message deleted successfully' };
    }

    async editMessage(projectId, userId, messageId, newContent) {
        const chat = await Chat.findOne({ projectId });
        if (!chat) {
            throw new Error('Chat not found');
        }

        const message = chat.messages.id(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Only message author can edit (and only user messages)
        if (message.type !== 'user' || message.author.toString() !== userId) {
            throw new Error('Permission denied');
        }

        // Store original content
        message.edited = {
            isEdited: true,
            editedAt: new Date(),
            originalContent: message.content
        };

        message.content = newContent;
        await chat.save();

        return message;
    }

    async addReaction(projectId, userId, messageId, emoji) {
        const chat = await Chat.findOne({ projectId });
        if (!chat) {
            throw new Error('Chat not found');
        }

        const message = chat.messages.id(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
            r => r.userId.toString() !== userId
        );

        // Add new reaction
        message.reactions.push({
            userId,
            emoji,
            timestamp: new Date()
        });

        await chat.save();
        return message.reactions;
    }
}

module.exports = new ChatService();