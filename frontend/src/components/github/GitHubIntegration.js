// Complete GitHub Integration Component
// src/components/github/GitHubIntegration.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import githubService from '../../services/githubService';
import Header from '../shared/Header';
import Button from '../shared/Button';
import {
    CodeBracketSquareIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    StarIcon,
    EyeIcon,
    CalendarIcon,
    LinkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const GitHubIntegration = ({ projectId, onImport }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('all');
    const [sortBy, setSortBy] = useState('updated');
    const [importingRepos, setImportingRepos] = useState(new Map());
    const [importProgress, setImportProgress] = useState(new Map());
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 30,
        total: 0,
        hasMore: false
    });
    const socketRef = useRef(null);

    const isStandalone = !projectId && !onImport;

    useEffect(() => {
        fetchRepositories();
        setupSocketConnection();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const setupSocketConnection = () => {
        // Initialize socket connection for real-time import updates
        socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'https://collab.ytech.space', {
            auth: {
                token: localStorage.getItem('authToken')
            }
        });

        // Listen for GitHub import events
        socketRef.current.on('github:import-start', (data) => {
            const { repositoryId, repositoryName } = data;
            setImportProgress(prev => new Map(prev.set(repositoryId, {
                step: 'starting',
                message: `Starting import of ${repositoryName}...`,
                progress: 10
            })));
        });

        socketRef.current.on('github:import-progress', (data) => {
            const { repositoryId, step, message, progress } = data;
            setImportProgress(prev => new Map(prev.set(repositoryId, {
                step,
                message,
                progress
            })));
        });

        socketRef.current.on('github:import-complete', (data) => {
            const { repositoryId, projectId: newProjectId, repositoryName } = data;
            setImportProgress(prev => new Map(prev.set(repositoryId, {
                step: 'complete',
                message: `Successfully imported ${repositoryName}!`,
                progress: 100
            })));

            toast.success(`Repository "${repositoryName}" imported successfully!`);

            // Remove from importing state after a delay
            setTimeout(() => {
                setImportingRepos(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(repositoryId);
                    return newMap;
                });
                setImportProgress(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(repositoryId);
                    return newMap;
                });

                // Navigate to project if needed
                if (onImport) {
                    onImport({ projectId: newProjectId });
                } else {
                    navigate(`/project/${newProjectId}`);
                }
            }, 2000);
        });

        socketRef.current.on('github:import-error', (data) => {
            const { repositoryId, error, repositoryName } = data;
            setImportProgress(prev => new Map(prev.set(repositoryId, {
                step: 'error',
                message: `Failed to import ${repositoryName}: ${error}`,
                progress: 0
            })));

            setImportingRepos(prev => {
                const newMap = new Map(prev);
                newMap.delete(repositoryId);
                return newMap;
            });

            toast.error(`Import failed: ${error}`);
        });

        // Connection status
        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });
    };

    const fetchRepositories = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await githubService.getRepositories(page, pagination.perPage);
            const newRepos = response?.repositories || [];

            if (page === 1) {
                setRepositories(newRepos);
            } else {
                setRepositories(prev => [...prev, ...newRepos]);
            }

            setPagination({
                page,
                perPage: pagination.perPage,
                total: response?.total_count || 0,
                hasMore: newRepos.length === pagination.perPage
            });
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            setError('Failed to load GitHub repositories. Please check your GitHub connection.');
            setRepositories([]);
        } finally {
            setLoading(false);
        }
    };

    const syncRepository = async (repoUrl) => {
        if (!projectId) return;

        setSyncing(true);
        try {
            await githubService.syncRepository(projectId, repoUrl);
            toast.success('Repository synced successfully!');
            onImport && onImport();
        } catch (error) {
            console.error('Sync failed:', error);
            toast.error('Failed to sync repository');
        } finally {
            setSyncing(false);
        }
    };

    const importRepository = async (repo) => {
        const repositoryId = repo.id.toString();

        // Add to importing state immediately
        setImportingRepos(prev => new Map(prev.set(repositoryId, {
            name: repo.name,
            url: repo.clone_url,
            startTime: Date.now()
        })));

        setImportProgress(prev => new Map(prev.set(repositoryId, {
            step: 'initializing',
            message: 'Preparing to import repository...',
            progress: 5
        })));

        try {
            // Start the import process
            const response = await githubService.importRepository(
                repo.clone_url,
                repo.name,
                repo.description,
                repo.default_branch || 'main'
            );

            toast.info(`Import started for "${repo.name}". Please wait...`);

        } catch (error) {
            console.error('Import failed:', error);

            // Remove from importing state
            setImportingRepos(prev => {
                const newMap = new Map(prev);
                newMap.delete(repositoryId);
                return newMap;
            });

            setImportProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(repositoryId);
                return newMap;
            });

            toast.error(`Failed to start import: ${error.response?.data?.error || error.message}`);
        }
    };

    const cancelImport = (repositoryId) => {
        // Remove from importing state
        setImportingRepos(prev => {
            const newMap = new Map(prev);
            newMap.delete(repositoryId);
            return newMap;
        });

        setImportProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(repositoryId);
            return newMap;
        });

        toast.info('Import cancelled');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getLanguageColor = (language) => {
        const colors = {
            JavaScript: 'bg-yellow-100 text-yellow-800',
            TypeScript: 'bg-blue-100 text-blue-800',
            Python: 'bg-green-100 text-green-800',
            Java: 'bg-red-100 text-red-800',
            'C++': 'bg-purple-100 text-purple-800',
            'C#': 'bg-indigo-100 text-indigo-800',
            PHP: 'bg-violet-100 text-violet-800',
            Ruby: 'bg-pink-100 text-pink-800',
            Go: 'bg-cyan-100 text-cyan-800',
            Rust: 'bg-orange-100 text-orange-800',
            HTML: 'bg-orange-100 text-orange-800',
            CSS: 'bg-blue-100 text-blue-800',
            Vue: 'bg-green-100 text-green-800',
            React: 'bg-cyan-100 text-cyan-800'
        };
        return colors[language] || 'bg-gray-100 text-gray-800';
    };

    const getProgressStepText = (step) => {
        const steps = {
            'initializing': 'Initializing import...',
            'starting': 'Starting import process...',
            'cloning': 'Cloning repository...',
            'analyzing': 'Analyzing repository structure...',
            'creating_project': 'Creating project...',
            'importing_files': 'Importing files...',
            'setting_permissions': 'Setting up permissions...',
            'finalizing': 'Finalizing import...',
            'complete': 'Import complete!',
            'error': 'Import failed'
        };
        return steps[step] || 'Processing...';
    };

    const renderImportButton = (repo) => {
        const repositoryId = repo.id.toString();
        const isImporting = importingRepos.has(repositoryId);
        const progress = importProgress.get(repositoryId);

        if (isImporting && progress) {
            return (
                <div className="min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className="text-sm font-medium text-blue-600">
                                {progress.step === 'error' ? 'Failed' : 'Importing...'}
                            </span>
                        </div>
                        <button
                            onClick={() => cancelImport(repositoryId)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cancel Import"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${progress.step === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${progress.progress}%` }}
                        ></div>
                    </div>

                    {/* Progress Message */}
                    <p className={`text-xs ${progress.step === 'error' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {progress.message}
                    </p>

                    {/* Estimated Time */}
                    {progress.step !== 'error' && progress.step !== 'complete' && (
                        <p className="text-xs text-gray-500 mt-1">
                            This may take a few minutes for large repositories
                        </p>
                    )}
                </div>
            );
        }

        return (
            <Button
                variant="primary"
                onClick={() => importRepository(repo)}
                disabled={isImporting}
                className="flex items-center space-x-2"
            >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Import</span>
            </Button>
        );
    };

    // Get unique languages for filter
    const availableLanguages = [...new Set(repositories
        .map(repo => repo.language)
        .filter(Boolean)
    )].sort();

    const filteredAndSortedRepos = repositories
        .filter(repo => {
            const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesLanguage = selectedLanguage === 'all' || repo.language === selectedLanguage;
            return matchesSearch && matchesLanguage;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'stars':
                    return b.stargazers_count - a.stargazers_count;
                case 'updated':
                default:
                    return new Date(b.updated_at) - new Date(a.updated_at);
            }
        });

    return (
        <div className="min-h-screen bg-gray-50">
            {isStandalone && <Header />}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        GitHub Integration
                    </h1>
                    <p className="text-gray-600">
                        Import repositories from your GitHub account to create new projects.
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                        {/* Search */}
                        <div className="flex-1 max-w-lg">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search repositories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex space-x-4">
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Languages</option>
                                {availableLanguages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="updated">Recently Updated</option>
                                <option value="name">Name A-Z</option>
                                <option value="stars">Most Stars</option>
                            </select>

                            <Button
                                variant="ghost"
                                onClick={() => fetchRepositories(1)}
                                disabled={loading}
                                className="flex items-center space-x-2"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading && repositories.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600">Loading repositories...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button
                            variant="primary"
                            onClick={() => fetchRepositories(1)}
                            className="flex items-center space-x-2 mx-auto"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                            <span>Retry</span>
                        </Button>
                    </div>
                ) : filteredAndSortedRepos.length === 0 ? (
                    <div className="text-center py-12">
                        <CodeBracketSquareIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">
                            {searchTerm || selectedLanguage !== 'all'
                                ? 'No repositories match your search criteria.'
                                : 'No repositories found.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Repository List */}
                        <div className="space-y-4 mb-6">
                            {filteredAndSortedRepos.map((repo) => (
                                <div
                                    key={repo.id}
                                    className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            {/* Repository Header */}
                                            <div className="flex items-center space-x-3 mb-3">
                                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                    {repo.name}
                                                </h3>

                                                <div className="flex items-center space-x-2">
                                                    {repo.private && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Private
                                                        </span>
                                                    )}
                                                    {repo.language && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLanguageColor(repo.language)}`}>
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                    {repo.fork && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            Fork
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {repo.description && (
                                                <p className="text-gray-600 mb-3 line-clamp-2">
                                                    {repo.description}
                                                </p>
                                            )}

                                            {/* Repository Stats */}
                                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                                                <div className="flex items-center space-x-1">
                                                    <StarIcon className="h-4 w-4" />
                                                    <span>{repo.stargazers_count.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <EyeIcon className="h-4 w-4" />
                                                    <span>{repo.watchers_count.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <CodeBracketSquareIcon className="h-4 w-4" />
                                                    <span>{repo.forks_count.toLocaleString()} forks</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span>Updated {formatDate(repo.updated_at)}</span>
                                                </div>
                                                {repo.size && (
                                                    <div className="flex items-center space-x-1">
                                                        <span>{(repo.size / 1024).toFixed(1)} MB</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Topics/Tags */}
                                            {repo.topics && repo.topics.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-3">
                                                    {repo.topics.slice(0, 5).map(topic => (
                                                        <span
                                                            key={topic}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                                                        >
                                                            {topic}
                                                        </span>
                                                    ))}
                                                    {repo.topics.length > 5 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700">
                                                            +{repo.topics.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <div className="ml-6 flex-shrink-0">
                                            {renderImportButton(repo)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {pagination.hasMore && (
                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => fetchRepositories(pagination.page + 1)}
                                    disabled={loading}
                                    className="flex items-center space-x-2 mx-auto"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <span>Load More Repositories</span>
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {/* Active Imports Summary */}
                {importingRepos.size > 0 && (
                    <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            Active Imports ({importingRepos.size})
                        </h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                            {Array.from(importingRepos.entries()).map(([repoId, repoInfo]) => {
                                const progress = importProgress.get(repoId);
                                return (
                                    <div key={repoId} className="text-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-900 truncate">
                                                {repoInfo.name}
                                            </span>
                                            <button
                                                onClick={() => cancelImport(repoId)}
                                                className="text-gray-400 hover:text-gray-600 ml-2"
                                            >
                                                <XMarkIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                        {progress && (
                                            <>
                                                <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                                    <div
                                                        className={`h-1 rounded-full transition-all duration-300 ${progress.step === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                                            }`}
                                                        style={{ width: `${progress.progress}%` }}
                                                    ></div>
                                                </div>
                                                <p className={`text-xs ${progress.step === 'error' ? 'text-red-600' : 'text-gray-600'
                                                    }`}>
                                                    {getProgressStepText(progress.step)}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GitHubIntegration;