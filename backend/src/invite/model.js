// backend/src/invite/model.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // For backward compatibility with email invites
    email: {
        type: String,
        lowercase: true,
        required: function () {
            return this.inviteType === 'email';
        }
    },

    // New fields for link-based invites
    inviteType: {
        type: String,
        enum: ['email', 'link'],
        default: 'link'
    },

    role: {
        type: String,
        enum: ['viewer', 'collaborator', 'admin'],
        default: 'collaborator'
    },

    message: {
        type: String,
        maxlength: 500
    },

    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    status: {
        type: String,
        enum: ['pending', 'used', 'expired', 'revoked'],
        default: 'pending'
    },

    // Usage tracking for link invites
    maxUses: {
        type: Number,
        default: 1,
        min: 1,
        max: 100 // Reasonable limit
    },

    currentUses: {
        type: Number,
        default: 0,
        min: 0
    },

    // Expiration
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // Auto-delete expired documents
    },

    // Usage tracking
    usedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // For single-use compatibility
    usedAt: Date,

    // Revocation tracking
    revokedAt: Date,
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Legacy fields for email invites
    acceptedAt: Date,
    respondedAt: Date

}, {
    timestamps: true
});

// Indexes for efficient queries
inviteSchema.index({ email: 1, status: 1 }); // For email invites
inviteSchema.index({ projectId: 1, status: 1 });
inviteSchema.index({ token: 1 });
inviteSchema.index({ inviteType: 1, status: 1 });
inviteSchema.index({ expiresAt: 1 });

// Virtual for checking if invite is still valid
inviteSchema.virtual('isValid').get(function () {
    const now = new Date();
    return this.status === 'pending' &&
        this.expiresAt > now &&
        (!this.maxUses || this.currentUses < this.maxUses);
});

// Virtual for remaining uses
inviteSchema.virtual('remainingUses').get(function () {
    if (!this.maxUses) return Infinity;
    return Math.max(0, this.maxUses - this.currentUses);
});

// Pre-save middleware to validate usage limits
inviteSchema.pre('save', function (next) {
    // Ensure currentUses doesn't exceed maxUses
    if (this.maxUses && this.currentUses > this.maxUses) {
        return next(new Error('Current uses cannot exceed maximum uses'));
    }

    // Auto-expire if max uses reached
    if (this.maxUses && this.currentUses >= this.maxUses && this.status === 'pending') {
        this.status = 'used';
        this.usedAt = new Date();
    }

    next();
});

// Static method to find valid invites
inviteSchema.statics.findValidByToken = function (token) {
    return this.findOne({
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() }
    });
};

// Static method to cleanup expired invites
inviteSchema.statics.cleanupExpired = function () {
    return this.updateMany(
        {
            status: 'pending',
            expiresAt: { $lt: new Date() }
        },
        {
            status: 'expired'
        }
    );
};

// Instance method to check if invite can be used
inviteSchema.methods.canBeUsed = function () {
    const now = new Date();
    return this.status === 'pending' &&
        this.expiresAt > now &&
        (!this.maxUses || this.currentUses < this.maxUses);
};

// Instance method to use the invite
inviteSchema.methods.use = function (userId) {
    if (!this.canBeUsed()) {
        throw new Error('Invite cannot be used');
    }

    this.currentUses += 1;

    // Track who used it
    this.usedBy.push({
        user: userId,
        usedAt: new Date()
    });

    // If single use or max uses reached, mark as used
    if (this.maxUses === 1 || this.currentUses >= this.maxUses) {
        this.status = 'used';
        this.usedAt = new Date();
    }

    return this.save();
};

module.exports = mongoose.model('Invite', inviteSchema);