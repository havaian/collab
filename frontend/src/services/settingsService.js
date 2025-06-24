import apiService from './apiService';

class SettingsService {
  async getSettings() {
    const response = await apiService.get('/settings');
    return response.data;
  }

  async updateSettings(settings) {
    const response = await apiService.put('/settings', settings);
    return response.data;
  }
}

export default new SettingsService();