// src/auth/middleware.js
const jwt = require('jsonwebtoken');
const authService = require('./service');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = authService.verifyJWT(token);

        const user = await authService.getUserById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            id: user._id,
            githubId: user.githubId,
            username: user.username
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authMiddleware };