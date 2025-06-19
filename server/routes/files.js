const express = require('express');
const File = require('../models/File');
const Project = require('../models/Project');
const { 
  authenticateJWT, 
  requireProjectAccess, 
  requireFileAccess 
} = require('../middleware/auth');
const { 
  fileValidation, 
  handleValidationErrors,
  paramValidation,
  queryValidation
} = require('../middleware/validation');
const { 
  fileUpload,
  trackUsage 
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get files by project
router.get('/project/:projectId',
  paramValidation.projectId,
  queryValidation.search,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { type, search, limit = 50 } = req.query;

      let files;
      
      if (search) {
        files = await File.searchFiles(projectId, search);
      } else {
        files = await File.findByProject(projectId, type);
      }

      // Limit results
      files = files.slice(0, parseInt(limit));

      res.json({
        files,
        count: files.length
      });

    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({
        error: 'Failed to fetch files',
        message: 'Unable to retrieve project files'
      });
    }
  }
);

// Get recent files by project
router.get('/project/:projectId/recent',
  paramValidation.projectId,
  handleValidationErrors,
  requireProjectAccess('view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

      const files = await File.getRecentFiles(projectId, parseInt(limit));

      res.json({
        files
      });

    } catch (error) {
      console.error('Error fetching recent files:', error);
      res.status(500).json({
        error: 'Failed to fetch recent files',
        message: 'Unable to retrieve recent files'
      });
    }
  }
);

// Create new file
router.post('/',
  fileUpload,
  trackUsage('file_operation'),
  fileValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, name, path = '', content = '', language, type } = req.body;

      // Check project access
      const project = await Project.findById(projectId);
      if (!project || !project.canUserAccess(req.user._id, 'edit')) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to create files in this project'
        });
      }

      // Check if file already exists
      const existingFile = await File.findOne({ 
        projectId, 
        name, 
        path: path || '' 
      });

      if (existingFile) {
        return res.status(409).json({
          error: 'File already exists',
          message: 'A file with this name already exists in the specified path'
        });
      }

      const file = new File({
        projectId,
        name,
        path: path || '',
        content,
        language,
        type,
        lastModifiedBy: req.user._id
      });

      await file.save();

      // Update project stats
      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.totalFiles': 1 },
        $set: { 'stats.lastActivity': new Date() }
      });

      // Populate user info
      await file.populate('lastModifiedBy', 'username avatar');

      // Notify collaborators
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('file:created', {
          file,
          createdBy: req.user._id
        });
      }

      res.status(201).json({
        message: 'File created successfully',
        file
      });

    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({
        error: 'File creation failed',
        message: 'Unable to create file'
      });
    }
  }
);

// Get specific file
router.get('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const file = req.file;

      res.json({
        file
      });

    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({
        error: 'Failed to fetch file',
        message: 'Unable to retrieve file'
      });
    }
  }
);

// Update file content
router.put('/:id',
  paramValidation.objectId,
  fileValidation.update,
  handleValidationErrors,
  requireFileAccess('edit'),
  async (req, res) => {
    try {
      const { content, message } = req.body;
      const file = req.file;

      // Save to history and update content
      await file.addToHistory(content, req.user._id, message);

      // Populate user info
      await file.populate('lastModifiedBy', 'username avatar');

      // Notify other editors
      if (req.io) {
        const fileRoom = `file:${file._id}`;
        req.io.to(fileRoom).except(req.user._id).emit('file:updated', {
          fileId: file._id,
          content,
          updatedBy: req.user._id,
          timestamp: new Date()
        });
      }

      res.json({
        message: 'File updated successfully',
        file
      });

    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({
        error: 'File update failed',
        message: 'Unable to update file'
      });
    }
  }
);

// Delete file
router.delete('/:id',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('delete'),
  async (req, res) => {
    try {
      const file = req.file;
      const projectId = file.projectId._id;

      await File.findByIdAndDelete(file._id);

      // Update project stats
      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.totalFiles': -1 },
        $set: { 'stats.lastActivity': new Date() }
      });

      // Notify collaborators
      if (req.io) {
        req.io.to(`project:${projectId}`).emit('file:deleted', {
          fileId: file._id,
          fileName: file.name,
          deletedBy: req.user._id
        });
      }

      res.json({
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        error: 'File deletion failed',
        message: 'Unable to delete file'
      });
    }
  }
);

// Get file history
router.get('/:id/history',
  paramValidation.objectId,
  queryValidation.pagination,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const file = req.file;
      const { limit = 20, skip = 0 } = req.query;

      const history = file.history
        .slice(skip, skip + parseInt(limit))
        .map(entry => ({
          version: entry.version,
          modifiedBy: entry.modifiedBy,
          modifiedAt: entry.modifiedAt,
          message: entry.message,
          changes: entry.changes
        }));

      res.json({
        history,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          total: file.history.length
        }
      });

    } catch (error) {
      console.error('Error fetching file history:', error);
      res.status(500).json({
        error: 'Failed to fetch file history',
        message: 'Unable to retrieve file history'
      });
    }
  }
);

// Get specific version of file
router.get('/:id/history/:version',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const file = req.file;
      const { version } = req.params;

      const historyEntry = file.history.find(h => h.version === parseInt(version));

      if (!historyEntry) {
        return res.status(404).json({
          error: 'Version not found',
          message: 'The requested file version does not exist'
        });
      }

      res.json({
        version: historyEntry.version,
        content: historyEntry.content,
        modifiedBy: historyEntry.modifiedBy,
        modifiedAt: historyEntry.modifiedAt,
        message: historyEntry.message
      });

    } catch (error) {
      console.error('Error fetching file version:', error);
      res.status(500).json({
        error: 'Failed to fetch file version',
        message: 'Unable to retrieve file version'
      });
    }
  }
);

