// src/export/service.js
const Export = require('./model');
const Project = require('../project/model');
const File = require('../file/model');
const archiver = require('archiver');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');

class ExportService {
  constructor() {
    this.uploadsDir = process.env.UPLOAD_PATH || './uploads';
    this.exportsDir = path.join(this.uploadsDir, 'exports');
    this.maxExportSize = parseInt(process.env.MAX_EXPORT_SIZE) || 100 * 1024 * 1024; // 100MB
    this.exportExpiration = 24 * 60 * 60 * 1000; // 24 hours
    
    this.ensureDirectories();
  }
  
  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directories:', error);
    }
  }
  
  async exportProject(userId, projectId, options = {}) {
    try {
      // Verify project access
      const project = await Project.findById(projectId);
      if (!project || !project.hasAccess(userId, 'read')) {
        throw new Error('Project not found or access denied');
      }
      
      // Create export record
      const exportId = this.generateExportId();
      const exportRecord = new Export({
        exportId,
        projectId,
        userId,
        type: options.type || 'zip',
        options: {
          includeDeleted: options.includeDeleted || false,
          fileIds: options.fileIds || [],
          format: options.format || 'zip'
        }
      });
      
      await exportRecord.save();
      
      // Process export based on type
      let result;
      switch (exportRecord.type) {
        case 'zip':
          result = await this.createZipExport(project, exportRecord);
          break;
        case 'file':
          result = await this.createSingleFileExport(project, exportRecord);
          break;
        case 'gist':
          result = await this.createGistExport(project, exportRecord, userId);
          break;
        default:
          throw new Error(`Unsupported export type: ${exportRecord.type}`);
      }
      
      // Update export record with results
      exportRecord.status = 'completed';
      exportRecord.result = {
        ...result,
        expiresAt: new Date(Date.now() + this.exportExpiration)
      };
      
      await exportRecord.save();
      
      return {
        exportId,
        downloadUrl: result.downloadUrl,
        gistUrl: result.gistUrl,
        fileSize: result.fileSize,
        fileCount: result.fileCount
      };
      
    } catch (error) {
      // Update export record with error
      if (exportRecord) {
        exportRecord.status = 'failed';
        exportRecord.error = {
          message: error.message,
          code: error.code || 'EXPORT_FAILED'
        };
        await exportRecord.save();
      }
      
      throw error;
    }
  }
  
  async createZipExport(project, exportRecord) {
    const zipFileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;
    const zipPath = path.join(this.exportsDir, zipFileName);
    
    // Get project files
    const query = { 
      projectId: project._id,
      isDeleted: exportRecord.options.includeDeleted ? undefined : false
    };
    
    if (exportRecord.options.fileIds.length > 0) {
      query._id = { $in: exportRecord.options.fileIds };
    }
    
    const files = await File.find(query).sort({ path: 1 });
    
    if (files.length === 0) {
      throw new Error('No files found to export');
    }
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    const output = require('fs').createWriteStream(zipPath);
    archive.pipe(output);
    
    // Add project metadata
    const metadata = {
      name: project.name,
      description: project.description,
      exportedAt: new Date().toISOString(),
      exportedBy: exportRecord.userId,
      settings: project.settings,
      fileCount: files.length
    };
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'project.json' });
    
    // Add README
    const readme = this.generateReadme(project, files);
    archive.append(readme, { name: 'README.md' });
    
    // Add files to archive
    let totalSize = 0;
    for (const file of files) {
      if (file.type === 'file') {
        const fileContent = file.content || '';
        const fileSize = Buffer.byteLength(fileContent, 'utf8');
        
        totalSize += fileSize;
        if (totalSize > this.maxExportSize) {
          throw new Error('Export size limit exceeded');
        }
        
        archive.append(fileContent, { name: file.path });
      }
    }
    
    // Finalize archive
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.finalize();
    });
    
    const stats = await fs.stat(zipPath);
    const downloadUrl = `/api/export/download/${exportRecord.exportId}`;
    
    return {
      downloadUrl,
      fileSize: stats.size,
      fileCount: files.length,
      filePath: zipPath
    };
  }
  
  async createSingleFileExport(project, exportRecord) {
    if (!exportRecord.options.fileIds || exportRecord.options.fileIds.length !== 1) {
      throw new Error('Single file export requires exactly one file ID');
    }
    
    const file = await File.findOne({
      _id: exportRecord.options.fileIds[0],
      projectId: project._id
    });
    
    if (!file) {
      throw new Error('File not found');
    }
    
    const fileName = `${file.name}`;
    const filePath = path.join(this.exportsDir, `${exportRecord.exportId}_${fileName}`);
    
    await fs.writeFile(filePath, file.content || '', 'utf8');
    
    const stats = await fs.stat(filePath);
    const downloadUrl = `/api/export/download/${exportRecord.exportId}`;
    
    return {
      downloadUrl,
      fileSize: stats.size,
      fileCount: 1,
      filePath
    };
  }
  
  async createGistExport(project, exportRecord, userId) {
    // Get user's GitHub token
    const User = require('../auth/model');
    const user = await User.findById(userId);
    const accessToken = user.getDecryptedAccessToken();
    
    if (!accessToken) {
      throw new Error('GitHub access token not available. Please reconnect your GitHub account.');
    }
    
    const octokit = new Octokit({
      auth: accessToken
    });
    
    // Get project files
    const files = await File.find({
      projectId: project._id,
      isDeleted: false,
      type: 'file'
    }).limit(20); // GitHub Gist limit
    
    if (files.length === 0) {
      throw new Error('No files found to create gist');
    }
    
    // Prepare gist files
    const gistFiles = {};
    for (const file of files) {
      // Use relative path as filename, replace slashes with underscores
      const gistFileName = file.path.replace(/\//g, '_');
      gistFiles[gistFileName] = {
        content: file.content || `// ${file.name}\n// No content`
      };
    }
    
    // Add project metadata file
    const metadata = {
      name: project.name,
      description: project.description,
      originalFileCount: files.length,
      exportedAt: new Date().toISOString()
    };
    
    gistFiles['project_info.json'] = {
      content: JSON.stringify(metadata, null, 2)
    };
    
    // Create gist
    const gistResponse = await octokit.rest.gists.create({
      description: `${project.name} - Exported from GPT-Collab`,
      public: exportRecord.options.gistSettings?.isPublic || false,
      files: gistFiles
    });
    
    return {
      gistUrl: gistResponse.data.html_url,
      fileCount: files.length,
      fileSize: JSON.stringify(gistFiles).length
    };
  }
  
  async getExportStatus(exportId) {
    const exportRecord = await Export.findOne({ exportId })
      .populate('projectId', 'name')
      .populate('userId', 'username');
    
    if (!exportRecord) {
      throw new Error('Export not found');
    }
    
    return {
      exportId: exportRecord.exportId,
      status: exportRecord.status,
      type: exportRecord.type,
      project: exportRecord.projectId,
      createdAt: exportRecord.createdAt,
      result: exportRecord.result,
      error: exportRecord.error
    };
  }
  
  async downloadExport(exportId, userId) {
    const exportRecord = await Export.findOne({ exportId });
    
    if (!exportRecord) {
      throw new Error('Export not found');
    }
    
    // Verify user has access to this export
    const project = await Project.findById(exportRecord.projectId);
    if (!project || !project.hasAccess(userId, 'read')) {
      throw new Error('Access denied');
    }
    
    if (exportRecord.status !== 'completed') {
      throw new Error('Export not ready for download');
    }
    
    if (exportRecord.result.expiresAt < new Date()) {
      throw new Error('Export has expired');
    }
    
    // Return file path for streaming
    const filePath = exportRecord.result.filePath || 
                    path.join(this.exportsDir, `${exportId}.zip`);
    
    try {
      await fs.access(filePath);
      return {
        filePath,
        fileName: path.basename(filePath),
        fileSize: exportRecord.result.fileSize
      };
    } catch (error) {
      throw new Error('Export file not found or has been cleaned up');
    }
  }
  
  async getUserExports(userId, { page = 1, limit = 10 } = {}) {
    const exports = await Export.find({ userId })
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-result.filePath'); // Don't expose internal file paths
    
    const total = await Export.countDocuments({ userId });
    
    return {
      exports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async deleteExport(exportId, userId) {
    const exportRecord = await Export.findOne({ exportId });
    
    if (!exportRecord) {
      throw new Error('Export not found');
    }
    
    if (exportRecord.userId.toString() !== userId) {
      throw new Error('Access denied');
    }
    
    // Delete physical file if it exists
    if (exportRecord.result?.filePath) {
      try {
        await fs.unlink(exportRecord.result.filePath);
      } catch (error) {
        console.error('Failed to delete export file:', error);
      }
    }
    
    // Delete export record
    await Export.findByIdAndDelete(exportRecord._id);
    
    return { message: 'Export deleted successfully' };
  }
  
  // Utility methods
  generateExportId() {
    return `export_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  generateReadme(project, files) {
    const fileTree = this.buildFileTree(files);
    
    return `# ${project.name}

${project.description || 'No description provided'}

## Project Information

- **Exported from**: GPT-Collab
- **Export Date**: ${new Date().toISOString()}
- **Primary Language**: ${project.settings?.language || 'Not specified'}
- **Total Files**: ${files.filter(f => f.type === 'file').length}

## File Structure

\`\`\`
${fileTree}
\`\`\`

## Getting Started

This project was exported from GPT-Collab, a collaborative code editor with AI assistance.

To get started:
1. Review the project structure above
2. Open the main files in your preferred editor
3. Follow any setup instructions in individual files

## Original Project Settings

- **Theme**: ${project.settings?.theme || 'oceanic-next'}
- **Language**: ${project.settings?.language || 'javascript'}
- **Auto Save**: ${project.settings?.autoSave ? 'Enabled' : 'Disabled'}

---

*Exported from GPT-Collab - Collaborative coding with AI assistance*
`;
  }
  
  buildFileTree(files, indent = '') {
    const tree = [];
    const sortedFiles = files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });
    
    for (const file of sortedFiles) {
      const fileName = path.basename(file.path);
      const prefix = file.type === 'folder' ? '📁' : '📄';
      tree.push(`${indent}${prefix} ${fileName}`);
    }
    
    return tree.join('\n');
  }
  
  // Cleanup expired exports (run as cron job)
  async cleanupExpiredExports() {
    try {
      const expiredExports = await Export.find({
        'result.expiresAt': { $lt: new Date() },
        status: 'completed'
      });
      
      for (const exportRecord of expiredExports) {
        if (exportRecord.result?.filePath) {
          try {
            await fs.unlink(exportRecord.result.filePath);
          } catch (error) {
            console.error('Failed to delete expired export file:', error);
          }
        }
        
        await Export.findByIdAndDelete(exportRecord._id);
      }
      
      console.log(`Cleaned up ${expiredExports.length} expired exports`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = new ExportService();