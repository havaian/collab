// src/execute/service.js
const Execution = require('./model');
const Project = require('../project/model');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Language mapping for Judge0
const LANGUAGE_MAP = {
    'javascript': 63,
    'python': 71,
    'java': 62,
    'cpp': 54,
    'c': 50,
    'csharp': 51,
    'php': 68,
    'ruby': 72,
    'go': 60,
    'rust': 73,
    'swift': 83,
    'kotlin': 78,
    'typescript': 74,
    'bash': 46,
    'sql': 82,
    'r': 80,
    'scala': 81,
    'perl': 85,
    'lua': 64,
    'haskell': 61,
    'pascal': 67,
    'fortran': 59,
    'cobol': 77,
    'assembly': 45,
    'basic': 47,
    'clojure': 86,
    'd': 56,
    'elixir': 57,
    'erlang': 58,
    'fsharp': 87,
    'groovy': 88,
    'objectivec': 79,
    'ocaml': 65,
    'prolog': 69,
    'vbnet': 84
};

class ExecuteService {
    constructor() {
        this.judge0BaseUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
        this.apiKey = process.env.JUDGE0_API_KEY;
        this.apiHost = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

        // Rate limiting for code execution
        this.executionLimiter = rateLimit({
            windowMs: parseInt(process.env.CODE_EXEC_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.CODE_EXEC_LIMIT_PER_USER) || 10,
            keyGenerator: (req) => req.user?.id || req.ip,
            message: { error: 'Too many code executions. Please wait before trying again.' }
        });
    }

    async executeCode({ code, language, stdin = '', userId, projectId, fileId }) {
        const startTime = Date.now();

        try {
            // Verify project access
            const project = await Project.findById(projectId);
            if (!project || !project.hasAccess(userId, 'read')) {
                throw new Error('Project not found or access denied');
            }

            // Get language ID for Judge0
            const languageId = this.getLanguageId(language);
            if (!languageId) {
                throw new Error(`Unsupported language: ${language}`);
            }

            // Create execution record
            const executionId = this.generateExecutionId();

            // Submit code to Judge0
            const submissionResponse = await this.submitToJudge0({
                source_code: Buffer.from(code).toString('base64'),
                language_id: languageId,
                stdin: Buffer.from(stdin).toString('base64')
            });

            const judge0Token = submissionResponse.token;

            // Save execution record
            const execution = new Execution({
                executionId,
                projectId,
                fileId,
                userId,
                code,
                language,
                languageId,
                stdin,
                judge0Token,
                status: 'processing'
            });

            await execution.save();

            // Poll for results
            const result = await this.pollForResult(judge0Token, execution);

            // Update execution time
            execution.executionTime = Date.now() - startTime;
            await execution.save();

            // Update project stats
            await Project.findByIdAndUpdate(projectId, {
                $inc: { 'stats.executions': 1 },
                'stats.lastActivity': new Date()
            });

            return {
                executionId,
                output: result,
                executionTime: execution.executionTime
            };

        } catch (error) {
            console.error('Code execution failed:', error);
            throw new Error(`Execution failed: ${error.message}`);
        }
    }

    async submitToJudge0(payload) {
        const options = {
            method: 'POST',
            url: `${this.judge0BaseUrl}/submissions`,
            params: {
                base64_encoded: 'true',
                fields: '*'
            },
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Host': this.apiHost,
                'X-RapidAPI-Key': this.apiKey,
            },
            data: payload
        };

