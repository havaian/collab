// src/project/model.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permissions: {
            type: String,
            enum: ['read', 'write', 'admin'],
            default: 'write'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    settings: {
        language: {
            type: String,
            default: 'javascript'
        },
        theme: {
            type: String,
            default: 'oceanic-next'
        },
        autoSave: {
            type: Boolean,
            default: true
        },
        tabSize: {
            type: Number,
            default: 2
        }
    },
    githubRepo: {
        url: String,
        branch: {
            type: String,
            default: 'main'
        },
        lastSync: Date,
        isConnected: {
            type: Boolean,
            default: false
        }
    },
    stats: {
        fileCount: {
            type: Number,
            default: 0
        },
        totalSize: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        executions: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes for better performance
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ isPublic: 1, createdAt: -1 });

// Virtual for total collaborators count
projectSchema.virtual('collaboratorCount').get(function () {
    return this.collaborators.length;
});

// Method to check if user has access
projectSchema.methods.hasAccess = function (userId, permission = 'read') {
    if (this.owner.toString() === userId.toString()) {
        return true;
    }

    if (this.isPublic && permission === 'read') {
        return true;
    }

    const collaborator = this.collaborators.find(
        c => c.user.toString() === userId.toString()
    );

    if (!collaborator) return false;

    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const userLevel = permissionLevels[collaborator.permissions];
    const requiredLevel = permissionLevels[permission];

    return userLevel >= requiredLevel;
};

// Method to add collaborator
projectSchema.methods.addCollaborator = function (userId, permissions = 'write') {
    const existing = this.collaborators.find(
        c => c.user.toString() === userId.toString()
    );

    if (existing) {
        existing.permissions = permissions;
    } else {
        this.collaborators.push({
            user: userId,
            permissions,
            joinedAt: new Date()
        });
    }

    return this.save();
};

// Method to remove collaborator
projectSchema.methods.removeCollaborator = function (userId) {
    this.collaborators = this.collaborators.filter(
        c => c.user.toString() !== userId.toString()
    );
    return this.save();
};

// Update activity timestamp
projectSchema.methods.updateActivity = function () {
    this.stats.lastActivity = new Date();
    return this.save();
};

module.exports = mongoose.model('Project', projectSchema);