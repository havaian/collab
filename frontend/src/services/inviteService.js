import apiService from './apiService';

class InviteService {
    // Generate invite link
    async generateInviteLink(projectId, options = {}) {
        const response = await fetch('/api/invites/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                projectId,
                ...options
            })
        });
        return response.json();
    }

    // Get invite details
    async getInviteDetails(token) {
        const response = await fetch(`/api/invites/${token}/details`);
        return response.json();
    }

    // Join via invite link
    async joinViaInvite(token) {
        const response = await fetch(`/api/invites/${token}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.json();
    }

    // Get project invite links
    async getProjectInviteLinks(projectId) {
        const response = await fetch(`/api/invites/project/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.json();
    }

    // Revoke invite link
    async revokeInviteLink(inviteId) {
        const response = await fetch(`/api/invites/${inviteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.json();
    }

    // Legacy email methods (keep for backward compatibility)
    async createInvite(projectId, email, role = 'collaborator') {
        const response = await apiService.post('/invites', {
            projectId,
            email,
            role
        });
        return response.data;
    }

    async getUserInvites() {
        const response = await apiService.get('/invites/user');
        return response.data;
    }

    async acceptInvite(token) {
        const response = await apiService.post(`/invites/${token}/accept`);
        return response.data;
    }

    async declineInvite(token) {
        const response = await apiService.post(`/invites/${token}/decline`);
        return response.data;
    }
}

export default new InviteService();