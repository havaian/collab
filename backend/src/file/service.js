// src/file/service.js
const File = require('./model');
const Project = require('../project/model');
const mongoose = require('mongoose');
const path = require('path');

class FileService {
  async createFile(userId, projectId, fileData) {
    const { name, content = '', parentFolder, type = 'file' } = fileData;
    
    // Verify project access
    const project = await Project.findById(projectId);
    if (!project || !project.hasAccess(userId, 'write')) {
      throw new Error('Project not found or access denied');
    }
    
    // Build file path
    let filePath = name;
    if (parentFolder) {
      const parent = await File.findOne({ _id: parentFolder, projectId, type: 'folder' });
      if (!parent) {
        throw new Error('Parent folder not found');
      }
      filePath = `${parent.path}/${name}`;
    }
    
    // Check if file already exists
    const existingFile = await File.findOne({ projectId, path: filePath, isDeleted: false });
    if (existingFile) {
      throw new Error('File already exists at this path');
    }
    
    // Detect language for files
    const language = type === 'file' ? File.detectLanguage(name) : null;
    
    const file = new File({
      name,
      path: filePath,
      content,
      language,
      projectId,
      createdBy: userId,
      lastModifiedBy: userId,
      type,
      parentFolder: parentFolder || null
    });
    
    await file.save();
    await file.populate('createdBy', 'username avatar');
    await file.populate('lastModifiedBy', 'username avatar');
    
    // Update project stats
    await this.updateProjectStats(projectId);
    
    return file;
  }
  
  async getProjectFiles(userId, projectId, { includeDeleted = false, type } = {}) {
    // Verify project access
    const project = await Project.findById(projectId);
    if (!project || !project.hasAccess(userId, 'read')) {
      throw new Error('Project not found or access denied');
    }
    
    const query = { projectId };
    
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    
    if (type) {
      query.type = type;
    }
    
    const files = await File.find(query)
      .populate('createdBy', 'username avatar')
      .populate('lastModifiedBy', 'username avatar')
      .sort({ type: -1, name: 1 }) // Folders first, then alphabetical
      .lean();
    
    return this.buildFileTree(files);
  }
  
  async getFileById(userId, fileId) {
    const file = await File.findById(fileId)
      .populate('createdBy', 'username avatar')
      .populate('lastModifiedBy', 'username avatar');
    
    if (!file || file.isDeleted) {
      throw new Error('File not found');
    }
    
    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project || !project.hasAccess(userId, 'read')) {
      throw new Error('Access denied');
    }
    
