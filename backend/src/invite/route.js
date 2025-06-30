// backend/src/invite/route.js
const express = require('express');
const router = express.Router();
const inviteController = require('./controller');
const { requireAuth, requireProjectAccess } = require('../auth/middleware');

// New link-based invite routes
router.post('/generate', requireAuth, inviteController.generateInviteLink);
router.get('/:token/details', inviteController.getInviteLinkDetails); // Public endpoint
router.post('/:token/join', requireAuth, inviteController.joinViaInviteLink);
router.delete('/:inviteId', requireAuth, inviteController.revokeInviteLink);

// Project-specific invite management
router.get('/project/:projectId', requireAuth, inviteController.getProjectInviteLinks);

// Legacy email-based invite routes (for backward compatibility)
router.post('/', requireAuth, inviteController.createEmailInvite);
router.get('/user', requireAuth, inviteController.getUserInvites);
router.post('/:token/accept', requireAuth, inviteController.acceptEmailInvite);

// Admin/maintenance routes
router.post('/cleanup', requireAuth, inviteController.cleanupExpiredInvites);

module.exports = router;