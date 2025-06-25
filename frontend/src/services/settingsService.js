// services/settingsService.js
import apiService from './apiService';

class SettingsService {
  constructor() {
    this.apiKeyStorage = 'api_keys';
  }

  async getSettings() {
    const response = await apiService.get('/settings');
    return response.data;
  }

  async updateSettings(settings) {
    const response = await apiService.put('/settings', settings);
    return response.data;
  }

  // Store API keys separately in localStorage (encrypted)
  saveApiKey(provider, key) {
    const apiKeys = this.getApiKeys();
    apiKeys[provider] = this.encryptKey(key);
    localStorage.setItem(this.apiKeyStorage, JSON.stringify(apiKeys));
  }

  getApiKeys() {
    const stored = localStorage.getItem(this.apiKeyStorage);
    if (!stored) return {};

    const keys = JSON.parse(stored);
    // Decrypt keys when retrieving
    Object.keys(keys).forEach(provider => {
      keys[provider] = this.decryptKey(keys[provider]);
    });
    return keys;
  }

  // Simple client-side encryption (not secure against determined attackers)
  encryptKey(key) {
    return btoa(key); // Base64 encoding - replace with better encryption
  }

  decryptKey(encryptedKey) {
    return atob(encryptedKey);
  }
}

export default new SettingsService();