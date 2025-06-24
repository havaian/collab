// frontend/src/components/projects/ProjectDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import { toast } from 'react-toastify';
import Header from '../shared/Header';
import Button from '../shared/Button';
import {
    PlusIcon,
    FolderIcon,
    GlobeAltIcon,
    LockClosedIcon,
    CalendarIcon,
    MagnifyingGlassIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';

const ProjectDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [publicProjects, setPublicProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [activeTab, setActiveTab] = useState('my-projects');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('updatedAt');
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        isPublic: false,
        language: 'javascript'
    });
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
        if (activeTab === 'explore') {
            loadPublicProjects();
        }
    }, [activeTab, searchTerm, sortBy]);

    const loadProjects = async () => {
        try {
            const response = await apiService.getProjects({
                search: searchTerm,
                sortBy: sortBy
            });
            setProjects(response.projects);
        } catch (error) {
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const loadPublicProjects = async () => {
        try {
            const response = await apiService.getPublicProjects({
                search: searchTerm
            });
            setPublicProjects(response.projects);
        } catch (error) {
            toast.error('Failed to load public projects');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            const response = await apiService.createProject(newProject);
            setProjects([response.project, ...projects]);
            setShowCreateModal(false);
            setNewProject({ name: '', description: '', isPublic: false, language: 'javascript' });
            toast.success('Project created successfully!');
        } catch (error) {
            toast.error('Failed to create project');
        }
    };

    const handleDeleteProject = async (projectId, projectName) => {
        if (!window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await apiService.deleteProject(projectId);
            setProjects(projects.filter(p => p._id !== projectId));
            toast.success('Project deleted successfully');
        } catch (error) {
            toast.error('Failed to delete project');
        }
    };

    const handleProjectClick = (projectId) => {
        navigate(`/project/${projectId}`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getLanguageIcon = (language) => {
        const icons = {
            javascript: '🟨',
            typescript: '🔷',
            python: '🐍',
            java: '☕',
            cpp: '⚡',
            csharp: '🔵',
            php: '🐘',
            ruby: '💎',
            go: '🐹',
            rust: '🦀'
        };
        return icons[language] || '📄';
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Loading your projects...</p>
                </div>
            </div>
        );
    }

    // Header actions - empty for dashboard since we moved buttons to main content
    const headerActions = [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header
                title="Dashboard"
                subtitle="Collaborative coding with AI"
                actions={headerActions}
            />

            {/* Main Content - 85% height */}
            <main className="h-[85vh] overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('my-projects')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'my-projects'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                My Projects ({projects.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('explore')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'explore'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <GlobeAltIcon className="h-4 w-4 inline mr-1" />
                                Explore Public
                            </button>
                        </nav>
                    </div>

                    {/* Search and Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4 w-full md:flex-1">
                            <div className="relative flex-1 md:max-w-md">
                                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            </div>

                            {activeTab === 'my-projects' && (
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="updatedAt">Recently Updated</option>
                                    <option value="createdAt">Recently Created</option>
                                    <option value="name">Name A-Z</option>
                                </select>
                            )}
                        </div>

                        {/* Action Buttons - Only show for my-projects tab */}
                        {activeTab === 'my-projects' && (
                            <div className="flex space-x-3 w-full md:w-auto">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center space-x-2 flex-1 md:flex-initial"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span>Import from GitHub</span>
                                </Button>

                                <Button
                                    variant="primary"
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center space-x-2 flex-1 md:flex-initial"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    <span>New Project</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {activeTab === 'my-projects' ? (
                        <div>
                            {filteredProjects.length === 0 ? (
                                <div className="text-center py-12">
                                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {searchTerm ? 'No projects found' : 'No projects yet'}
                                    </h3>
                                    <p className="text-gray-500 mb-6">
                                        {searchTerm
                                            ? 'Try adjusting your search terms or create a new project.'
                                            : 'Create your first collaborative project to get started.'
                                        }
                                    </p>
                                    {!searchTerm && (
                                        <div className="space-x-3">
                                            <Button
                                                variant="primary"
                                                onClick={() => setShowCreateModal(true)}
                                                className="inline-flex items-center"
                                            >
                                                <PlusIcon className="h-4 w-4 mr-2" />
                                                Create Project
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowImportModal(true)}
                                                className="inline-flex items-center"
                                            >
                                                Import from GitHub
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProjects.map((project) => (
                                        <ProjectCard
                                            key={project._id}
                                            project={project}
                                            onProjectClick={handleProjectClick}
                                            onDeleteProject={handleDeleteProject}
                                            formatDate={formatDate}
                                            getLanguageIcon={getLanguageIcon}
                                            isOwner={project.owner._id === user.id || project.owner === user.id}
                                            navigate={navigate}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            {publicProjects.length === 0 ? (
                                <div className="text-center py-12">
                                    <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No public projects found
                                    </h3>
                                    <p className="text-gray-500">
                                        {searchTerm ? 'Try adjusting your search terms.' : 'Be the first to make a project public!'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publicProjects.map((project) => (
                                        <PublicProjectCard
                                            key={project._id}
                                            project={project}
                                            onProjectClick={() => navigate(`/public/${project._id}`)}
                                            formatDate={formatDate}
                                            getLanguageIcon={getLanguageIcon}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Project Modal */}
            {showCreateModal && (
                <CreateProjectModal
                    newProject={newProject}
                    setNewProject={setNewProject}
                    onSubmit={handleCreateProject}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {/* Import Project Modal */}
            {showImportModal && (
                <ImportProjectModal
                    onClose={() => setShowImportModal(false)}
                    onImportSuccess={() => {
                        setShowImportModal(false);
                        loadProjects();
                    }}
                />
            )}
        </div>
    );
};

// Project Card Component
const ProjectCard = ({ project, onProjectClick, onDeleteProject, formatDate, getLanguageIcon, isOwner, navigate }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative">
            <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onProjectClick(project._id)}
                    >
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">{getLanguageIcon(project.settings?.language)}</span>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {project.name}
                            </h3>
                            <div className="flex items-center space-x-1">
                                {project.isPublic ? (
                                    <GlobeAltIcon className="h-4 w-4 text-green-500" title="Public" />
                                ) : (
                                    <LockClosedIcon className="h-4 w-4 text-gray-400" title="Private" />
                                )}
                                {project.githubRepo?.isConnected && (
                                    <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {project.description || 'No description provided'}
                        </p>
                    </div>

                    {isOwner && (
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDropdown(!showDropdown);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <Cog6ToothIcon className="h-5 w-5" />
                            </Button>

                            {showDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                    <div className="py-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/project/${project._id}/settings`);
                                                setShowDropdown(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Settings
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteProject(project._id, project.name);
                                                setShowDropdown(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Delete Project
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(project.createdAt)}
                        </span>
                        <span>{project.settings?.language || 'No language'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {project.collaborators && project.collaborators.length > 0 && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {project.stats?.fileCount || 0} files
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Public Project Card Component
const PublicProjectCard = ({ project, onProjectClick, formatDate, getLanguageIcon }) => {
    return (
        <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={onProjectClick}
        >
            <div className="p-6">
                <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getLanguageIcon(project.settings?.language)}</span>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.name}
                    </h3>
                    <GlobeAltIcon className="h-4 w-4 text-green-500" title="Public" />
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>by {project.owner?.username}</span>
                    <div className="flex items-center space-x-2">
                        <span>{project.settings?.language}</span>
                        <span>•</span>
                        <span>{formatDate(project.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Create Project Modal Component
const CreateProjectModal = ({ newProject, setNewProject, onSubmit, onClose }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Create New Project
                    </h3>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={newProject.name}
                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="My Awesome Project"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={newProject.description}
                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="3"
                                placeholder="Describe your project..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Primary Language
                            </label>
                            <select
                                value={newProject.language}
                                onChange={(e) => setNewProject({ ...newProject, language: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="csharp">C#</option>
                                <option value="php">PHP</option>
                                <option value="ruby">Ruby</option>
                                <option value="go">Go</option>
                                <option value="rust">Rust</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={newProject.isPublic}
                                    onChange={(e) => setNewProject({ ...newProject, isPublic: e.target.checked })}
                                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Make project public</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                                Public projects can be viewed by anyone
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="flex items-center space-x-2 flex-1 md:flex-initial"
                            >
                                <span>Cancel</span>
                            </Button>
                            <Button
                                type="submit"
                                variant="ghost"
                                className="flex items-center space-x-2 flex-1 md:flex-initial"
                            >
                                <span>Create Project</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Import Project Modal Component (placeholder)
const ImportProjectModal = ({ onClose, onImportSuccess }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Import from GitHub
                    </h3>
                    <p className="text-gray-600 mb-4">
                        GitHub import functionality coming soon! You'll be able to import entire repositories directly into your projects.
                    </p>
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex items-center space-x-2 flex-1 md:flex-initial"
                        >
                            <span>Close</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDashboard;