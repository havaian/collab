// src/profile/route.js
const express = require('express');
const router = express.Router();
const profileController = require('./controller');

router.get('/public', profileController.getPublicProfiles);
router.get('/:userId?', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;