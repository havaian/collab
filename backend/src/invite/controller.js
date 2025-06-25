const inviteService = require('./service');

class InviteController {
    async createInvite(req, res) {
        try {
            const { projectId, email, role = 'collaborator', message } = req.body;
            const invite = await inviteService.createInvite(
                projectId,
                req.user.id,
                email,
                role,
                message
            );
            res.status(201).json({ success: true, data: invite });
        } catch (error) {
            console.error('Failed to create invite:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async getUserInvites(req, res) {
        try {
            const invites = await inviteService.getUserInvites(req.user.email);

            // Fix: Ensure we always return an array, even if empty
            res.json({
                success: true,
                data: invites || [] // Frontend expects an array
            });
        } catch (error) {
            console.error('Failed to get user invites:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                data: [] // Return empty array on error
            });
        }
    }

    async getInvites(req, res) {
        try {
            const { projectId } = req.params;
            const invites = await inviteService.getProjectInvites(projectId, req.user.id);
            res.json({ success: true, data: invites || [] });
        } catch (error) {
            console.error('Failed to get project invites:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                data: []
            });
        }
    }

    async acceptInvite(req, res) {
        try {
            const { token } = req.params;
            const result = await inviteService.acceptInvite(token, req.user.id);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Failed to accept invite:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async declineInvite(req, res) {
        try {
            const { token } = req.params;
            await inviteService.declineInvite(token);
            res.json({ success: true, message: 'Invite declined' });
        } catch (error) {
            console.error('Failed to decline invite:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async deleteInvite(req, res) {
        try {
            const { inviteId } = req.params;
            await inviteService.deleteInvite(inviteId, req.user.id);
            res.json({ success: true, message: 'Invite deleted' });
        } catch (error) {
            console.error('Failed to delete invite:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
}

module.exports = new InviteController();