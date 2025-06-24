// src/settings/model.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    preferences: {
        theme: { type: String, default: 'dark', enum: ['dark', 'light'] },
        language: { type: String, default: 'javascript' },
        fontSize: { type: Number, default: 14, min: 10, max: 24 },
        autoSave: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true }
    },
    apiKeys: {
        openai: { type: String, default: '' }
    },
    privacy: {
        profilePublic: { type: Boolean, default: true },
        showEmail: { type: Boolean, default: false }
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);