// backend/src/invite/service.js
const Invite = require('./model');
const Project = require('../project/model');
const User = require('../auth/model');
const crypto = require('crypto');

class InviteService {
    /**
     * Generate a one-time invite link for a project
     * @param {string} projectId - Project ID
     * @param {string} invitedById - User ID of the inviter
     * @param {string} role - Role to assign (viewer, collaborator, admin)
     * @param {object} options - Additional options
     * @param {number} options.expiresInHours - Hours until expiration (default: 24)
     * @param {number} options.maxUses - Maximum number of uses (default: 1)
     * @param {string} options.message - Optional message for the invite
     * @returns {object} Generated invite link data
     */
    async generateInviteLink(projectId, invitedById, role = 'collaborator', options = {}) {
        try {
            // Verify project exists and user has permission
            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is owner or admin
            const isOwner = project.owner.toString() === invitedById;
            const isAdmin = project.collaborators.some(c =>
                c.user.toString() === invitedById && c.role === 'admin'
            );

            if (!isOwner && !isAdmin) {
                throw new Error('Only project owners and admins can generate invite links');
            }

            // Generate cryptographically secure token
            const token = crypto.randomBytes(32).toString('hex');

            // Set expiration time (default 24 hours)
            const expiresInHours = options.expiresInHours || 24;
            const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

            // Create invite record
            const invite = new Invite({
                projectId,
                invitedBy: invitedById,
                role,
                message: options.message || '',
                token,
                status: 'pending',
                expiresAt,
                maxUses: options.maxUses || 1,
                currentUses: 0,
                inviteType: 'link' // New field to distinguish from email invites
            });

            await invite.save();

            // Populate project info for response
            await invite.populate([
                { path: 'projectId', select: 'name description' },
                { path: 'invitedBy', select: 'username email' }
            ]);

            // Generate the actual invite link
            const baseUrl = process.env.FRONTEND_URL || 'https://collab.ytech.space';
            const inviteLink = `${baseUrl}/invite/${token}`;

            return {
                token,
                inviteLink,
                expiresAt,
                maxUses: invite.maxUses,
                currentUses: invite.currentUses,
                role,
                project: invite.projectId,
                invitedBy: invite.invitedBy,
                message: invite.message
            };

        } catch (error) {
            console.error('Generate invite link error:', error);
            throw error;
        }
    }

    /**
     * Validate and use an invite link
     * @param {string} token - Invite token from URL
     * @param {string} userId - User ID attempting to join
     * @returns {object} Join result with project info
     */
    async useInviteLink(token, userId) {
        try {
            // Find valid invite
            const invite = await Invite.findOne({
                token,
                status: 'pending',
                expiresAt: { $gt: new Date() },
                inviteType: 'link'
            }).populate(['projectId', 'invitedBy']);

            if (!invite) {
                throw new Error('Invalid or expired invite link');
            }

            // Check if max uses exceeded
            if (invite.maxUses && invite.currentUses >= invite.maxUses) {
                throw new Error('Invite link has been used maximum number of times');
            }

            // Get user info
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if user is already in project
            const project = await Project.findById(invite.projectId._id);
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is already owner or collaborator
            if (project.owner.toString() === userId) {
                throw new Error('You are already the owner of this project');
            }

            const existingCollaborator = project.collaborators.find(c =>
                c.user.toString() === userId
            );

            if (existingCollaborator) {
                throw new Error('You are already a collaborator on this project');
            }

            // Add user to project
            project.collaborators.push({
                user: userId,
                role: invite.role,
                addedAt: new Date()
            });

            await project.save();

            // Update invite usage
            invite.currentUses += 1;

            // If this was a single-use invite, mark as used
            if (invite.maxUses === 1) {
                invite.status = 'used';
                invite.usedAt = new Date();
                invite.usedBy = userId;
            }

            await invite.save();

            return {
                success: true,
                project: {
                    id: project._id,
                    name: project.name,
                    description: project.description
                },
                role: invite.role,
                invitedBy: invite.invitedBy,
                message: invite.message
            };

        } catch (error) {
            console.error('Use invite link error:', error);
            throw error;
        }
    }

