// frontend/src/components/projects/ProjectDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import githubService from '../../services/githubService';
import { toast } from 'react-toastify';
import Header from '../shared/Header';
import Button from '../shared/Button';
import io from 'socket.io-client';
import {
    ArrowPathIcon,
    StarIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    FolderIcon,
    GlobeAltIcon,
    LockClosedIcon,
    CalendarIcon,
    MagnifyingGlassIcon,
    Cog6ToothIcon,
    BellIcon,
    ExclamationTriangleIcon,
    CodeBracketSquareIcon,
    EnvelopeIcon,
    UserIcon,
    ClockIcon,
    XMarkIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

const ProjectDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [publicProjects, setPublicProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [activeTab, setActiveTab] = useState('my-projects');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        isPublic: false,
        language: 'javascript'
    });

    const { user } = useAuth();
    const navigate = useNavigate();
    const [pendingInvites, setPendingInvites] = useState([]);
    const [inviteCount, setInviteCount] = useState(0);

    const [importingRepos, setImportingRepos] = useState(new Map());
    const [importProgress, setImportProgress] = useState(new Map());
    const socketRef = useRef(null);

    useEffect(() => {
        loadProjects();
        if (activeTab === 'explore') {
            loadPublicProjects();
        }
        // ADD THIS: Setup socket connection for real-time updates
        setupSocketConnection();

        // ADD THIS: Cleanup socket on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [activeTab, searchTerm, sortBy]);

    useEffect(() => {
        loadPendingInvites();
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

            // Remove from importing state after a delay and refresh projects
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

                // Refresh the projects list to show the new import
                loadProjects();
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

    const loadPendingInvites = async () => {
        try {
            const response = await apiService.getPendingInvites();
            const invites = response.invites || [];
            setPendingInvites(invites);
            setInviteCount(invites.length);
        } catch (error) {
            console.error('Failed to load pending invites:', error);
        }
    };

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

    // Add this component for Invitation Notifications
    const InvitationNotifications = () => {
        if (inviteCount === 0) return null;

        return (
            <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <BellIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-medium text-blue-900">
                                You have {inviteCount} pending invitation{inviteCount > 1 ? 's' : ''}
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                                {pendingInvites.slice(0, 2).map(invite => invite.project.name).join(', ')}
                                {inviteCount > 2 && ` and ${inviteCount - 2} more`}
                            </p>
                            <div className="mt-3 flex space-x-3">
                                <button
                                    onClick={() => navigate('/invites')}
                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                    View All Invites
                                </button>
                                <button
                                    onClick={loadPendingInvites}
                                    className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setInviteCount(0)}
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
    const headerActions = [
        // Notification Bell with Badge
        <Button
            key="notifications"
            variant="ghost"
            onClick={() => navigate('/invites')}
            className="relative p-2"
            title={`${inviteCount} pending invitations`}
        >
            <BellIcon className="h-5 w-5" />
            {inviteCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {inviteCount > 9 ? '9+' : inviteCount}
                </span>
            )}
        </Button>
    ];

    const ActiveImportsPanel = () => {
        if (importingRepos.size === 0) return null;

        return (
            <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-50">
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
        );
    };

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
                                    className="pl-10 pr-4 py-2 w-full bg-white text-black border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:border-black focus:outline-none focus:shadow-none focus:border-black rounded-md transition-all duration-200"
                                />
                            </div>

                            {activeTab === 'my-projects' && (
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white text-black border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:border-black focus:outline-none focus:shadow-none focus:border-black rounded-md px-3 py-2 cursor-pointer transition-all duration-200"
                                >
                                    <option value="createdAt">Recently Created</option>
                                    <option value="updatedAt">Recently Updated</option>
                                    <option value="name">Name A-Z</option>
                                </select>
                            )}
                        </div>

                        {/* Action Buttons - Only show for my-projects tab */}
                        {activeTab === 'my-projects' && (
                            <div className="flex space-x-3 w-full md:w-auto">
                                <Button
                                    variant="primary"
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center bg-white space-x-2 flex-1 md:flex-initial"
                                >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span>Import from GitHub</span>
                                </Button>

                                <Button
                                    variant="primary"
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center bg-white    space-x-2 flex-1 md:flex-initial"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    <span>New Project</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Invitation Notifications */}
                    <InvitationNotifications />

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

            <ActiveImportsPanel />

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
                    importingRepos={importingRepos}
                    setImportingRepos={setImportingRepos}
                    importProgress={importProgress}
                    setImportProgress={setImportProgress}
                    cancelImport={cancelImport}
                />
            )}
        </div>
    );
};

// Project Card Component
const ProjectCard = ({ project, onProjectClick, onDeleteProject, formatDate, getLanguageIcon, navigate = { navigate } }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInviteCollaborator = async (email) => {
        try {
            await apiService.inviteCollaborator(project._id, { email });
            toast.success(`Invitation sent to ${email}`);
            setShowInviteModal(false);
        } catch (error) {
            toast.error('Failed to send invitation');
        }
    };

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

        return formatDate(dateString);
    };

    return (
        <div
            className="bg-white rounded-lg border-2 border-gray-900 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:border-black transition-all duration-200 cursor-pointer"
            onClick={() => onProjectClick(project._id)}
        >
            <div className="p-6">
                {/* Header with title and menu */}
                <div className="flex items-start justify-between mb-3">
                    <div
                        className="flex items-center space-x-2 flex-1"
                    >
                        <span className="text-lg">{getLanguageIcon(project.settings?.language)}</span>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {project.name}
                        </h3>

                        {/* Status badges */}
                        <div className="flex items-center space-x-1">
                            {project.isPublic ? (
                                <GlobeAltIcon className="h-4 w-4 text-green-500" title="Public" />
                            ) : (
                                <LockClosedIcon className="h-4 w-4 text-gray-400" title="Private" />
                            )}

                            {/* GitHub Integration Badge */}
                            {project.repository && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <CodeBracketSquareIcon className="h-3 w-3 mr-1" />
                                    GitHub
                                </div>
                            )}

                            {/* Collaboration Status */}
                            {project.collaborators && project.collaborators.length > 0 && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <UsersIcon className="h-3 w-3 mr-1" />
                                    {project.collaborators.length}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Project Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onProjectClick(project._id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center space-x-2 text-sm"
                                >
                                    <FolderIcon className="h-4 w-4 text-gray-400" />
                                    <span>Open Project</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowInviteModal(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center space-x-2 text-sm"
                                >
                                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                    <span>Invite Collaborator</span>
                                </button>

                                {project.repository && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/github');
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center space-x-2 text-sm"
                                    >
                                        <CodeBracketSquareIcon className="h-4 w-4 text-gray-400" />
                                        <span>GitHub Settings</span>
                                    </button>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Open project settings
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center space-x-2 text-sm"
                                >
                                    <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                                    <span>Project Settings</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteProject(project._id, project.name);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-200 flex items-center space-x-2 text-sm text-red-600"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete Project</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <p
                    className="text-left text-gray-600 text-sm mb-4 line-clamp-2 cursor-pointer"
                    onClick={() => onProjectClick(project._id)}
                >
                    {project.description || 'No description provided'}
                </p>

                {/* Collaborators Preview */}
                {project.collaborators && project.collaborators.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Collaborators:</span>
                            <div className="flex -space-x-1">
                                {project.collaborators.slice(0, 3).map((collaborator, i) => (
                                    <img
                                        key={i}
                                        src={collaborator.avatar || '/default-avatar.png'}
                                        alt={collaborator.username}
                                        className="h-6 w-6 rounded-full border-2 border-white"
                                        title={collaborator.username}
                                    />
                                ))}
                                {project.collaborators.length > 3 && (
                                    <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                        <span className="text-xs font-medium text-gray-600">
                                            +{project.collaborators.length - 3}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <div className="flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        <span className='pl-1'>{formatRelativeTime(project.updatedAt || project.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        {project.stats?.collaboratorCount > 0 && (
                            <span className="flex items-center space-x-1">
                                <UsersIcon className="h-3 w-3" />
                                <span>
                                    {project.stats.collaboratorCount} collaborator{project.stats.collaboratorCount !== 1 ? 's' : ''}
                                </span>
                            </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {project.stats?.fileCount || 0} files
                        </span>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <InviteCollaboratorModal
                    projectName={project.name}
                    onInvite={handleInviteCollaborator}
                    onClose={() => setShowInviteModal(false)}
                />
            )}
        </div>
    );
};

// Invite Collaborator Modal Component
const InviteCollaboratorModal = ({ projectName, onInvite, onClose }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('collaborator');
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        onInvite(email.trim(), { role, message: message.trim() });
        setEmail('');
        setMessage('');
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Invite Collaborator
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        Invite someone to collaborate on <strong>{projectName}</strong>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="collaborator@example.com"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="viewer">Viewer (Read-only)</option>
                                <option value="collaborator">Collaborator (Read & Write)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Personal Message (Optional)
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a personal message to your invitation..."
                                rows={3}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="ghost"
                            >
                                Send Invitation
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Public Project Card Component
const PublicProjectCard = ({ project, onProjectClick, formatDate, getLanguageIcon }) => {
    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

        return formatDate(dateString);
    };

    return (
        <div
            className="bg-white rounded-lg border-2 border-gray-900 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:border-black transition-all duration-200 cursor-pointer"
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

                <p className="text-left text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                    <div className="flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        <span className='pl-1'>{formatRelativeTime(project.updatedAt || project.createdAt)}</span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">by {project.owner?.username}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{project.settings?.language}</span>
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

// Import Project Modal Component (enhanced)
const ImportProjectModal = ({
    onClose,
    onImportSuccess,
    importingRepos,
    setImportingRepos,
    importProgress,
    setImportProgress,
    cancelImport
}) => {
    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await githubService.getRepositories();
            setRepositories(response.repositories || []);
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            setError('Failed to load GitHub repositories. Please check your GitHub connection.');
            setRepositories([]);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (repo) => {
        const repositoryId = repo.id.toString();

        // NOW this will work because we have access to the state setters
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
            const response = await githubService.importRepository(
                repo.clone_url,
                repo.name,
                repo.description,
                repo.default_branch || 'main'
            );

            toast.info(`Import started for "${repo.name}". Please wait...`);
            onClose();

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

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 ${progress.step === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${progress.progress}%` }}
                        ></div>
                    </div>

                    <p className={`text-xs ${progress.step === 'error' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {progress.message}
                    </p>

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
                onClick={() => handleImport(repo)}
                disabled={isImporting}
                className="flex items-center space-x-2"
            >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Import</span>
            </Button>
        );
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

    const filteredRepos = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    <div className="space-y-3">
        {filteredRepos.map((repo) => (
            <div
                key={repo.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                {repo.name}
                            </h4>
                            {repo.private && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    Private
                                </span>
                            )}
                            {repo.language && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLanguageColor(repo.language)}`}>
                                    {repo.language}
                                </span>
                            )}
                        </div>

                        {repo.description && (
                            <p className="text-sm text-gray-600 mb-2">
                                {repo.description}
                            </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                                <StarIcon className="h-3 w-3" />
                                <span>{repo.stargazers_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <EyeIcon className="h-3 w-3" />
                                <span>{repo.watchers_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <CalendarIcon className="h-3 w-3" />
                                <span>Updated {formatDate(repo.updated_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* REPLACE the simple button with renderImportButton */}
                    <div className="ml-4 flex-shrink-0">
                        {renderImportButton(repo)}
                    </div>
                </div>
            </div>
        ))}
    </div>

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh]">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                            Import from GitHub
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="mb-4">
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

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-gray-600">Loading repositories...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
                                <p className="text-gray-600 mb-4">{error}</p>
                                <Button
                                    variant="ghost"
                                    onClick={fetchRepositories}
                                    className="flex items-center space-x-2"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    <span>Retry</span>
                                </Button>
                            </div>
                        ) : filteredRepos.length === 0 ? (
                            <div className="text-center py-8">
                                <CodeBracketSquareIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-600">
                                    {searchTerm ? 'No repositories match your search.' : 'No repositories found.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRepos.map((repo) => (
                                    <div
                                        key={repo.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                                        {repo.name}
                                                    </h4>
                                                    {repo.private && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            Private
                                                        </span>
                                                    )}
                                                    {repo.language && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLanguageColor(repo.language)}`}>
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                </div>

                                                {repo.description && (
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {repo.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                    <div className="flex items-center space-x-1">
                                                        <StarIcon className="h-3 w-3" />
                                                        <span>{repo.stargazers_count}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <EyeIcon className="h-3 w-3" />
                                                        <span>{repo.watchers_count}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        <span>Updated {formatDate(repo.updated_at)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-4 flex-shrink-0">
                                                {renderImportButton(repo)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end mt-6">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex items-center space-x-2"
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