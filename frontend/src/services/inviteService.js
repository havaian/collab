import apiService from './apiService';

class InviteService {
    async createInvite(projectId, email, role = 'collaborator') {
        const response = await apiService.post('/invite', {
            projectId,
            email,
            role
        });
        return response.data;
    }

    async getProjectInvites(projectId) {
        const response = await apiService.get(`/invite/project/${projectId}`);
        return response.data;
    }

    async getUserInvites() {
        const response = await apiService.get('/invite/user');
        return response.data;
    }

    async acceptInvite(token) {
        const response = await apiService.post(`/invite/accept/${token}`);
        return response.data;
    }

    async declineInvite(token) {
        const response = await apiService.post(`/invite/decline/${token}`);
        return response.data;
    }

    async deleteInvite(inviteId) {
        const response = await apiService.delete(`/invite/${inviteId}`);
        return response.data;
    }
}

export default new InviteService();