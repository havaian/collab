// src/components/settings/SettingsPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import settingsService from '../../services/settingsService';
import Button from '../shared/Button';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        preferences: {
            theme: 'dark',
            language: 'javascript',
            fontSize: 14,
            autoSave: true,
            notifications: true
        },
        apiKeys: {
            openai: ''
        },
        privacy: {
            profilePublic: true,
            showEmail: false
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await settingsService.getSettings();
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await settingsService.updateSettings(settings);
            // Success feedback
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (path, value) => {
        const keys = path.split('.');
        const newSettings = { ...settings };
        let current = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        setSettings(newSettings);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">Settings</h1>

            {/* Preferences */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Preferences</h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Theme</label>
                        <select
                            value={settings.preferences.theme}
                            onChange={(e) => updateSetting('preferences.theme', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Default Language</label>
                        <select
                            value={settings.preferences.language}
                            onChange={(e) => updateSetting('preferences.language', e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Font Size</label>
                        <input
                            type="number"
                            min="10"
                            max="24"
                            value={settings.preferences.fontSize}
                            onChange={(e) => updateSetting('preferences.fontSize', parseInt(e.target.value))}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.preferences.autoSave}
                            onChange={(e) => updateSetting('preferences.autoSave', e.target.checked)}
                            className="mr-2"
                        />
                        Auto-save files
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.preferences.notifications}
                            onChange={(e) => updateSetting('preferences.notifications', e.target.checked)}
                            className="mr-2"
                        />
                        Enable notifications
                    </label>
                </div>
            </div>

            {/* API Keys */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">API Keys</h2>
                <div>
                    <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
                    <input
                        type="password"
                        value={settings.apiKeys.openai}
                        onChange={(e) => updateSetting('apiKeys.openai', e.target.value)}
                        placeholder="sk-..."
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
            </div>

            {/* Privacy */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Privacy</h2>
                <div className="space-y-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.privacy.profilePublic}
                            onChange={(e) => updateSetting('privacy.profilePublic', e.target.checked)}
                            className="mr-2"
                        />
                        Make profile public
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={settings.privacy.showEmail}
                            onChange={(e) => updateSetting('privacy.showEmail', e.target.checked)}
                            className="mr-2"
                        />
                        Show email on profile
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t">
                <Button onClick={saveSettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default SettingsPage;