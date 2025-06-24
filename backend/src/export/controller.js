// src/export/controller.js
const exportService = require('./service');
const { validationResult } = require('express-validator');
const path = require('path');

class ExportController {
  async exportProject(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { projectId } = req.params;
      const options = {
        type: req.body.type || 'zip',
        includeDeleted: req.body.includeDeleted || false,
        fileIds: req.body.fileIds || [],
        format: req.body.format || 'zip',
        gistSettings: req.body.gistSettings || {}
      };
      
      const result = await exportService.exportProject(req.user.id, projectId, options);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') || error.message.includes('access denied') ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getExportStatus(req, res) {
    try {
      const { exportId } = req.params;
      const status = await exportService.getExportStatus(exportId);
      res.json(status);
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async downloadExport(req, res) {
    try {
      const { exportId } = req.params;
      const fileData = await exportService.downloadExport(exportId, req.user.id);
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileData.fileSize);
      
      // Stream file
      const fs = require('fs');
      const fileStream = fs.createReadStream(fileData.filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream file' });
        }
      });
      
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('access denied') ? 403 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async getUserExports(req, res) {
    try {
      const { page, limit } = req.query;
      const result = await exportService.getUserExports(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async deleteExport(req, res) {
    try {
      const { exportId } = req.params;
      const result = await exportService.deleteExport(exportId, req.user.id);
      res.json(result);
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('access denied') ? 403 : 500;
      res.status(status).json({ error: error.message });
    }
  }
  
  async exportSingleFile(req, res) {
    try {
      const { fileId } = req.params;
      
      // This is a convenience method for single file exports
      const File = require('../file/model');
      const file = await File.findById(fileId).populate('projectId');
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const result = await exportService.exportProject(req.user.id, file.projectId._id, {
        type: 'file',
        fileIds: [fileId]
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ExportController();