// Lock file for editing
router.post('/:id/lock',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('edit'),
  async (req, res) => {
    try {
      const file = req.file;
      const { duration = 10 } = req.body; // Duration in minutes

      await file.lockFile(req.user._id, duration);

      // Notify other editors
      if (req.io) {
        const fileRoom = `file:${file._id}`;
        req.io.to(fileRoom).except(req.user._id).emit('file:locked', {
          fileId: file._id,
          lockedBy: req.user._id,
          lockedUntil: file.permissions.lockExpires
        });
      }

      res.json({
        message: 'File locked successfully',
        lockedUntil: file.permissions.lockExpires
      });

    } catch (error) {
      console.error('Error locking file:', error);
      res.status(400).json({
        error: 'Failed to lock file',
        message: error.message || 'Unable to lock file'
      });
    }
  }
);

// Unlock file
router.delete('/:id/lock',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('edit'),
  async (req, res) => {
    try {
      const file = req.file;

      await file.unlockFile(req.user._id);

      // Notify other editors
      if (req.io) {
        const fileRoom = `file:${file._id}`;
        req.io.to(fileRoom).emit('file:unlocked', {
          fileId: file._id,
          unlockedBy: req.user._id
        });
      }

      res.json({
        message: 'File unlocked successfully'
      });

    } catch (error) {
      console.error('Error unlocking file:', error);
      res.status(400).json({
        error: 'Failed to unlock file',
        message: error.message || 'Unable to unlock file'
      });
    }
  }
);

// Update editor presence (cursor/selection)
router.put('/:id/presence',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const { cursor, selection } = req.body;
      const file = req.file;

      await file.updateEditorPresence(req.user._id, cursor, selection);

      // Notify other editors via socket
      if (req.io) {
        const fileRoom = `file:${file._id}`;
        req.io.to(fileRoom).except(req.user._id).emit('file:cursor_update', {
          fileId: file._id,
          userId: req.user._id,
          cursor,
          selection,
          timestamp: new Date()
        });
      }

      res.json({
        message: 'Presence updated successfully'
      });

    } catch (error) {
      console.error('Error updating presence:', error);
      res.status(500).json({
        error: 'Failed to update presence',
        message: 'Unable to update editor presence'
      });
    }
  }
);

// Get active editors for file
router.get('/:id/editors',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const file = req.file;

      await file.populate('activeEditors.user', 'username avatar');

      const editors = file.activeEditors.map(editor => ({
        user: editor.user,
        cursor: editor.cursor,
        selection: editor.selection,
        lastSeen: editor.lastSeen
      }));

      res.json({
        editors
      });

    } catch (error) {
      console.error('Error fetching active editors:', error);
      res.status(500).json({
        error: 'Failed to fetch editors',
        message: 'Unable to retrieve active editors'
      });
    }
  }
);

// Rename file
router.put('/:id/rename',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('edit'),
  async (req, res) => {
    try {
      const { name } = req.body;
      const file = req.file;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid name',
          message: 'File name cannot be empty'
        });
      }

      // Check if file with new name already exists
      const existingFile = await File.findOne({
        projectId: file.projectId,
        name: name.trim(),
        path: file.path,
        _id: { $ne: file._id }
      });

      if (existingFile) {
        return res.status(409).json({
          error: 'File already exists',
          message: 'A file with this name already exists'
        });
      }

      const oldName = file.name;
      file.name = name.trim();
      file.lastModified = new Date();
      file.lastModifiedBy = req.user._id;
      await file.save();

      // Notify collaborators
      if (req.io) {
        req.io.to(`project:${file.projectId}`).emit('file:renamed', {
          fileId: file._id,
          oldName,
          newName: file.name,
          renamedBy: req.user._id
        });
      }

      res.json({
        message: 'File renamed successfully',
        file
      });

    } catch (error) {
      console.error('Error renaming file:', error);
      res.status(500).json({
        error: 'Failed to rename file',
        message: 'Unable to rename file'
      });
    }
  }
);

// Move file to different path
router.put('/:id/move',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('edit'),
  async (req, res) => {
    try {
      const { path } = req.body;
      const file = req.file;

      // Validate new path
      if (path && !require('../middleware/validation').isValidPath(path)) {
        return res.status(400).json({
          error: 'Invalid path',
          message: 'The specified path is invalid'
        });
      }

      // Check if file already exists at new path
      const existingFile = await File.findOne({
        projectId: file.projectId,
        name: file.name,
        path: path || '',
        _id: { $ne: file._id }
      });

      if (existingFile) {
        return res.status(409).json({
          error: 'File already exists',
          message: 'A file with this name already exists at the target path'
        });
      }

      const oldPath = file.path;
      file.path = path || '';
      file.lastModified = new Date();
      file.lastModifiedBy = req.user._id;
      await file.save();

      // Notify collaborators
      if (req.io) {
        req.io.to(`project:${file.projectId}`).emit('file:moved', {
          fileId: file._id,
          oldPath,
          newPath: file.path,
          movedBy: req.user._id
        });
      }

      res.json({
        message: 'File moved successfully',
        file
      });

    } catch (error) {
      console.error('Error moving file:', error);
      res.status(500).json({
        error: 'Failed to move file',
        message: 'Unable to move file'
      });
    }
  }
);

// Download file
router.get('/:id/download',
  paramValidation.objectId,
  handleValidationErrors,
  requireFileAccess('view'),
  async (req, res) => {
    try {
      const file = req.file;

      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Type', file.mimeType || 'text/plain');
      res.send(file.content);

    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({
        error: 'Failed to download file',
        message: 'Unable to download file'
      });
    }
  }
);

module.exports = router;