        try {
            const response = await axios.request(options);
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please wait before submitting again.');
            }
            throw new Error(`Judge0 submission failed: ${error.message}`);
        }
    }

    async pollForResult(token, execution, maxAttempts = 10) {
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const result = await this.getSubmissionResult(token);

                if (result.status.id <= 2) {
                    // Still processing (In Queue = 1, Processing = 2)
                    await this.sleep(2000); // Wait 2 seconds
                    attempts++;
                    continue;
                }

                // Execution completed
                const output = this.processResult(result);

                // Update execution record
                execution.output = output;
                execution.status = this.getExecutionStatus(result.status.id);

                if (result.status.id > 3) {
                    execution.error = output.stderr || output.compile_output || 'Unknown error';
                }

                await execution.save();

                return output;

            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    execution.status = 'failed';
                    execution.error = `Polling failed: ${error.message}`;
                    await execution.save();
                    throw error;
                }
                await this.sleep(1000);
            }
        }

        // Timeout
        execution.status = 'timeout';
        execution.error = 'Execution timed out';
        await execution.save();
        throw new Error('Execution timed out');
    }

    async getSubmissionResult(token) {
        const options = {
            method: 'GET',
            url: `${this.judge0BaseUrl}/submissions/${token}`,
            params: {
                base64_encoded: 'true',
                fields: '*'
            },
            headers: {
                'X-RapidAPI-Host': this.apiHost,
                'X-RapidAPI-Key': this.apiKey,
            }
        };

        const response = await axios.request(options);
        return response.data;
    }

    processResult(result) {
        return {
            stdout: result.stdout ? Buffer.from(result.stdout, 'base64').toString() : null,
            stderr: result.stderr ? Buffer.from(result.stderr, 'base64').toString() : null,
            compile_output: result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : null,
            message: result.message,
            status: result.status,
            time: result.time,
            memory: result.memory,
            token: result.token
        };
    }

    getExecutionStatus(statusId) {
        switch (statusId) {
            case 1:
            case 2:
                return 'processing';
            case 3:
                return 'completed';
            case 4:
                return 'failed'; // Wrong Answer
            case 5:
                return 'timeout'; // Time Limit Exceeded
            case 6:
                return 'failed'; // Compilation Error
            default:
                return 'failed'; // Runtime errors and others
        }
    }

    getLanguageId(language) {
        return LANGUAGE_MAP[language.toLowerCase()] || null;
    }

    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getExecutionHistory(userId, { projectId, limit = 20, page = 1 } = {}) {
        const query = { userId };

        if (projectId) {
            query.projectId = projectId;
        }

        const executions = await Execution.find(query)
            .populate('projectId', 'name')
            .populate('fileId', 'name path')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .select('-code') // Exclude code for privacy in list view
            .lean();

        const total = await Execution.countDocuments(query);

        return {
            executions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getExecutionById(executionId, userId) {
        const execution = await Execution.findOne({ executionId })
            .populate('projectId', 'name')
            .populate('fileId', 'name path')
            .populate('userId', 'username avatar');

        if (!execution) {
            throw new Error('Execution not found');
        }

        // Check if user has access (own execution or project member)
        if (execution.userId._id.toString() !== userId) {
            const project = await Project.findById(execution.projectId);
            if (!project || !project.hasAccess(userId, 'read')) {
                throw new Error('Access denied');
            }
        }

        return execution;
    }

    async deleteExecution(executionId, userId) {
        const execution = await Execution.findOne({ executionId });

        if (!execution) {
            throw new Error('Execution not found');
        }

        // Only execution owner can delete
        if (execution.userId.toString() !== userId) {
            throw new Error('Access denied');
        }

        await Execution.findByIdAndDelete(execution._id);
        return { message: 'Execution deleted successfully' };
    }

    async getExecutionStats(userId, projectId) {
        const matchQuery = { userId };
        if (projectId) {
            matchQuery.projectId = new mongoose.Types.ObjectId(projectId);
        }

        const stats = await Execution.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalExecutions: { $sum: 1 },
                    successfulExecutions: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    failedExecutions: {
                        $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] }
                    },
                    avgExecutionTime: { $avg: '$executionTime' },
                    languageBreakdown: { $push: '$language' }
                }
            }
        ]);

        const result = stats[0] || {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            avgExecutionTime: 0,
            languageBreakdown: []
        };

        // Process language breakdown
        const languageCounts = {};
        result.languageBreakdown.forEach(lang => {
            languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        });

        result.languageBreakdown = languageCounts;
        result.successRate = result.totalExecutions > 0 ?
            (result.successfulExecutions / result.totalExecutions * 100).toFixed(2) : 0;

        return result;
    }
}

module.exports = new ExecuteService();