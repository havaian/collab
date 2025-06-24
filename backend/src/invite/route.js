// src/invite/route.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const inviteController = require('./controller');

const createInviteValidation = [
    body('projectId').isMongoId().withMessage('Valid project ID required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['collaborator', 'viewer']).withMessage('Invalid role')
];

router.post('/', createInviteValidation, inviteController.createInvite);
router.get('/user', inviteController.getUserInvites);
router.get('/project/:projectId', inviteController.getInvites);
router.post('/accept/:token', inviteController.acceptInvite);
router.post('/decline/:token', inviteController.declineInvite);
router.delete('/:inviteId', inviteController.deleteInvite);

module.exports = router;