    return file;
  }
  
  async updateFile(userId, fileId, updates) {
    const file = await File.findById(fileId);
    
    if (!file || file.isDeleted) {
      throw new Error('File not found');
    }
    
    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project || !project.hasAccess(userId, 'write')) {
      throw new Error('Access denied');
    }
    
    if (file.metadata?.readonly) {
      throw new Error('File is read-only');
    }
    
    // Update allowed fields
    const allowedFields = ['name', 'content', 'language', 'metadata'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'metadata') {
          file.metadata = { ...file.metadata, ...updates[field] };
        } else {
          file[field] = updates[field];
        }
      }
    });
    
    file.lastModifiedBy = userId;
    
    // If name changed, update path
    if (updates.name && updates.name !== file.name) {
      const pathParts = file.path.split('/');
      pathParts[pathParts.length - 1] = updates.name;
      file.path = pathParts.join('/');
      
      // Detect new language if extension changed
      if (file.type === 'file') {
        file.language = File.detectLanguage(updates.name);
      }
    }
    
    await file.save();
    await file.populate('createdBy', 'username avatar');
    await file.populate('lastModifiedBy', 'username avatar');
    
    // Update project activity
    await project.updateActivity();
    
    return file;
  }
  
  async deleteFile(userId, fileId, permanent = false) {
    const file = await File.findById(fileId);
    
    if (!file || file.isDeleted) {
      throw new Error('File not found');
    }
    
    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project || !project.hasAccess(userId, 'write')) {
      throw new Error('Access denied');
    }
    
    if (permanent) {
      // Permanently delete file and its children
      await this.permanentlyDeleteFile(file);
    } else {
      // Soft delete
      file.isDeleted = true;
      await file.save();
      
      // Soft delete children if it's a folder
      if (file.type === 'folder') {
        await File.updateMany(
          { parentFolder: file._id },
          { isDeleted: true }
        );
      }
    }
    
    // Update project stats
    await this.updateProjectStats(file.projectId);
    
    return { message: 'File deleted successfully' };
  }
  
  async moveFile(userId, fileId, newParentId) {
    const file = await File.findById(fileId);
    
    if (!file || file.isDeleted) {
      throw new Error('File not found');
    }
    
    // Verify project access
    const project = await Project.findById(file.projectId);
    if (!project || !project.hasAccess(userId, 'write')) {
      throw new Error('Access denied');
    }
    
    let newPath = file.name;
    
    if (newParentId) {
      const newParent = await File.findOne({
        _id: newParentId,
        projectId: file.projectId,
        type: 'folder',
        isDeleted: false
      });
      
      if (!newParent) {
        throw new Error('Target folder not found');
      }
      
      newPath = `${newParent.path}/${file.name}`;
    }
    
    // Check if target path already exists
    const existingFile = await File.findOne({
      projectId: file.projectId,
      path: newPath,
      isDeleted: false,
      _id: { $ne: file._id }
    });
    
    if (existingFile) {
      throw new Error('File already exists at target location');
    }
    
    file.parentFolder = newParentId || null;
    file.path = newPath;
    file.lastModifiedBy = userId;
    
    await file.save();
    await file.populate('createdBy', 'username avatar');
    await file.populate('lastModifiedBy', 'username avatar');
    
    return file;
  }
  
  async duplicateFile(userId, fileId, newName) {
    const originalFile = await File.findById(fileId);
    
    if (!originalFile || originalFile.isDeleted) {
      throw new Error('File not found');
    }
    
    // Verify project access
    const project = await Project.findById(originalFile.projectId);
    if (!project || !project.hasAccess(userId, 'write')) {
      throw new Error('Access denied');
    }
    
    const duplicateData = {
      name: newName || `${originalFile.name}_copy`,
      content: originalFile.content,
      parentFolder: originalFile.parentFolder,
      type: originalFile.type
    };
    
    return this.createFile(userId, originalFile.projectId, duplicateData);
  }
  
  // Helper methods
  buildFileTree(files) {
    const fileMap = new Map();
    const rootFiles = [];
    
    // Create file map
    files.forEach(file => {
      fileMap.set(file._id.toString(), { ...file, children: [] });
    });
    
    // Build tree structure
    files.forEach(file => {
      const fileNode = fileMap.get(file._id.toString());
      
      if (file.parentFolder) {
        const parent = fileMap.get(file.parentFolder.toString());
        if (parent) {
          parent.children.push(fileNode);
        } else {
          rootFiles.push(fileNode);
        }
      } else {
        rootFiles.push(fileNode);
      }
    });
    
    return rootFiles;
  }
  
  async updateProjectStats(projectId) {
    const stats = await File.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false } },
      {
        $group: {
          _id: null,
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);
    
    const { fileCount = 0, totalSize = 0 } = stats[0] || {};
    
    await Project.findByIdAndUpdate(projectId, {
      'stats.fileCount': fileCount,
      'stats.totalSize': totalSize,
      'stats.lastActivity': new Date()
    });
  }
  
  async permanentlyDeleteFile(file) {
    if (file.type === 'folder') {
      // Delete all children first
      const children = await File.find({ parentFolder: file._id });
      for (const child of children) {
        await this.permanentlyDeleteFile(child);
      }
    }
    
    await File.findByIdAndDelete(file._id);
  }
}

module.exports = new FileService();