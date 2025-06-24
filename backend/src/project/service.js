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
}

module.exports = new ProjectService();