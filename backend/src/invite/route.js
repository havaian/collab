// src/invite/route.js
const express = require('express');
const router = express.Router();
const inviteController = require('./controller');

router.post('/', inviteController.createInvite);
router.get('/user', inviteController.getUserInvites);
router.get('/project/:projectId', inviteController.getInvites);
router.post('/accept/:token', inviteController.acceptInvite);
router.post('/decline/:token', inviteController.declineInvite);
router.delete('/:inviteId', inviteController.deleteInvite);

module.exports = router;