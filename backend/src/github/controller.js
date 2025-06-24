// src/github/controller.js
const githubService = require('./service');
const Project = require('../project/model');

class GitHubController {
  async getRepositories(req, res) {
    try {
      const { page = 1, per_page = 30 } = req.query;
      const repositories = await githubService.getUserRepositories(
        req.user.accessToken,
        parseInt(page),
        parseInt(per_page)
      );
      res.json({ success: true, data: repositories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async syncRepository(req, res) {
    try {
      const { projectId, repositoryUrl, branch = 'main' } = req.body;
      const result = await githubService.syncRepository(projectId, repositoryUrl, branch, req.user.accessToken);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async importRepository(req, res) {
    try {
      const { repositoryUrl, name, description, branch = 'main' } = req.body;
      const project = await githubService.importRepository(
        repositoryUrl,
        name,
        description,
        branch,
        req.user.id,
        req.user.accessToken
      );
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new GitHubController();