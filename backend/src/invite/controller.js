// src/invite/controller.js
const Invite = require('./model');
const Project = require('../project/model');
const User = require('../auth/model');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

class InviteController {
    async createInvite(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { projectId, email, role = 'collaborator' } = req.body;

            // Check if user owns project
            const project = await Project.findOne({ _id: projectId, owner: req.user.id });
            if (!project) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Check if already invited
            const existingInvite = await Invite.findOne({
                projectId,
                email,
                status: 'pending'
            });

            if (existingInvite) {
                return res.status(400).json({ success: false, error: 'User already invited' });
            }

            // Check if user is already a collaborator
            const invitedUser = await User.findOne({ email });
            if (invitedUser && project.collaborators.includes(invitedUser._id)) {
                return res.status(400).json({ success: false, error: 'User is already a collaborator' });
            }

            // Generate invite token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const invite = new Invite({
                projectId,
                invitedBy: req.user.id,
                email,
                invitedUser: invitedUser?._id,
                token,
                role,
                expiresAt
            });

            await invite.save();
            await invite.populate(['projectId', 'invitedBy']);

            res.json({ success: true, data: invite });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getInvites(req, res) {
        try {
            const { projectId } = req.params;

            const project = await Project.findOne({ _id: projectId, owner: req.user.id });
            if (!project) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            const invites = await Invite.find({ projectId })
                .populate('invitedBy', 'username avatar')
                .populate('invitedUser', 'username avatar')
                .sort({ createdAt: -1 });

            res.json({ success: true, data: invites });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async acceptInvite(req, res) {
        try {
            const { token } = req.params;

            const invite = await Invite.findOne({
                token,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            }).populate('projectId');

            if (!invite) {
                return res.status(404).json({ success: false, error: 'Invalid or expired invite' });
            }

            // Check if current user's email matches invite
            if (req.user.email !== invite.email) {
                return res.status(403).json({ success: false, error: 'This invite is not for you' });
            }

            // Add user to project
            await Project.findByIdAndUpdate(invite.projectId._id, {
                $addToSet: { collaborators: req.user.id }
            });

            // Update invite status
            invite.status = 'accepted';
            invite.acceptedAt = new Date();
            await invite.save();

            res.json({ success: true, data: { project: invite.projectId } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async declineInvite(req, res) {
        try {
            const { token } = req.params;

            const invite = await Invite.findOne({
                token,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });

            if (!invite) {
                return res.status(404).json({ success: false, error: 'Invalid or expired invite' });
            }

            if (req.user.email !== invite.email) {
                return res.status(403).json({ success: false, error: 'This invite is not for you' });
            }

            invite.status = 'declined';
            await invite.save();

            res.json({ success: true, message: 'Invite declined' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async deleteInvite(req, res) {
        try {
            const { inviteId } = req.params;

            const invite = await Invite.findById(inviteId).populate('projectId');
            if (!invite) {
                return res.status(404).json({ success: false, error: 'Invite not found' });
            }

            // Check if user owns the project
            if (invite.projectId.owner.toString() !== req.user.id) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            await Invite.findByIdAndDelete(inviteId);
            res.json({ success: true, message: 'Invite deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getUserInvites(req, res) {
        try {
            const invites = await Invite.find({
                email: req.user.email,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            })
                .populate('projectId', 'name description')
                .populate('invitedBy', 'username avatar')
                .sort({ createdAt: -1 });

            res.json({ success: true, data: invites });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new InviteController();