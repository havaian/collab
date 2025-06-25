// src/components/settings/SettingsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import settingsService from '../../services/settingsService';
import Header from '../shared/Header';
import Button from '../shared/Button';
import {
    Cog6ToothIcon,
    PaintBrushIcon,
    CodeBracketIcon,
    BellIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    KeyIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [settings, setSettings] = useState({
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
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await settingsService.getSettings();
            // Fix: Safely handle the response structure with fallbacks
            const settingsData = response || {
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
            setSettings(settingsData);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error('Failed to load settings');
            // Set default settings on error
            setSettings({
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
            });
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await settingsService.updateSettings(settings);
            setHasUnsavedChanges(false);
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
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
        setHasUnsavedChanges(true);
    };

    const resetToDefaults = () => {
        if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            setSettings({
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
            });
            setHasUnsavedChanges(true);
        }
    };

    if (loading) {
        return (
            <>
                <Header
                    title="Settings"
                    showBackButton={true}
                    backPath="/"
                />
                <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Loading your settings...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="Settings"
                subtitle="Customize your experience"
                showBackButton={true}
                backPath="/"
                actions={[
                    <Button
                        key="save"
                        onClick={saveSettings}
                        disabled={saving || !hasUnsavedChanges}
                        className={`flex items-center space-x-2 ${hasUnsavedChanges ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                    >
                        <CheckIcon className="h-4 w-4" />
                        <span className="text-sm">
                            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                        </span>
                    </Button>
                ]}
            />

            <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="space-y-8">

                        {/* Unsaved Changes Warning */}
                        {hasUnsavedChanges && (
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex items-center space-x-3">
                                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                                <p className="text-yellow-800 text-sm">
                                    You have unsaved changes. Don't forget to save your settings.
                                </p>
                            </div>
                        )}

                        {/* Editor Preferences */}
                        <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <CodeBracketIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Editor Preferences</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                                    <select
                                        value={settings.preferences.theme}
                                        onChange={(e) => updateSetting('preferences.theme', e.target.value)}
                                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="vs-dark">VS Dark</option>
                                        <option value="monokai">Monokai</option>
                                        <option value="oceanic-next">Oceanic Next</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
                                    <select
                                        value={settings.preferences.language}
                                        onChange={(e) => updateSetting('preferences.language', e.target.value)}
                                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="csharp">C#</option>
                                        <option value="php">PHP</option>
                                        <option value="ruby">Ruby</option>
                                        <option value="go">Go</option>
                                        <option value="rust">Rust</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="24"
                                        value={settings.preferences.fontSize}
                                        onChange={(e) => updateSetting('preferences.fontSize', parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>10px</span>
                                        <span className="font-medium">{settings.preferences.fontSize}px</span>
                                        <span>24px</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tab Size</label>
                                    <select
                                        value={settings.preferences.tabSize}
                                        onChange={(e) => updateSetting('preferences.tabSize', parseInt(e.target.value))}
                                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value={2}>2 spaces</option>
                                        <option value={4}>4 spaces</option>
                                        <option value={8}>8 spaces</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.preferences.autoSave}
                                        onChange={(e) => updateSetting('preferences.autoSave', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Enable auto-save</span>
                                </label>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.preferences.wordWrap}
                                        onChange={(e) => updateSetting('preferences.wordWrap', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Enable word wrap</span>
                                </label>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.preferences.notifications}
                                        onChange={(e) => updateSetting('preferences.notifications', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Enable notifications</span>
                                </label>
                            </div>
                        </div>

                        {/* API Keys */}
                        <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <KeyIcon className="h-6 w-6 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            value={settings.apiKeys.openai}
                                            onChange={(e) => updateSetting('apiKeys.openai', e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showApiKey ? (
                                                <EyeSlashIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Your API key is encrypted and stored securely. It's used for AI-powered features.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Settings */}
                        <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="bg-green-100 p-2 rounded-lg">
                                    <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Privacy</h2>
                            </div>

                            <div className="space-y-4">
                                <label className="flex flex-row-reverse text-left items-start justify-between space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.profilePublic}
                                        onChange={(e) => updateSetting('privacy.profilePublic', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-700 font-medium">Make profile public</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Allow other users to view your profile and projects
                                        </p>
                                    </div>
                                </label>

                                <label className="flex flex-row-reverse text-left items-start justify-between space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.showEmail}
                                        onChange={(e) => updateSetting('privacy.showEmail', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-700 font-medium">Show email on profile</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Display your email address on your public profile
                                        </p>
                                    </div>
                                </label>

                                <label className="flex flex-row-reverse text-left items-start justify-between space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.privacy.allowInvites}
                                        onChange={(e) => updateSetting('privacy.allowInvites', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-700 font-medium">Allow project invitations</span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Let other users invite you to collaborate on projects
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="bg-yellow-100 p-2 rounded-lg">
                                            <ArrowPathIcon className="h-6 w-6 text-yellow-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-gray-900">Reset Settings</h2>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Reset all settings to their default values
                                    </p>
                                </div>
                                <Button
                                    onClick={resetToDefaults}
                                    variant="ghost"
                                    className="border-2 border-red-300 text-red-600 hover:border-red-400"
                                >
                                    Reset to Defaults
                                </Button>
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className="flex justify-end space-x-4 pt-6">
                            <Button
                                onClick={() => navigate('/')}
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={saveSettings}
                                disabled={saving || !hasUnsavedChanges}
                                className={`flex items-center space-x-2 ${hasUnsavedChanges ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                            >
                                <CheckIcon className="h-4 w-4" />
                                <span>{saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;