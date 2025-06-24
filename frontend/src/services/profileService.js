import apiService from './apiService';

class ProfileService {
    async getProfile(userId = null) {
        const endpoint = userId ? `/profile/${userId}` : '/profile';
        const response = await apiService.get(endpoint);
        return response.data;
    }

    async updateProfile(profileData) {
        const response = await apiService.put('/profile', profileData);
        return response.data;
    }

    async getPublicProfiles(page = 1, limit = 20) {
        const response = await apiService.get('/profile/public', {
            params: { page, limit }
        });
        return response.data;
    }
}

export default new ProfileService();