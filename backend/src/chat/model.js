// src/chat/model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    type: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.type === 'user';
        }
    },
    content: {
        type: String,
        required: true,
        maxLength: 10000
    },
    context: [{
        type: {
            type: String,
            enum: ['file', 'code', 'error', 'execution']
        },
        data: mongoose.Schema.Types.Mixed
    }],
    timestamp: {
        type: Date,
        default: Date.now
    },
    edited: {
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: Date,
        originalContent: String
    },
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        emoji: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    threadId: {
        type: String,
        default: null
    },
    metadata: {
        model: String, // AI model used for assistant messages
        tokens: Number, // Token count for AI messages
        processingTime: Number, // Time taken to generate response
        confidence: Number // AI confidence score
    }
});

const chatSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        unique: true,
        index: true
    },
    messages: [messageSchema],
    settings: {
        aiEnabled: {
            type: Boolean,
            default: true
        },
        aiModel: {
            type: String,
            default: 'gpt-4'
        },
        autoResponse: {
            type: Boolean,
            default: true
        },
        contextWindow: {
            type: Number,
            default: 10 // Number of previous messages to include in AI context
        }
    },
    stats: {
        totalMessages: {
            type: Number,
            default: 0
        },
        aiMessages: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    }
}, {
    timestamps: true
});

// Index for better performance
chatSchema.index({ 'messages.timestamp': -1 });
chatSchema.index({ 'messages.type': 1 });

// Update stats when messages are added
chatSchema.pre('save', function (next) {
    if (this.isModified('messages')) {
        this.stats.totalMessages = this.messages.length;
        this.stats.aiMessages = this.messages.filter(m => m.type === 'assistant').length;
        this.stats.lastActivity = new Date();
    }
    next();
});

// Method to add message
chatSchema.methods.addMessage = function (messageData) {
    const message = {
        id: new mongoose.Types.ObjectId().toString(),
        ...messageData,
        timestamp: new Date()
    };

    this.messages.push(message);
    return this.save().then(() => message);
};

// Method to get recent messages for AI context
chatSchema.methods.getContextMessages = function (limit) {
    return this.messages
        .slice(-limit)
        .filter(m => m.type !== 'system')
        .map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
            context: m.context
        }));
};

module.exports = mongoose.model('Chat', chatSchema);