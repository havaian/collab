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

// Optional auth middleware (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-accessToken -refreshToken');
            
            if (user) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

// Admin only middleware
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin access required' 
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Authorization error' 
        });
    }
};

module.exports = { 
    authMiddleware, 
    optionalAuth, 
    requireAdmin 
};