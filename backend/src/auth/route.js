// src/auth/route.js
const express = require('express');
const passport = require('passport');
const authController = require('./controller');
const { authMiddleware } = require('./middleware');

const router = express.Router();

// GitHub OAuth routes
router.get('/github',
    passport.authenticate('github', { scope: ['user:email', 'public_repo'] })
);

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: `${process.env.CLIENT_URL}?error=auth_failed` }),
    authController.githubCallback
);

// Protected routes
router.get('/user', authMiddleware, authController.getCurrentUser);
router.put('/settings', authMiddleware, authController.updateSettings);
router.post('/logout', authController.logout);

module.exports = router;