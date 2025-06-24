// src/auth/service.js
const jwt = require('jsonwebtoken');
const User = require('./model');

class AuthService {
    async findOrCreateUser(githubProfile, accessToken) {
        try {
            let user = await User.findOne({ githubId: githubProfile.id });

            if (user) {
                // Update existing user
                user.username = githubProfile.username;
                user.email = githubProfile.emails?.[0]?.value || user.email;
                user.avatar = githubProfile.photos?.[0]?.value || user.avatar;
                user.accessToken = accessToken;
                await user.updateActivity();
            } else {
                // Create new user
                user = new User({
                    githubId: githubProfile.id,
                    username: githubProfile.username,
                    email: githubProfile.emails?.[0]?.value,
                    avatar: githubProfile.photos?.[0]?.value,
                    accessToken: accessToken
                });
                await user.save();
            }

            return user;
        } catch (error) {
            throw new Error(`User creation/update failed: ${error.message}`);
        }
    }

    generateJWT(user) {
        const payload = {
            id: user._id,
            githubId: user.githubId,
            username: user.username
        };

        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
    }

    verifyJWT(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async getUserById(id) {
        return await User.findById(id).select('-accessToken -refreshToken');
    }

    async updateUserSettings(userId, settings) {
        return await User.findByIdAndUpdate(
            userId,
            { $set: { settings } },
            { new: true, runValidators: true }
        ).select('-accessToken -refreshToken');
    }
}

module.exports = new AuthService();