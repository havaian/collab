const githubService = require('./service');

class GitHubController {
    async getRepositories(req, res) {
        try {
            const { page = 1, per_page = 30 } = req.query;
            const repositories = await githubService.getUserRepositories(req.user.id, page, per_page);
            
            // Fix: Ensure we return the structure the frontend expects
            res.json({ 
                success: true, 
                data: { 
                    repositories: repositories || [] // Frontend expects response.data.repositories
                } 
            });
        } catch (error) {
            console.error('Failed to get repositories:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                data: { repositories: [] } // Return empty array on error
            });
        }
    }

    async syncRepository(req, res) {
        try {
            const { projectId, repositoryUrl, branch = 'main' } = req.body;
            const result = await githubService.syncRepository(projectId, repositoryUrl, branch, req.user.id);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Failed to sync repository:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    async importRepository(req, res) {
        try {
            const { repositoryUrl, name, description, branch = 'main' } = req.body;
            const project = await githubService.importRepository(repositoryUrl, name, description, branch, req.user.id);
            res.status(201).json({ success: true, data: { projectId: project._id } });
        } catch (error) {
            console.error('Failed to import repository:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }
}

module.exports = new GitHubController();