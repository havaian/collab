const Invite = require('./model');
const Project = require('../project/model');
const User = require('../auth/model');
const crypto = require('crypto');

class InviteService {
    async createInvite(projectId, invitedById, email, role = 'collaborator', message = '') {
        // Check if project exists and user has permission
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== invitedById) {
            throw new Error('Only project owner can send invites');
        }

        // Check if invite already exists
        const existingInvite = await Invite.findOne({
            projectId,
            email,
            status: 'pending'
        });

        if (existingInvite) {
            throw new Error('Invite already sent to this email');
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');

        const invite = new Invite({
            projectId,
            invitedBy: invitedById,
            email,
            role,
            message,
            token,
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        await invite.save();

        // Populate project and inviter info
        await invite.populate([
            { path: 'projectId', select: 'name description' },
            { path: 'invitedBy', select: 'username email' }
        ]);

        return invite;
    }

    async getUserInvites(userEmail) {
        const invites = await Invite.find({
            email: userEmail,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate([
            { path: 'projectId', select: 'name description' },
            { path: 'invitedBy', select: 'username email' }
        ]).sort({ createdAt: -1 });

        return invites;
    }

    async getProjectInvites(projectId, userId) {
        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId) {
            throw new Error('Access denied');
        }

        const invites = await Invite.find({ projectId })
            .populate([
                { path: 'invitedBy', select: 'username email' }
            ])
            .sort({ createdAt: -1 });

        return invites;
    }

    async acceptInvite(token, userId) {
        const invite = await Invite.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('projectId');

        if (!invite) {
            throw new Error('Invalid or expired invite');
        }

        // Add user to project collaborators
        const project = await Project.findById(invite.projectId._id);
        if (!project) {
            throw new Error('Project not found');
        }

        // Check if user is already a collaborator
        if (!project.collaborators.includes(userId)) {
            project.collaborators.push(userId);
            await project.save();
        }

        // Update invite status
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();

        return { project: project._id, role: invite.role };
    }

    async declineInvite(token) {
        const invite = await Invite.findOne({
            token,
            status: 'pending'
        });

        if (!invite) {
            throw new Error('Invite not found');
        }

        invite.status = 'declined';
        invite.respondedAt = new Date();
        await invite.save();

        return invite;
    }

    async deleteInvite(inviteId, userId) {
        const invite = await Invite.findById(inviteId).populate('projectId');

        if (!invite) {
            throw new Error('Invite not found');
        }

        // Check if user has permission to delete
        if (invite.projectId.owner.toString() !== userId && invite.invitedBy.toString() !== userId) {
            throw new Error('Access denied');
        }

        await Invite.findByIdAndDelete(inviteId);
        return true;
    }
}

module.exports = new InviteService();