import apiService from './apiService';

class GitHubService {
    async getRepositories(page = 1, per_page = 30) {
        const response = await apiService.get('/github/repositories', {
            params: { page, per_page }
        });
        return response.data;
    }

    async syncRepository(projectId, repositoryUrl, branch = 'main') {
        const repositoryData = {
            'projectId': projectId,
            'repositoryUrl': repositoryUrl,
            'branch': branch
        }
        const response = await apiService.post('/github/sync', repositoryData);
        return response.data;
    }

    async importRepository(repositoryUrl, name, description, branch = 'main') {
        const repositoryData = {
            'repositoryUrl': repositoryUrl,
            'name': name,
            'description': description,
            'branch': branch
        }
        const response = await apiService.post('/github/import', repositoryData);
        return response.data;
    }
}

export default new GitHubService();