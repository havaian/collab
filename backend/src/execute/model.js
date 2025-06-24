// src/execute/model.js
const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
    executionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        maxLength: 100000 // 100KB limit
    },
    language: {
        type: String,
        required: true
    },
    languageId: {
        type: Number,
        required: true
    },
    stdin: {
        type: String,
        default: '',
        maxLength: 10000
    },
    output: {
        stdout: String,
        stderr: String,
        compile_output: String,
        message: String,
        status: {
            id: Number,
            description: String
        },
        time: String,
        memory: String,
        token: String
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'timeout'],
        default: 'pending'
    },
    judge0Token: {
        type: String,
        required: true
    },
    executionTime: {
        type: Number, // in milliseconds
        default: 0
    },
    error: {
        type: String,
        default: null
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for better performance
executionSchema.index({ userId: 1, createdAt: -1 });
executionSchema.index({ projectId: 1, createdAt: -1 });
executionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Execution', executionSchema);