// backend/src/profile/controller.js
const User = require('../auth/model');
const Project = require('../project/model');

class ProfileController {
    async getProfile(req, res) {
        try {
            const userId = req.params.userId || req.user.id;

            const user = await User.findById(userId).select('-githubAccessToken -refreshToken');
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Get user's projects - populate the owner field to ensure it exists
            const projects = await Project.find({
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId }
                ]
            })
                .populate('owner', 'username') // Populate owner to ensure it exists
                .select('name description createdAt updatedAt settings isPublic owner')
                .sort({ updatedAt: -1 });

            // Calculate stats with safe property access
            const stats = {
                totalProjects: projects.filter(p => {
                    // Safe check for owner property
                    if (!p.owner) return false;
                    const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
                    return ownerId && ownerId.toString() === userId.toString();
                }).length,

                collaborations: projects.filter(p => {
                    // Safe check for owner property  
                    if (!p.owner) return false;
                    const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
                    return ownerId && ownerId.toString() !== userId.toString();
                }).length,

                contributions: projects.length // Total projects user is involved in
            };

            res.json({
                success: true,
                data: {
                    user,
                    projects: projects.slice(0, 10), // Limit to 10 recent projects
                    stats
                }
            });
        } catch (error) {
            console.error('Failed to get profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateProfile(req, res) {
        try {
            const { bio, location, website, displayName } = req.body;

            const user = await User.findByIdAndUpdate(
                req.user.id,
                {
                    $set: {
                        bio,
                        location,
                        website,
                        displayName
                    }
                },
                { new: true, runValidators: true }
            ).select('-githubAccessToken -refreshToken');

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            res.json({ success: true, data: user });
        } catch (error) {
            console.error('Failed to update profile:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getPublicProfiles(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;

            // Use a more flexible query that doesn't rely on nested settings
            const users = await User.find({
                $or: [
                    { 'settings.privacy.profilePublic': true },
                    { 'settings.privacy.profilePublic': { $exists: false } } // Default to public if not set
                ]
            })
                .select('username avatar bio location createdAt displayName')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await User.countDocuments({
                $or: [
                    { 'settings.privacy.profilePublic': true },
                    { 'settings.privacy.profilePublic': { $exists: false } }
                ]
            });

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
            console.error('Failed to get public profiles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ProfileController();