import apiService from './apiService';

class GitHubService {
    async getRepositories(page = 1, per_page = 30) {
        const response = await apiService.get('/github/repositories', {
            params: { page, per_page }
        });
        return response.data;
    }

    async syncRepository(projectId, repositoryUrl, branch = 'main') {
        const response = await apiService.post('/github/sync', {
            projectId,
            repositoryUrl,
            branch
        });
        return response.data;
    }

    async importRepository(repositoryUrl, name, description, branch = 'main') {
        const response = await apiService.post('/github/import', {
            repositoryUrl,
            name,
            description,
            branch
        });
        return response.data;
    }
}

export default new GitHubService();