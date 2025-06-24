// src/invite/model.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // if user exists
    token: { type: String, required: true, unique: true },
    role: { type: String, enum: ['collaborator', 'viewer'], default: 'collaborator' },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

inviteSchema.index({ token: 1 });
inviteSchema.index({ email: 1, projectId: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invite', inviteSchema);