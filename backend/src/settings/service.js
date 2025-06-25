const User = require('../auth/model');

class SettingsService {
    async getUserSettings(userId) {
        const user = await User.findById(userId).select('settings');

        // Return default settings if none exist
        const defaultSettings = {
            preferences: {
                theme: 'dark',
                language: 'javascript',
                fontSize: 14,
                autoSave: true,
                notifications: true,
                tabSize: 2,
                wordWrap: true
            },
            apiKeys: {
                openai: ''
            },
            privacy: {
                profilePublic: true,
                showEmail: false,
                allowInvites: true
            }
        };

        return user?.settings || defaultSettings;
    }

    async updateUserSettings(userId, newSettings) {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { settings: newSettings } },
            { new: true, runValidators: true }
        ).select('settings');

        if (!user) {
            throw new Error('User not found');
        }

        return user.settings;
    }
}

module.exports = new SettingsService();