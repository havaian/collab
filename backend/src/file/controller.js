// backend/src/file/controller.js - FIXED VERSION
const fileService = require('./service');
const { validationResult } = require('express-validator');

class FileController {
  async createFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }
      
      const file = await fileService.createFile(req.user.id, req.params.projectId, req.body);
      res.status(201).json({ file });
    } catch (error) {
      console.error('Create file error:', error);
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
      console.error('Get project files error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getFile(req, res) {
    try {
      const file = await fileService.getFileById(req.user.id, req.params.id);
      res.json({ file });
    } catch (error) {
      console.error('Get file error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  // Update file method with proper error handling
  async updateFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array() 
        });
      }
      
      // Log incoming request for debugging
      console.log(`Updating file ${req.params.id}:`, {
        body: req.body,
        contentLength: req.body.content ? req.body.content.length : 0
      });
      
      const file = await fileService.updateFile(req.user.id, req.params.id, req.body);
      
      // Log successful update
      console.log(`File ${req.params.id} updated successfully`);
      
      res.json({ file });
    } catch (error) {
      console.error('Update file error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 
                   error.message.includes('read-only') ? 403 : 
                   error.message.includes('already exists') ? 409 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async deleteFile(req, res) {
    try {
      const { permanent } = req.query;
      const result = await fileService.deleteFile(req.user.id, req.params.id, permanent === 'true');
      res.json(result);
    } catch (error) {
      console.error('Delete file error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  // Move file with better validation
  async moveFile(req, res) {
    try {
      const { parentFolder } = req.body;
      
      // Validate move request
      if (parentFolder !== null && parentFolder !== undefined && !parentFolder.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid parent folder ID' });
      }
      
      const file = await fileService.moveFile(req.user.id, req.params.id, parentFolder);
      res.json({ file });
    } catch (error) {
      console.error('Move file error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 
                   error.message.includes('already exists') || error.message.includes('circular') ? 409 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  // Duplicate file with better name handling
  async duplicateFile(req, res) {
    try {
      const { name } = req.body;
      
      // Validate duplicate request
      if (name && (name.length < 1 || name.length > 255)) {
        return res.status(400).json({ error: 'Name must be 1-255 characters' });
      }
      
      const file = await fileService.duplicateFile(req.user.id, req.params.id, name);
      res.status(201).json({ file });
    } catch (error) {
      console.error('Duplicate file error:', error);
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  // Batch operations for multiple files
  async batchDelete(req, res) {
    try {
      const { fileIds, permanent = false } = req.body;
      
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'fileIds must be a non-empty array' });
      }
      
      const results = [];
      const errors = [];
      
      for (const fileId of fileIds) {
        try {
          const result = await fileService.deleteFile(req.user.id, fileId, permanent);
          results.push({ fileId, success: true, ...result });
        } catch (error) {
          errors.push({ fileId, success: false, error: error.message });
        }
      }
      
      res.json({ results, errors });
    } catch (error) {
      console.error('Batch delete error:', error);
      res.status(500).json({ error: 'Batch delete failed' });
    }
  }
  
  async batchMove(req, res) {
    try {
      const { fileIds, parentFolder } = req.body;
      
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'fileIds must be a non-empty array' });
      }
      
      const results = [];
      const errors = [];
      
      for (const fileId of fileIds) {
        try {
          const file = await fileService.moveFile(req.user.id, fileId, parentFolder);
          results.push({ fileId, success: true, file });
        } catch (error) {
          errors.push({ fileId, success: false, error: error.message });
        }
      }
      
      res.json({ results, errors });
    } catch (error) {
      console.error('Batch move error:', error);
      res.status(500).json({ error: 'Batch move failed' });
    }
  }
}

module.exports = new FileController();