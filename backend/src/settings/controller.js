// src/settings/controller.js
const Settings = require('./model');
const crypto = require('crypto');

class SettingsController {
    async getSettings(req, res) {
        try {
            let settings = await Settings.findOne({ userId: req.user.id });
            if (!settings) {
                settings = new Settings({ userId: req.user.id });
                await settings.save();
            }

            // Don't send encrypted API keys
            const settingsObj = settings.toObject();
            if (settingsObj.apiKeys.openai) {
                settingsObj.apiKeys.openai = '***hidden***';
            }

            res.json({ success: true, data: settingsObj });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const updates = req.body;

            // Encrypt API keys if provided
            if (updates.apiKeys?.openai && updates.apiKeys.openai !== '***hidden***') {
                const cipher = crypto.createCipher('aes256', process.env.ENCRYPTION_KEY);
                updates.apiKeys.openai = cipher.update(updates.apiKeys.openai, 'utf8', 'hex') + cipher.final('hex');
            }

            const settings = await Settings.findOneAndUpdate(
                { userId: req.user.id },
                { $set: updates, updatedAt: new Date() },
                { new: true, upsert: true }
            );

            res.json({ success: true, data: settings });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new SettingsController();