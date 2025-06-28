const axios = require('axios');
const User = require('../auth/model');
const Project = require('../project/model');

class GitHubService {
    async getUserRepositories(userId, page = 1, per_page = 30) {
        const user = await User.findById(userId);
        if (!user || !user.githubAccessToken) {
            // Return empty array instead of throwing error for better UX
            return [];
        }

        try {
            const response = await axios.get('https://api.github.com/user/repos', {
                headers: {
                    'Authorization': `token ${user.githubAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    sort: 'updated',
                    direction: 'desc',
                    page,
                    per_page
                }
            });

            console.log(response.data);
            return response.data || [];
        } catch (error) {
            console.error('GitHub API error:', error.response?.data || error.message);
            // Return empty array instead of throwing error for better UX
            return [];
        }
    }

    async syncRepository(projectId, repositoryUrl, branch, userId) {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can sync repository');
        }

        const user = await User.findById(userId);

        // Fetch and create files
        const files = await this.fetchRepositoryFiles(user, repositoryUrl, branch);
        await this.createFilesFromGitHub(projectId, files, user);

        // Update project with GitHub info
        project.githubRepo = {
            url: repositoryUrl,
            branch,
            lastSync: new Date()
        };

        await project.save();

        return { message: 'Repository synced successfully', fileCount: files.length };
    }

    async importRepository(repositoryUrl, name, description, branch, userId) {
        const user = await User.findById(userId);

        // Create new project
        const project = new Project({
            name,
            description,
            owner: userId,
            githubRepo: {
                url: repositoryUrl,
                branch,
                lastSync: new Date()
            }
        });

        await project.save();

        // Fetch and create files
        const files = await this.fetchRepositoryFiles(user, repositoryUrl, branch);
        await this.createFilesFromGitHub(project._id, files, user);

        return project;
    }

    async fetchRepositoryFiles(user, repositoryUrl, branch = 'main') {
        try {
            // Extract owner and repo from URL - handle multiple URL formats
            let repoMatch;

            const patterns = [
                /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
                /github\.com\/([^\/]+)\/([^\/]+)/,
            ];

            for (const pattern of patterns) {
                repoMatch = repositoryUrl.match(pattern);
                if (repoMatch) {
                    console.log('URL pattern matched:', pattern.toString());
                    break;
                }
            }

            if (!repoMatch) {
                console.log('No URL patterns matched');
                throw new Error('Invalid GitHub repository URL format');
            }

            const [, owner, repo] = repoMatch;

            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

            // Get repository tree
            const response = await axios.get(apiUrl, {
                headers: {
                    'Authorization': `token ${user.githubAccessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.data.tree || [];
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Repository not found or branch does not exist');
            } else if (error.response?.status === 403) {
                throw new Error('Access denied - check repository permissions');
            } else if (error.response?.status === 401) {
                throw new Error('GitHub authentication failed');
            } else {
                throw new Error(`Failed to fetch repository files: ${error.message}`);
            }
        }
    }

    async createFilesFromGitHub(projectId, files, user) {
        const File = require('../file/model');

        for (const file of files) {
            if (file.type === 'blob') { // Only process files, not directories
                try {
                    // Fetch file content
                    const contentResponse = await axios.get(file.url, {
                        headers: {
                            'Authorization': `token ${user.githubAccessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    const content = contentResponse.data.encoding === 'base64'
                        ? Buffer.from(contentResponse.data.content, 'base64').toString('utf-8')
                        : contentResponse.data.content;

                    // Create file in database
                    const newFile = new File({
                        name: file.path.split('/').pop(),
                        path: file.path,
                        content: content,
                        language: this.detectLanguage(file.path),
                        projectId: projectId,
                        createdBy: user._id,
                        lastModifiedBy: user._id,
                        type: 'file'
                    });

                    await newFile.save();
                } catch (error) {
                    console.error(`Failed to create file ${file.path}:`, error);
                    // Continue with other files
                }
            }
        }
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'txt': 'plaintext'
        };
        return languageMap[ext] || 'plaintext';
    }
}

module.exports = new GitHubService();