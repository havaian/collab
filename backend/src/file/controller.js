// src/file/controller.js
const fileService = require('./service');
const { validationResult } = require('express-validator');

class FileController {
  async createFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const file = await fileService.createFile(req.user.id, req.params.projectId, req.body);
      res.status(201).json({ file });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getProjectFiles(req, res) {
    try {
      const { includeDeleted, type } = req.query;
      const files = await fileService.getProjectFiles(req.user.id, req.params.projectId, {
        includeDeleted: includeDeleted === 'true',
        type
      });
      
      res.json({ files });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getFile(req, res) {
    try {
      const file = await fileService.getFileById(req.user.id, req.params.id);
      res.json({ file });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async updateFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const file = await fileService.updateFile(req.user.id, req.params.id, req.body);
      res.json({ file });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 
                   error.message.includes('read-only') ? 403 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async deleteFile(req, res) {
    try {
      const { permanent } = req.query;
      const result = await fileService.deleteFile(req.user.id, req.params.id, permanent === 'true');
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async moveFile(req, res) {
    try {
      const { parentFolder } = req.body;
      const file = await fileService.moveFile(req.user.id, req.params.id, parentFolder);
      res.json({ file });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async duplicateFile(req, res) {
    try {
      const { name } = req.body;
      const file = await fileService.duplicateFile(req.user.id, req.params.id, name);
      res.status(201).json({ file });
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
}

module.exports = new FileController();