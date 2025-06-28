// src/project/service.js
const Project = require('./model');
const User = require('../auth/model');

class ProjectService {
    async createProject(userId, projectData) {
        const { name, description, isPublic, settings } = projectData;

        const project = new Project({
            name,
            description,
            owner: userId,
            isPublic: isPublic || false,
            settings: {
                language: settings?.language || 'javascript',
                theme: settings?.theme || 'oceanic-next',
                autoSave: settings?.autoSave !== false,
                tabSize: settings?.tabSize || 2
            }
        });

        await project.save();
        await project.populate('owner', 'username avatar');

        return project;
    }

    async getUserProjects(userId, { page = 1, limit = 10, search, sortBy = 'updatedAt' } = {}) {
        const query = {
            $or: [
                { owner: userId },
                { 'collaborators.user': userId }
            ]
        };

        if (search) {
            query.$and = [
                query.$or ? { $or: query.$or } : {},
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
            delete query.$or;
        }

        const sort = {};
        sort[sortBy] = -1;

        const projects = await Project.find(query)
            .populate('owner', 'username avatar')
            .populate('collaborators.user', 'username avatar')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Project.countDocuments(query);

        return {
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getProjectById(projectId, userId) {
        const project = await Project.findById(projectId)
            .populate('owner', 'username avatar')
            .populate('collaborators.user', 'username avatar');

        console.log('=== DEBUG PROJECT ACCESS ===');
        console.log('Project ID:', projectId);
        console.log('Project Owner:', project.owner);
        console.log('Project Owner Type:', typeof project.owner);
        console.log('User ID:', userId);
        console.log('User ID Type:', typeof userId);
        console.log('Owner toString():', project.owner.toString());
        console.log('User toString():', userId.toString());
        console.log('Are they equal?:', project.owner.toString() === userId.toString());
        console.log('=== END DEBUG ===');

        if (!project) {
            throw new Error('Project not found');
        }

        if (!project.hasAccess(userId, 'read')) {
            throw new Error('Access denied');
        }

        return project;
    }

    async updateProject(projectId, userId, updates) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (!project.hasAccess(userId, 'write')) {
            throw new Error('Access denied');
        }

        // Only allow updating certain fields
        const allowedFields = ['name', 'description', 'isPublic', 'settings'];
        const updateData = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        });

        Object.assign(project, updateData);
        await project.updateActivity();
        await project.populate('owner', 'username avatar');
        await project.populate('collaborators.user', 'username avatar');

        return project;
    }

    async deleteProject(projectId, userId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        // Only owner can delete project
        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can delete the project');
        }

        // TODO: Delete all associated files
        await Project.findByIdAndDelete(projectId);

