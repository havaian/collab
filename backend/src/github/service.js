const axios = require('axios');
const User = require('../auth/model');
const Project = require('../project/model');

class GitHubService {
    async getUserRepositories(userId, page = 1, per_page = 30) {
        const user = await User.findById(userId);
        if (!user || !user.githubAccessToken) {
            // Return empty array instead of throwing error for better UX
            return [];
        }

        try {
            const response = await axios.get('https://api.github.com/user/repos', {
                headers: {
                    'Authorization': `token ${user.githubAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    sort: 'updated',
                    direction: 'desc',
                    page,
                    per_page
                }
            });

            console.log(response.data);
            return response.data || [];
        } catch (error) {
            console.error('GitHub API error:', error.response?.data || error.message);
            // Return empty array instead of throwing error for better UX
            return [];
        }
    }

    async syncRepository(projectId, repositoryUrl, branch, userId) {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId) {
            throw new Error('Only project owner can sync repository');
        }

        // Update project with GitHub info
        project.githubRepo = {
            url: repositoryUrl,
            branch,
            lastSync: new Date()
        };

        await project.save();

        return { message: 'Repository sync initiated', project: project._id };
    }

    async importRepository(repositoryUrl, name, description, branch, userId) {
        // Create new project
        const project = new Project({
            name,
            description,
            owner: userId,
            githubRepo: {
                url: repositoryUrl,
                branch,
                lastSync: new Date()
            }
        });

        await project.save();

        return project;
    }
}

module.exports = new GitHubService();