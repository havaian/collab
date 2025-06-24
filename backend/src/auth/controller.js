// backend/src/auth/controller.js
const authService = require('./service');

class AuthController {
    async githubCallback(req, res) {
        try {
            if (!req.user) {
                return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=auth_failed`);
            }

            const token = authService.generateJWT(req.user);

            // Redirect to frontend callback route with token - NOT to root
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
        } catch (error) {
            console.error('GitHub callback error:', error);
            res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=auth_failed`);
        }
    }

    async getCurrentUser(req, res) {
        try {
            const user = await authService.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    settings: user.settings,
                    lastActive: user.lastActive
                }
            });
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({ error: 'Failed to fetch user data' });
        }
    }

    async updateSettings(req, res) {
        try {
            const { settings } = req.body;
            const user = await authService.updateUserSettings(req.user.id, settings);

            res.json({ user });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(400).json({ error: 'Failed to update settings' });
        }
    }

    async logout(req, res) {
        try {
            req.logout((err) => {
                if (err) {
                    console.error('Logout error:', err);
                    return res.status(500).json({ error: 'Logout failed' });
                }
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destruction error:', err);
                        return res.status(500).json({ error: 'Session destruction failed' });
                    }
                    res.clearCookie('connect.sid');
                    res.json({ message: 'Logged out successfully' });
                });
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }
}

module.exports = new AuthController();