    /**
     * Get invite link details without using it
     * @param {string} token - Invite token
     * @returns {object} Invite details
     */
    async getInviteLinkDetails(token) {
        try {
            const invite = await Invite.findOne({
                token,
                inviteType: 'link'
            }).populate([
                { path: 'projectId', select: 'name description' },
                { path: 'invitedBy', select: 'username avatar' }
            ]);

            if (!invite) {
                throw new Error('Invite link not found');
            }

            const now = new Date();
            const isExpired = invite.expiresAt < now;
            const isUsedUp = invite.maxUses && invite.currentUses >= invite.maxUses;
            const isValid = invite.status === 'pending' && !isExpired && !isUsedUp;

            return {
                valid: isValid,
                expired: isExpired,
                usedUp: isUsedUp,
                project: invite.projectId,
                invitedBy: invite.invitedBy,
                role: invite.role,
                message: invite.message,
                expiresAt: invite.expiresAt,
                currentUses: invite.currentUses,
                maxUses: invite.maxUses,
                createdAt: invite.createdAt
            };

        } catch (error) {
            console.error('Get invite link details error:', error);
            throw error;
        }
    }

    /**
     * Get all active invite links for a project
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID (must be owner or admin)
     * @returns {array} List of active invite links
     */
    async getProjectInviteLinks(projectId, userId) {
        try {
            // Verify user has permission
            const project = await Project.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            const isOwner = project.owner.toString() === userId;
            const isAdmin = project.collaborators.some(c =>
                c.user.toString() === userId && c.role === 'admin'
            );

            if (!isOwner && !isAdmin) {
                throw new Error('Access denied');
            }

            // Get active invite links
            const invites = await Invite.find({
                projectId,
                inviteType: 'link',
                status: 'pending',
                expiresAt: { $gt: new Date() }
            }).populate([
                { path: 'invitedBy', select: 'username avatar' }
            ]).sort({ createdAt: -1 });

            return invites.map(invite => ({
                id: invite._id,
                token: invite.token,
                role: invite.role,
                message: invite.message,
                expiresAt: invite.expiresAt,
                currentUses: invite.currentUses,
                maxUses: invite.maxUses,
                invitedBy: invite.invitedBy,
                createdAt: invite.createdAt,
                inviteLink: `${process.env.FRONTEND_URL || 'https://collab.ytech.space'}/invite/${invite.token}`
            }));

        } catch (error) {
            console.error('Get project invite links error:', error);
            throw error;
        }
    }

    /**
     * Revoke an invite link
     * @param {string} inviteId - Invite ID
     * @param {string} userId - User ID (must be owner or admin)
     * @returns {boolean} Success status
     */
    async revokeInviteLink(inviteId, userId) {
        try {
            const invite = await Invite.findById(inviteId).populate('projectId');

            if (!invite) {
                throw new Error('Invite not found');
            }

            // Check permission
            const project = invite.projectId;
            const isOwner = project.owner.toString() === userId;
            const isAdmin = project.collaborators.some(c =>
                c.user.toString() === userId && c.role === 'admin'
            );
            const isInviteCreator = invite.invitedBy.toString() === userId;

            if (!isOwner && !isAdmin && !isInviteCreator) {
                throw new Error('Access denied');
            }

            // Revoke the invite
            invite.status = 'revoked';
            invite.revokedAt = new Date();
            invite.revokedBy = userId;

            await invite.save();

            return true;

        } catch (error) {
            console.error('Revoke invite link error:', error);
            throw error;
        }
    }

    /**
     * Clean up expired invites (can be run as a cron job)
     * @returns {number} Number of cleaned up invites
     */
    async cleanupExpiredInvites() {
        try {
            const result = await Invite.updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lt: new Date() }
                },
                {
                    status: 'expired'
                }
            );

            return result.modifiedCount;

        } catch (error) {
            console.error('Cleanup expired invites error:', error);
            throw error;
        }
    }
}

module.exports = new InviteService();