// src/profile/controller.js
const User = require('../auth/model');
const Project = require('../project/model');

class ProfileController {
    async getProfile(req, res) {
        try {
            const userId = req.params.userId || req.user.id;
            const user = await User.findById(userId).select('-accessToken -refreshToken');

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const projects = await Project.find({
                $or: [
                    { owner: userId },
                    { collaborators: userId, isPublic: true }
                ]
            }).select('name description isPublic createdAt').limit(10);

            const stats = {
                totalProjects: await Project.countDocuments({ owner: userId }),
                collaborations: await Project.countDocuments({ collaborators: userId }),
                joinDate: user.createdAt
            };

            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        avatar: user.avatar,
                        bio: user.bio,
                        location: user.location,
                        website: user.website,
                        createdAt: user.createdAt
                    },
                    projects,
                    stats
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const { bio, location, website } = req.body;

            const user = await User.findByIdAndUpdate(
                req.user.id,
                {
                    $set: {
                        bio: bio?.trim(),
                        location: location?.trim(),
                        website: website?.trim()
                    }
                },
                { new: true }
            ).select('-accessToken -refreshToken');

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getPublicProfiles(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;

            const users = await User.find({})
                .select('username avatar bio location createdAt')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await User.countDocuments();

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ProfileController();