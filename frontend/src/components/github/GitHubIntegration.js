// src/components/github/GitHubIntegration.js
import React, { useState, useEffect } from 'react';
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
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const GitHubIntegration = ({ projectId, onImport }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('all');
    const [sortBy, setSortBy] = useState('updated');

    const isStandalone = !projectId && !onImport;

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        setLoading(true);
        try {
            const response = await githubService.getRepositories();
            // Fix: Safely handle the response structure
            setRepositories(response?.repositories || []);
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            setRepositories([]); // Set empty array on error
            toast.error('Failed to load GitHub repositories');
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
        setSyncing(true);
        try {
            const response = await githubService.importRepository(
                repo.clone_url,
                repo.name,
                repo.description
            );
            toast.success(`Repository "${repo.name}" imported successfully!`);

            if (onImport) {
                onImport(response);
            } else {
                // Navigate to the new project
                navigate(`/project/${response.projectId}`);
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Failed to import repository');
        } finally {
            setSyncing(false);
        }
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
            Rust: 'bg-orange-100 text-orange-800'
        };
        return colors[language] || 'bg-gray-100 text-gray-800';
    };

    const filteredAndSortedRepos = repositories
        .filter(repo => {
            const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                repo.description?.toLowerCase().includes(searchTerm.toLowerCase());
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

    const uniqueLanguages = [...new Set(repositories.map(repo => repo.language).filter(Boolean))];

    if (loading && repositories.length === 0) {
        return (
            <>
                {isStandalone && (
                    <Header
                        title="GitHub Integration"
                        subtitle="Import and sync your repositories"
                        showBackButton={true}
                        backPath="/"
                    />
                )}
                <div className={`${isStandalone ? 'min-h-[85vh]' : 'h-96'} flex items-center justify-center ${isStandalone ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50' : ''}`}>
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Loading your GitHub repositories...</p>
                    </div>
                </div>
            </>
        );
    }

    const content = (
        <div className={`${isStandalone ? 'min-h-[85vh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8' : ''}`}>
            <div className={`${isStandalone ? 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8' : ''} space-y-6`}>

                {/* Header Section for Standalone */}
                {isStandalone && (
                    <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                        <div className="flex items-center text-left space-x-4 mb-4">
                            <div className="bg-gray-900 p-3 rounded-full">
                                <CodeBracketSquareIcon className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">GitHub Integration</h1>
                                <p className="text-gray-600">Import repositories and sync your projects with GitHub</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <ArrowDownTrayIcon className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium text-blue-900">Import</span>
                                </div>
                                <p className="text-sm text-blue-600">
                                    Import existing repositories as new projects
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <ArrowPathIcon className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-green-900">Sync</span>
                                </div>
                                <p className="text-sm text-green-600">
                                    Keep your projects in sync with GitHub
                                </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <CodeBracketSquareIcon className="h-5 w-5 text-purple-600" />
                                    <span className="font-medium text-purple-900">Collaborate</span>
                                </div>
                                <p className="text-sm text-purple-600">
                                    Work together on GitHub-backed projects
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className={`${isStandalone ? 'bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900' : 'bg-gray-50 rounded-lg border-2 border-gray-200'} p-6`}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Your Repositories ({repositories.length})
                            </h3>
                            <Button
                                onClick={fetchRepositories}
                                disabled={loading}
                                variant="ghost"
                                className="flex items-center space-x-2"
                            >
                                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                <span className="text-sm">{loading ? 'Loading...' : 'Refresh'}</span>
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                            {/* Search */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search repositories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Language Filter */}
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Languages</option>
                                {uniqueLanguages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="updated">Recently Updated</option>
                                <option value="name">Name</option>
                                <option value="stars">Stars</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Repositories List */}
                {filteredAndSortedRepos.length === 0 ? (
                    <div className={`${isStandalone ? 'bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900' : 'bg-gray-50 rounded-lg border-2 border-gray-200'} p-12 text-center`}>
                        <CodeBracketSquareIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {repositories.length === 0 ? 'No repositories found' : 'No matching repositories'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {repositories.length === 0
                                ? 'Connect your GitHub account to see your repositories here.'
                                : 'Try adjusting your search or filter criteria.'
                            }
                        </p>
                        {repositories.length === 0 && (
                            <Button onClick={fetchRepositories}>
                                Connect GitHub
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredAndSortedRepos.map(repo => (
                            <div
                                key={repo.id}
                                className={`${isStandalone ? 'bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 hover:shadow-none hover:translate-x-1 hover:translate-y-1' : 'bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'} transition-all duration-200 p-6`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <CodeBracketSquareIcon className="h-5 w-5 text-gray-600" />
                                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                {repo.name}
                                            </h3>
                                            {repo.private && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Private
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                            {repo.description || 'No description provided'}
                                        </p>

                                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                                            {repo.language && (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLanguageColor(repo.language)}`}>
                                                    {repo.language}
                                                </span>
                                            )}
                                            <div className="flex items-center space-x-1">
                                                <StarIcon className="h-4 w-4" />
                                                <span>{repo.stargazers_count}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <CalendarIcon className="h-4 w-4" />
                                                <span>{formatDate(repo.updated_at)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                <LinkIcon className="h-4 w-4 mr-1" />
                                                View on GitHub
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                                    {projectId ? (
                                        <Button
                                            onClick={() => syncRepository(repo.clone_url)}
                                            disabled={syncing}
                                            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <ArrowPathIcon className="h-4 w-4" />
                                            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => importRepository(repo)}
                                            disabled={syncing}
                                            className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            <span>{syncing ? 'Importing...' : 'Import'}</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    if (isStandalone) {
        return (
            <>
                <Header
                    title="GitHub Integration"
                    subtitle={`${repositories.length} repositories available`}
                    showBackButton={true}
                    backPath="/"
                    actions={[
                        <Button
                            key="refresh"
                            variant="ghost"
                            onClick={fetchRepositories}
                            disabled={loading}
                            className="flex items-center space-x-2"
                        >
                            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="text-sm">{loading ? 'Loading...' : 'Refresh'}</span>
                        </Button>
                    ]}
                />
                {content}
            </>
        );
    }

    return content;
};

export default GitHubIntegration;