        return { message: 'Project deleted successfully' };
    }

    async joinProject(projectId, userId, inviteCode) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() === userId.toString()) {
            throw new Error('You are already the owner of this project');
        }

        if (!project.isPublic && !inviteCode) {
            throw new Error('This project requires an invite code');
        }

        // For MVP, we'll skip invite code validation
        // In production, you'd validate the invite code here

        await project.addCollaborator(userId, 'write');
        await project.populate('owner', 'username avatar');
        await project.populate('collaborators.user', 'username avatar');

        return project;
    }

    async leaveProject(projectId, userId) {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() === userId.toString()) {
            throw new Error('Project owner cannot leave the project');
        }

        await project.removeCollaborator(userId);

        return { message: 'Left project successfully' };
    }

    async getPublicProjects({ page = 1, limit = 10, search } = {}) {
        const query = { isPublic: true };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const projects = await Project.find(query)
            .populate('owner', 'username avatar')
            .sort({ 'stats.lastActivity': -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('name description owner stats settings createdAt')
            .lean();

        const total = await Project.countDocuments(query);

        return {
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async addCollaborator(projectId, ownerId, collaboratorData) {
        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is project owner or has admin rights
            if (project.owner.toString() !== ownerId.toString()) {
                // Check if user is an admin collaborator
                const userRole = project.collaborators.find(c =>
                    c.user.toString() === ownerId.toString()
                )?.role;

                if (userRole !== 'admin') {
                    throw new Error('Access denied. Only project owner or admin can add collaborators');
                }
            }

            let collaboratorUser;

            // Find user by email, username, or ID
            if (collaboratorData.email) {
                collaboratorUser = await User.findOne({ email: collaboratorData.email });
            } else if (collaboratorData.username) {
                collaboratorUser = await User.findOne({ username: collaboratorData.username });
            } else if (collaboratorData.userId) {
                collaboratorUser = await User.findById(collaboratorData.userId);
            } else {
                throw new Error('Please provide email, username, or user ID');
            }

            if (!collaboratorUser) {
                throw new Error('User not found');
            }

            // Check if user is already a collaborator
            const existingCollaborator = project.collaborators.find(c =>
                c.user.toString() === collaboratorUser._id.toString()
            );

            if (existingCollaborator) {
                throw new Error('User is already a collaborator');
            }

            // Check if user is the project owner
            if (project.owner.toString() === collaboratorUser._id.toString()) {
                throw new Error('Project owner cannot be added as collaborator');
            }

            // Add collaborator
            project.collaborators.push({
                user: collaboratorUser._id,
                role: collaboratorData.role || 'collaborator',
                addedAt: new Date()
            });

            await project.save();

            // Return populated project
            await project.populate('owner', 'username avatar email');
            await project.populate('collaborators.user', 'username avatar email');

            return project;
        } catch (error) {
            console.error('Add collaborator service error:', error);
            throw error;
        }
    }

    // Remove collaborator
    async removeCollaborator(projectId, ownerId, collaboratorId) {
        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is project owner or has admin rights
            if (project.owner.toString() !== ownerId.toString()) {
                const userRole = project.collaborators.find(c =>
                    c.user.toString() === ownerId.toString()
                )?.role;

                if (userRole !== 'admin') {
                    throw new Error('Access denied. Only project owner or admin can remove collaborators');
                }
            }

            // Find and remove collaborator
            const collaboratorIndex = project.collaborators.findIndex(c =>
                c.user.toString() === collaboratorId || c._id.toString() === collaboratorId
            );

            if (collaboratorIndex === -1) {
                throw new Error('Collaborator not found');
            }

            project.collaborators.splice(collaboratorIndex, 1);
            await project.save();

            // Return populated project
            await project.populate('owner', 'username avatar email');
            await project.populate('collaborators.user', 'username avatar email');

            return project;
        } catch (error) {
            console.error('Remove collaborator service error:', error);
            throw error;
        }
    }

    // Generate invite code for project
    async generateInviteCode(projectId, ownerId, options = {}) {
        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== ownerId.toString()) {
                throw new Error('Access denied. Only project owner can generate invite codes');
            }

            // Generate unique invite code
            const inviteCode = require('crypto').randomBytes(16).toString('hex');

            project.inviteCode = {
                code: inviteCode,
                expiresAt: new Date(Date.now() + (options.expiresIn || 7 * 24 * 60 * 60 * 1000)), // 7 days default
                maxUses: options.maxUses || null,
                currentUses: 0,
                role: options.role || 'collaborator'
            };

            await project.save();

            return {
                inviteCode: inviteCode,
                expiresAt: project.inviteCode.expiresAt,
                maxUses: project.inviteCode.maxUses,
                role: project.inviteCode.role
            };
        } catch (error) {
            console.error('Generate invite code service error:', error);
            throw error;
        }
    }

    // Get project collaborators
    async getProjectCollaborators(projectId, userId) {
        try {
            const project = await Project.findById(projectId)
                .populate('owner', 'username avatar email')
                .populate('collaborators.user', 'username avatar email');

            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user has access to view collaborators
            const hasAccess = project.owner.toString() === userId.toString() ||
                project.collaborators.some(c => c.user._id.toString() === userId.toString()) ||
                project.isPublic;

            if (!hasAccess) {
                throw new Error('Access denied');
            }

            return {
                owner: project.owner,
                collaborators: project.collaborators.map(c => ({
                    id: c._id,
                    user: c.user,
                    role: c.role,
                    addedAt: c.addedAt
                }))
            };
        } catch (error) {
            console.error('Get project collaborators service error:', error);
            throw error;
        }
    }

    // Update collaborator role
    async updateCollaboratorRole(projectId, ownerId, collaboratorId, newRole) {
        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== ownerId.toString()) {
                throw new Error('Access denied. Only project owner can change collaborator roles');
            }

            const collaborator = project.collaborators.find(c =>
                c.user.toString() === collaboratorId || c._id.toString() === collaboratorId
            );

            if (!collaborator) {
                throw new Error('Collaborator not found');
            }

            collaborator.role = newRole;
            await project.save();

            await project.populate('owner', 'username avatar email');
            await project.populate('collaborators.user', 'username avatar email');

            return project;
        } catch (error) {
            console.error('Update collaborator role service error:', error);
            throw error;
        }
    }
}

module.exports = new ProjectService();