// backend/src/invite/controller.js
const inviteService = require('./service');

class InviteController {

    /**
     * Generate a new invite link
     * POST /api/invites/generate
     */
    async generateInviteLink(req, res) {
        try {
            const {
                projectId,
                role = 'collaborator',
                expiresInHours = 24,
                maxUses = 1,
                message = ''
            } = req.body;

            // Validation
            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            if (expiresInHours < 1 || expiresInHours > 168) { // Max 1 week
                return res.status(400).json({
                    success: false,
                    error: 'Expiration must be between 1 and 168 hours'
                });
            }

            if (maxUses < 1 || maxUses > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Max uses must be between 1 and 100'
                });
            }

            const inviteData = await inviteService.generateInviteLink(
                projectId,
                req.user.id,
                role,
                { expiresInHours, maxUses, message }
            );

            res.status(201).json({
                success: true,
                data: inviteData
            });

        } catch (error) {
            console.error('Generate invite link error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get invite link details (for preview)
     * GET /api/invites/:token/details
     */
    async getInviteLinkDetails(req, res) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Invite token is required'
                });
            }

            const details = await inviteService.getInviteLinkDetails(token);

            res.json({
                success: true,
                data: details
            });

        } catch (error) {
            console.error('Get invite details error:', error);
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Use an invite link to join project
     * POST /api/invites/:token/join
     */
    async joinViaInviteLink(req, res) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Invite token is required'
                });
            }

            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const result = await inviteService.useInviteLink(token, req.user.id);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Join via invite link error:', error);

            // Return specific error codes for different scenarios
            let statusCode = 400;
            if (error.message.includes('expired')) statusCode = 410; // Gone
            if (error.message.includes('not found')) statusCode = 404;
            if (error.message.includes('already')) statusCode = 409; // Conflict

            res.status(statusCode).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all invite links for a project
     * GET /api/projects/:projectId/invites
     */
    async getProjectInviteLinks(req, res) {
        try {
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    error: 'Project ID is required'
                });
            }

            const inviteLinks = await inviteService.getProjectInviteLinks(
                projectId,
                req.user.id
            );

            res.json({
                success: true,
                data: inviteLinks
            });

        } catch (error) {
            console.error('Get project invite links error:', error);
            res.status(403).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Revoke an invite link
     * DELETE /api/invites/:inviteId
     */
    async revokeInviteLink(req, res) {
        try {
            const { inviteId } = req.params;

            if (!inviteId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invite ID is required'
                });
            }

            const success = await inviteService.revokeInviteLink(
                inviteId,
                req.user.id
            );

            res.json({
                success: true,
                data: { revoked: success }
            });

        } catch (error) {
            console.error('Revoke invite link error:', error);
            res.status(403).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Legacy endpoint for email-based invites (backward compatibility)
     * POST /api/invites
     */
    async createEmailInvite(req, res) {
        try {
            const { projectId, email, role = 'collaborator', message } = req.body;

            // This would use the old email-based service method
            // Keep this for backward compatibility if needed
            const invite = await inviteService.createEmailInvite(
                projectId,
                req.user.id,
                email,
                role,
                message
            );

            res.status(201).json({
                success: true,
                data: invite
            });

        } catch (error) {
            console.error('Create email invite error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get user's email invites (legacy)
     * GET /api/invites/user
     */
    async getUserInvites(req, res) {
        try {
            const invites = await inviteService.getUserEmailInvites(req.user.email);

            res.json({
                success: true,
                data: invites || []
            });

        } catch (error) {
            console.error('Get user invites error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                data: []
            });
        }
    }

    /**
     * Accept email invite (legacy)
     * POST /api/invites/:token/accept
     */
    async acceptEmailInvite(req, res) {
        try {
            const { token } = req.params;
            const result = await inviteService.acceptEmailInvite(token, req.user.id);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Accept email invite error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Cleanup expired invites (can be called by cron job)
     * POST /api/invites/cleanup
     */
    async cleanupExpiredInvites(req, res) {
        try {
            // This should be protected by admin middleware in production
            const cleanedCount = await inviteService.cleanupExpiredInvites();

            res.json({
                success: true,
                data: {
                    cleanedCount
                }
            });

        } catch (error) {
            console.error('Cleanup expired invites error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new InviteController();