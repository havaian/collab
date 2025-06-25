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
    email: {
        type: String,
        required: true,
        lowercase: true
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
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    expiresAt: {
        type: Date,
        required: true
    },
    acceptedAt: Date,
    respondedAt: Date
}, {
    timestamps: true
});

// Index for efficient queries
inviteSchema.index({ email: 1, status: 1 });
inviteSchema.index({ projectId: 1 });
inviteSchema.index({ token: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invite', inviteSchema);