// src/github/route.js
const express = require('express');
const router = express.Router();
const githubController = require('./controller');

router.get('/repositories', githubController.getRepositories);
router.post('/sync', githubController.syncRepository);
router.post('/import', githubController.importRepository);

module.exports = router;