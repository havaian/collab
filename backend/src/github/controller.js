// src/github/controller.js
const githubService = require('./service');
const { validationResult } = require('express-validator');

class GitHubController {
  async getUserRepositories(req, res) {
    try {
      const { page, limit, sort } = req.query;
      const result = await githubService.getUserRepositories(req.user.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 30,
        sort
      });
      
      res.json(result);
    } catch (error) {
      const status = error.message.includes('access token') ? 401 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getRepositoryContents(req, res) {
    try {
      const { repoFullName } = req.params;
      const { path, branch } = req.query;
      
      const contents = await githubService.getRepositoryContents(
        req.user.id,
        repoFullName,
        path,
        branch
      );
      
      res.json({ contents });
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async importRepository(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { projectId } = req.params;
      const { repoFullName, branch, includePaths, excludePaths, maxDepth } = req.body;
      
      const result = await githubService.importRepositoryToProject(
        req.user.id,
        projectId,
        repoFullName,
        { branch, includePaths, excludePaths, maxDepth }
      );
      
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async syncRepository(req, res) {
    try {
      const { projectId } = req.params;
      const result = await githubService.syncProjectWithRepository(req.user.id, projectId);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async createRepository(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { projectId } = req.params;
      const repoOptions = req.body;
      
      const result = await githubService.createGitHubRepository(req.user.id, projectId, repoOptions);
      res.status(201).json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('permissions') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async pushToRepository(req, res) {
    try {
      const { projectId } = req.params;
      const { repoFullName, branch } = req.body;
      
      const result = await githubService.pushProjectFilesToRepo(
        req.user.id,
        projectId,
        repoFullName,
        branch
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async disconnectRepository(req, res) {
    try {
      const { projectId } = req.params;
      const result = await githubService.disconnectRepository(req.user.id, projectId);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('permissions') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
}

module.exports = new GitHubController();