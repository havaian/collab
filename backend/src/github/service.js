// src/github/service.js
const { Octokit } = require('@octokit/rest');
const Project = require('../project/model');
const File = require('../file/model');
const User = require('../auth/model');

class GitHubService {
  constructor() {
    this.maxFilesPerSync = 100;
    this.maxFileSize = 1024 * 1024; // 1MB per file
    this.allowedExtensions = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.php', '.rb', '.go', '.rs', '.html', '.css', '.scss', '.json',
      '.md', '.txt', '.yml', '.yaml', '.xml', '.sql'
    ];
  }
  
  async getUserOctokit(userId) {
    const user = await User.findById(userId);
    const accessToken = user.getDecryptedAccessToken();
    
    if (!accessToken) {
      throw new Error('GitHub access token not available. Please reconnect your GitHub account.');
    }
    
    return new Octokit({ auth: accessToken });
  }
  
  async getUserRepositories(userId, { page = 1, limit = 30, sort = 'updated' } = {}) {
    try {
      const octokit = await this.getUserOctokit(userId);
      
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort,
        direction: 'desc',
        per_page: limit,
        page
      });
      
      return {
        repositories: response.data.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          isPrivate: repo.private,
          language: repo.language,
          defaultBranch: repo.default_branch,
          updatedAt: repo.updated_at,
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          size: repo.size,
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count
        })),
        hasMore: response.data.length === limit
      };
    } catch (error) {
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }
  
  async getRepositoryContents(userId, repoFullName, path = '', branch = 'main') {
    try {
      const octokit = await this.getUserOctokit(userId);
      const [owner, repo] = repoFullName.split('/');
      
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      
      // Handle both single file and directory responses
      const contents = Array.isArray(response.data) ? response.data : [response.data];
      
      return contents.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type, // 'file' or 'dir'
        size: item.size,
        sha: item.sha,
        downloadUrl: item.download_url,
        url: item.html_url
      }));
    } catch (error) {
      if (error.status === 404) {
        throw new Error('Repository or path not found');
      }
      throw new Error(`Failed to fetch repository contents: ${error.message}`);
    }
  }
  
  async importRepositoryToProject(userId, projectId, repoFullName, options = {}) {
    try {
      // Verify project access
      const project = await Project.findById(projectId);
      if (!project || !project.hasAccess(userId, 'write')) {
        throw new Error('Project not found or access denied');
      }
      
      const {
        branch = 'main',
        includePaths = [],
        excludePaths = ['.git', 'node_modules', '.env', '*.log'],
        maxDepth = 5
      } = options;
      
      const octokit = await this.getUserOctokit(userId);
      const [owner, repo] = repoFullName.split('/');
      
      // Get repository info
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      
      // Update project with GitHub repo info
      project.githubRepo = {
        url: repoInfo.data.html_url,
        branch,
        isConnected: true,
        lastSync: new Date()
      };
      
      if (!project.description && repoInfo.data.description) {
        project.description = repoInfo.data.description;
      }
      
      if (repoInfo.data.language && !project.settings.language) {
        project.settings.language = this.mapGitHubLanguage(repoInfo.data.language);
      }
      
      await project.save();
      
      // Import files recursively
      const importedFiles = await this.importDirectoryRecursive(
        octokit, owner, repo, branch, '', userId, projectId, {
          excludePaths,
          includePaths,
          maxDepth,
          currentDepth: 0
        }
      );
      
      // Update project stats
      await this.updateProjectStats(projectId);
      
      return {
        importedFiles: importedFiles.length,
        repository: {
          name: repoInfo.data.name,
          fullName: repoInfo.data.full_name,
          branch,
          language: repoInfo.data.language
        }
      };
      
    } catch (error) {
      throw new Error(`Repository import failed: ${error.message}`);
    }
  }
  
  async importDirectoryRecursive(octokit, owner, repo, branch, path, userId, projectId, options) {
    const { excludePaths, includePaths, maxDepth, currentDepth } = options;
    
    if (currentDepth >= maxDepth) {
      return [];
    }
    
    const contents = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });
    
    const importedFiles = [];
    const items = Array.isArray(contents.data) ? contents.data : [contents.data];
    
    for (const item of items) {
      // Check if path should be excluded
      if (this.shouldExcludePath(item.path, excludePaths)) {
        continue;
      }
      
      // Check if path should be included (if includePaths is specified)
      if (includePaths.length > 0 && !this.shouldIncludePath(item.path, includePaths)) {
        continue;
      }
      
      if (item.type === 'dir') {
        // Create folder
        const folder = await this.createProjectFile(userId, projectId, {
          name: item.name,
          path: item.path,
          type: 'folder'
        });
        
        importedFiles.push(folder);
        
        // Recursively import subdirectory
        const subFiles = await this.importDirectoryRecursive(
          octokit, owner, repo, branch, item.path, userId, projectId, {
            ...options,
            currentDepth: currentDepth + 1
          }
        );
        
        importedFiles.push(...subFiles);
        
      } else if (item.type === 'file') {
        // Check file extension
        if (!this.isAllowedFileType(item.name)) {
          continue;
        }
        
        // Check file size
        if (item.size > this.maxFileSize) {
          console.warn(`Skipping large file: ${item.path} (${item.size} bytes)`);
          continue;
        }
        
        // Download file content
        const fileContent = await this.downloadFileContent(octokit, owner, repo, item.path, branch);
        
        // Create file in project
        const file = await this.createProjectFile(userId, projectId, {
          name: item.name,
          path: item.path,
          content: fileContent,
          type: 'file'
        });
        
        importedFiles.push(file);
      }
      
      // Limit total files to prevent abuse
      if (importedFiles.length >= this.maxFilesPerSync) {
        console.warn(`Reached maximum file limit (${this.maxFilesPerSync}), stopping import`);
        break;
      }
    }
    
    return importedFiles;
  }
  
  async downloadFileContent(octokit, owner, repo, path, branch) {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      
      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf8');
      }
      
      return response.data.content || '';
    } catch (error) {
      console.error(`Failed to download file ${path}:`, error);
      return `// Failed to download file: ${error.message}`;
    }
  }
  
  async createProjectFile(userId, projectId, fileData) {
    try {
      // Check if file already exists
      const existingFile = await File.findOne({
        projectId,
        path: fileData.path,
        isDeleted: false
      });
      
      if (existingFile) {
        // Update existing file
        existingFile.content = fileData.content || existingFile.content;
        existingFile.lastModifiedBy = userId;
        await existingFile.save();
        return existingFile;
      }
      
      // Create new file
      const language = fileData.type === 'file' ? File.detectLanguage(fileData.name) : null;
      
      const file = new File({
        name: fileData.name,
        path: fileData.path,
        content: fileData.content || '',
        language,
        projectId,
        createdBy: userId,
        lastModifiedBy: userId,
        type: fileData.type || 'file'
      });
      
      await file.save();
      return file;
    } catch (error) {
      console.error(`Failed to create file ${fileData.path}:`, error);
      throw error;
    }
  }
  
  async syncProjectWithRepository(userId, projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project || !project.hasAccess(userId, 'write')) {
        throw new Error('Project not found or access denied');
      }
      
      if (!project.githubRepo?.url || !project.githubRepo?.isConnected) {
        throw new Error('Project is not connected to a GitHub repository');
      }
      
      // Extract repo info from URL
      const repoMatch = project.githubRepo.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }
      
      const [, owner, repoName] = repoMatch;
      const repoFullName = `${owner}/${repoName.replace('.git', '')}`;
      const branch = project.githubRepo.branch || 'main';
      
      // Get latest commit to check if sync is needed
      const octokit = await this.getUserOctokit(userId);
      const latestCommit = await octokit.rest.repos.getBranch({
        owner,
        repo: repoName.replace('.git', ''),
        branch
      });
      
      const lastSyncDate = project.githubRepo.lastSync;
      const latestCommitDate = new Date(latestCommit.data.commit.commit.committer.date);
      
      if (lastSyncDate && latestCommitDate <= lastSyncDate) {
        return {
          message: 'Repository is already up to date',
          lastSync: lastSyncDate,
          latestCommit: latestCommitDate
        };
      }
      
      // Perform incremental sync (for now, we'll do a full reimport)
      // In a more advanced implementation, you could track file SHAs and only update changed files
      const result = await this.importRepositoryToProject(userId, projectId, repoFullName, {
        branch
      });
      
      return {
        ...result,
        message: 'Repository synchronized successfully',
        lastSync: new Date(),
        latestCommit: latestCommitDate
      };
      
    } catch (error) {
      throw new Error(`Repository sync failed: ${error.message}`);
    }
  }
  
  async createGitHubRepository(userId, projectId, repoOptions = {}) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project || !project.hasAccess(userId, 'admin')) {
        throw new Error('Project not found or insufficient permissions');
      }
      
      const octokit = await this.getUserOctokit(userId);
      
      const {
        name = project.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
        description = project.description,
        isPrivate = !project.isPublic,
        includeReadme = true,
        license = null
      } = repoOptions;
      
      // Create repository
      const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
        auto_init: includeReadme
      });
      
      const repo = repoResponse.data;
      
      // Update project with repository info
      project.githubRepo = {
        url: repo.html_url,
        branch: repo.default_branch,
        isConnected: true,
        lastSync: new Date()
      };
      await project.save();
      
      // Push project files to repository
      await this.pushProjectFilesToRepo(userId, projectId, repo.full_name, repo.default_branch);
      
      return {
        repository: {
          name: repo.name,
          fullName: repo.full_name,
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          isPrivate: repo.private
        },
        filesUploaded: await File.countDocuments({ projectId, isDeleted: false, type: 'file' })
      };
      
    } catch (error) {
      if (error.status === 422) {
        throw new Error('Repository name already exists or is invalid');
      }
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
    }
  }
  
  async pushProjectFilesToRepo(userId, projectId, repoFullName, branch = 'main') {
    try {
      const octokit = await this.getUserOctokit(userId);
      const [owner, repo] = repoFullName.split('/');
      
      // Get project files
      const files = await File.find({
        projectId,
        isDeleted: false,
        type: 'file'
      }).sort({ path: 1 });
      
      if (files.length === 0) {
        return { message: 'No files to push' };
      }
      
      // Get the latest commit SHA
      const branchResponse = await octokit.rest.repos.getBranch({
        owner,
        repo,
        branch
      });
      
      const latestCommitSha = branchResponse.data.commit.sha;
      
      // Create a tree with all files
      const tree = await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content || ''
        }))
      );
      
      // Create tree
      const treeResponse = await octokit.rest.git.createTree({
        owner,
        repo,
        tree,
        base_tree: latestCommitSha
      });
      
      // Create commit
      const commitResponse = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Import from GPT-Collab project: ${await Project.findById(projectId).then(p => p.name)}`,
        tree: treeResponse.data.sha,
        parents: [latestCommitSha]
      });
      
      // Update branch reference
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commitResponse.data.sha
      });
      
      return {
        message: 'Files pushed successfully',
        commitSha: commitResponse.data.sha,
        filesCount: files.length
      };
      
    } catch (error) {
      throw new Error(`Failed to push files to repository: ${error.message}`);
    }
  }
  
  async disconnectRepository(userId, projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project || !project.hasAccess(userId, 'admin')) {
        throw new Error('Project not found or insufficient permissions');
      }
      
      project.githubRepo = {
        url: null,
        branch: null,
        isConnected: false,
        lastSync: null
      };
      
      await project.save();
      
      return { message: 'Repository disconnected successfully' };
    } catch (error) {
      throw new Error(`Failed to disconnect repository: ${error.message}`);
    }
  }
  
  // Utility methods
  shouldExcludePath(path, excludePaths) {
    return excludePaths.some(excludePattern => {
      if (excludePattern.includes('*')) {
        const regex = new RegExp(excludePattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.includes(excludePattern);
    });
  }
  
  shouldIncludePath(path, includePaths) {
    if (includePaths.length === 0) return true;
    
    return includePaths.some(includePattern => {
      if (includePattern.includes('*')) {
        const regex = new RegExp(includePattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.startsWith(includePattern);
    });
  }
  
  isAllowedFileType(filename) {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }
  
  mapGitHubLanguage(githubLanguage) {
    const languageMap = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Python': 'python',
      'Java': 'java',
      'C++': 'cpp',
      'C': 'c',
      'C#': 'csharp',
      'PHP': 'php',
      'Ruby': 'ruby',
      'Go': 'go',
      'Rust': 'rust',
      'Swift': 'swift',
      'Kotlin': 'kotlin',
      'HTML': 'html',
      'CSS': 'css',
      'SCSS': 'scss'
    };
    
    return languageMap[githubLanguage] || 'plaintext';
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
}

module.exports = new GitHubService();