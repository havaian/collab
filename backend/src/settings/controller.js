const settingsService = require('./service');

class SettingsController {
    async getSettings(req, res) {
        try {
            const settings = await settingsService.getUserSettings(req.user.id);

            // Fix: Ensure we return the exact structure the frontend expects
            res.json({
                success: true,
                data: settings // Frontend expects response.data directly
            });
        } catch (error) {
            console.error('Failed to get settings:', error);

            // Return default settings structure on error
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

            res.status(500).json({
                success: false,
                error: error.message,
                data: defaultSettings
            });
        }
    }

    async updateSettings(req, res) {
        try {
            const settings = await settingsService.updateUserSettings(req.user.id, req.body);
            res.json({ success: true, data: settings });
        } catch (error) {
            console.error('Failed to update settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new SettingsController();