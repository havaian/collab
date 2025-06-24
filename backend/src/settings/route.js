// src/settings/route.js
const express = require('express');
const router = express.Router();
const settingsController = require('./controller');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;