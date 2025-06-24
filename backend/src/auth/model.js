// src/auth/model.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    githubId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    avatar: {
        type: String,
        default: ''
    },
    accessToken: {
        type: String,
        // Will be encrypted before saving
    },
    refreshToken: {
        type: String,
        // Will be encrypted before saving
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    settings: {
        theme: {
            type: String,
            default: 'oceanic-next'
        },
        language: {
            type: String,
            default: 'javascript'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    bio: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 100 },
    website: { type: String, maxlength: 200 }
}, {
    timestamps: true
});

// Encrypt sensitive fields before saving
userSchema.pre('save', function (next) {
    if (this.isModified('accessToken') && this.accessToken) {
        this.accessToken = encrypt(this.accessToken);
    }
    if (this.isModified('refreshToken') && this.refreshToken) {
        this.refreshToken = encrypt(this.refreshToken);
    }
    next();
});

// Method to decrypt access token
userSchema.methods.getDecryptedAccessToken = function () {
    return this.accessToken ? decrypt(this.accessToken) : null;
};

// Update last active timestamp
userSchema.methods.updateActivity = function () {
    this.lastActive = new Date();
    return this.save();
};

function encrypt(text) {
    if (!text) return text;
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipher(algorithm, key);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

module.exports = mongoose.model('User', userSchema);