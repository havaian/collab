// src/components/editor/CollaborativeEditor.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import CodeEditorWindow from './CodeEditorWindow';
import OutputWindow from './OutputWindow';
import CommandPrompt from './CommandPrompt';
import ChatInterface from '../chat/ChatInterface';
import FileTree from './FileTree';
import CollaboratorCursors from './CollaboratorCursors';
import Header from '../shared/Header';
import Button from '../shared/Button';
import { toast } from 'react-toastify';
import {
    ChatBubbleLeftIcon,
    XMarkIcon,
    PlayIcon,
    DocumentArrowDownIcon,
    UsersIcon,
    CloudArrowUpIcon,
    ShareIcon,
    GlobeAltIcon,
    CodeBracketSquareIcon,
    FolderIcon,
    DocumentIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

const CollaborativeEditor = ({ readOnly = false }) => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { socket, connected } = useSocket();
    const { user } = useAuth();

    // Project and file state
    const [project, setProject] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [theme, setTheme] = useState('oceanic-next');
    const [filesLoading, setFilesLoading] = useState(true);

    // Execution state
    const [customInput, setCustomInput] = useState('');
    const [outputDetails, setOutputDetails] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Collaboration state
    const [activeUsers, setActiveUsers] = useState([]);
    const [collaboratorCursors, setCollaboratorCursors] = useState({});
    const [isFileJoined, setIsFileJoined] = useState(false);

    // UI state
    const [showChat, setShowChat] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFileTree, setShowFileTree] = useState(true);
    const [showOutput, setShowOutput] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [outputHeight, setOutputHeight] = useState(300);

    const [showShareModal, setShowShareModal] = useState(false);

    // Refs
    const editorRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const lastSaveRef = useRef(null);

    // Auto-save delay
    const AUTO_SAVE_DELAY = 2000; // 2 seconds

    useEffect(() => {
        loadProject();
        loadFiles();
    }, [projectId]);

    useEffect(() => {
        if (socket && connected && projectId) {
            joinProject();
            setupSocketListeners();

            return () => {
                leaveProject();
            };
        }
    }, [socket, connected, projectId]);

    useEffect(() => {
        if (activeFile && socket && isFileJoined) {
            joinFileEditing(activeFile.id);
        }

        return () => {
            if (activeFile && socket) {
                leaveFileEditing(activeFile.id);
            }
        };
    }, [activeFile, socket, isFileJoined]);

    // Auto-save functionality
    useEffect(() => {
        if (activeFile && code !== lastSaveRef.current && !readOnly) {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                handleAutoSave();
            }, AUTO_SAVE_DELAY);
        }
    }, [code, activeFile]);

    const loadProject = async () => {
        try {
            const response = await apiService.getProject(projectId);
            setProject(response.project);
            setLanguage(response.project.settings?.language || 'javascript');
            setTheme(response.project.settings?.theme || 'oceanic-next');
        } catch (error) {
            toast.error('Failed to load project');
            navigate('/');
        }
    };

    const loadFiles = async () => {
        setFilesLoading(true);
        try {
            const response = await apiService.getProjectFiles(projectId);
            setFiles(response.files);

            // Auto-select first file if no file is active
            if (response.files.length > 0 && !activeFile) {
                const firstFile = response.files.find(f => f.type === 'file');
                if (firstFile) {
                    handleFileSelect(firstFile);
                }
            }
        } catch (error) {
            toast.error('Failed to load files');
        } finally {
            setFilesLoading(false);
        }
    };

    const joinProject = () => {
        if (socket) {
            socket.emit('project:join', { projectId });
        }
    };

    const leaveProject = () => {
        if (socket) {
            socket.emit('project:leave', { projectId });
        }
    };

    const joinFileEditing = (fileId) => {
        if (socket && fileId) {
            socket.emit('file:join', { fileId });
            setIsFileJoined(true);
        }
    };

    const leaveFileEditing = (fileId) => {
        if (socket && fileId) {
            socket.emit('file:leave', { fileId });
            setIsFileJoined(false);
        }
    };

    const setupSocketListeners = () => {
        if (!socket) return;

        // Project events
        socket.on('project:joined', ({ project: projectData }) => {
            console.log('Joined project:', projectData.name);
        });

        socket.on('project:user-list', ({ users }) => {
            setActiveUsers(users);
        });

        socket.on('user:joined', ({ user: joinedUser }) => {
            setActiveUsers(prev => [...prev.filter(u => u.id !== joinedUser.id), joinedUser]);
            toast.info(`${joinedUser.username} joined the project`, { autoClose: 2000 });
        });

        socket.on('user:left', ({ user: leftUser }) => {
            setActiveUsers(prev => prev.filter(u => u.id !== leftUser.id));
            toast.info(`${leftUser.username} left the project`, { autoClose: 2000 });
        });

        // File collaboration events
        socket.on('file:joined', ({ file, activeEditors }) => {
            console.log('Joined file editing:', file.name);
            setCollaboratorCursors({});
        });

        socket.on('file:user-joined', ({ user: joinedUser, fileId }) => {
            if (fileId === activeFile?.id) {
                toast.info(`${joinedUser.username} is now editing this file`, { autoClose: 2000 });
            }
        });

        socket.on('file:user-left', ({ user: leftUser, fileId }) => {
            if (fileId === activeFile?.id) {
                setCollaboratorCursors(prev => {
                    const updated = { ...prev };
                    delete updated[leftUser.id];
                    return updated;
                });
            }
        });

        socket.on('file:edit', ({ changes, user: editUser, fileId }) => {
            if (editUser.id !== user.id && fileId === activeFile?.id) {
                // Apply collaborative changes (in a real implementation, this would use operational transforms)
                console.log('Collaborative edit received:', changes);
            }
        });

        socket.on('file:saved', ({ savedBy, fileId }) => {
            if (savedBy.id !== user.id && fileId === activeFile?.id) {
                toast.success(`File saved by ${savedBy.username}`, { autoClose: 2000 });
                loadFileContent(fileId);
            }
        });

        socket.on('file:cursor', ({ user: cursorUser, cursor, fileId }) => {
            if (cursorUser.id !== user.id && fileId === activeFile?.id) {
                setCollaboratorCursors(prev => ({
                    ...prev,
                    [cursorUser.id]: { user: cursorUser, cursor }
                }));
            }
        });

        // Code execution events
        socket.on('code:executed', ({ user: execUser, language: execLang }) => {
            if (execUser.id !== user.id) {
                toast.info(`${execUser.username} executed ${execLang} code`, { autoClose: 2000 });
            }
        });

        socket.on('code:result', ({ result }) => {
            setOutputDetails(result);
            setProcessing(false);
        });

        socket.on('error', ({ message }) => {
            toast.error(message);
        });
    };

    const handleFileSelect = async (file) => {
        if (file.type === 'folder') return;

        try {
            // Leave current file editing if any
            if (activeFile && socket) {
                leaveFileEditing(activeFile.id);
            }

            setActiveFile(file);
            const response = await apiService.getFile(file.id);
            setCode(response.file.content);
            setLanguage(response.file.language);
            lastSaveRef.current = response.file.content;

            // Clear output when switching files
            setOutputDetails(null);

        } catch (error) {
            toast.error('Failed to load file');
        }
    };

    const loadFileContent = async (fileId) => {
        try {
            const response = await apiService.getFile(fileId);
            setCode(response.file.content);
            lastSaveRef.current = response.file.content;
        } catch (error) {
            console.error('Failed to reload file:', error);
        }
    };

    const handleCodeChange = useCallback((action, data) => {
        switch (action) {
            case 'code':
                setCode(data);

                // Emit collaborative changes
                if (socket && activeFile && isFileJoined) {
                    socket.emit('file:edit', {
                        fileId: activeFile.id,
                        changes: { content: data },
                        version: activeFile.version || 1
                    });
                }
                break;
            default:
                console.warn('Unhandled code change:', action, data);
        }
    }, [socket, activeFile, isFileJoined]);

    const handleAutoSave = async () => {
        if (!activeFile || readOnly || code === lastSaveRef.current) return;

        try {
            await apiService.updateFile(activeFile.id, { content: code });
            lastSaveRef.current = code;

            // Emit save event
            if (socket) {
                socket.emit('file:save', {
                    fileId: activeFile.id,
                    content: code
                });
            }

            // Update file in files list
            setFiles(prev => prev.map(f =>
                f.id === activeFile.id ? { ...f, content: code } : f
            ));

        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    };

    const handleManualSave = async () => {
        if (!activeFile || readOnly) return;

        try {
            await apiService.updateFile(activeFile.id, { content: code });
            lastSaveRef.current = code;

            if (socket) {
                socket.emit('file:save', {
                    fileId: activeFile.id,
                    content: code
                });
            }

            toast.success('File saved', { autoClose: 1000 });
        } catch (error) {
            toast.error('Failed to save file');
        }
    };

    const handleExecuteCode = async () => {
        if (!code.trim()) {
            toast.error('Please write some code first');
            return;
        }

        try {
            setProcessing(true);

            const result = await apiService.executeCode({
                code,
                language,
                stdin: customInput,
                projectId,
                fileId: activeFile?.id
            });

            setOutputDetails(result.output);

            // Emit execution event
            if (socket) {
                socket.emit('code:execute', {
                    projectId,
                    fileId: activeFile?.id,
                    code,
                    language,
                    stdin: customInput
                });
            }

        } catch (error) {
            toast.error('Failed to execute code');
            setProcessing(false);
        }
    };

    const handleCreateFile = async (fileName, parentFolder = null) => {
        try {
            const fileData = {
                name: fileName,
                content: '',
                parentFolder,
                type: fileName.includes('.') ? 'file' : 'folder'
            };

            const response = await apiService.createFile(projectId, fileData);
            await loadFiles();

            // Auto-select new file if it's a file
            if (response.file.type === 'file') {
                handleFileSelect(response.file);
            }

            toast.success('File created successfully');
        } catch (error) {
            toast.error('Failed to create file');
        }
    };

    const handleDeleteFile = async (file) => {
        if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
            return;
        }

        try {
            await apiService.deleteFile(file.id);
            await loadFiles();

            // Clear active file if it was deleted
            if (activeFile?.id === file.id) {
                setActiveFile(null);
                setCode('');
            }

            toast.success('File deleted successfully');
        } catch (error) {
            toast.error('Failed to delete file');
        }
    };

    const handleCursorChange = useCallback((position) => {
        if (socket && activeFile && isFileJoined) {
            socket.emit('file:cursor', {
                fileId: activeFile.id,
                cursor: position
            });
        }
    }, [socket, activeFile, isFileJoined]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        handleManualSave();
                        break;
                    case 'Enter':
                        if (e.shiftKey) {
                            e.preventDefault();
                            handleExecuteCode();
                        }
                        break;
                    case '`':
                        e.preventDefault();
                        setShowOutput(!showOutput);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showOutput]);

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    // Header actions
    const headerActions = [
        // Connection Status
        <div key="connection" className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
            </span>
        </div>,

        // Active Users
        activeUsers.length > 0 && (
            <div key="users" className="flex items-center space-x-2">
                <UsersIcon className="h-4 w-4 text-gray-500" />
                <div className="flex -space-x-1">
                    {activeUsers.slice(0, 3).map((user, i) => (
                        <img
                            key={user.id}
                            src={user.avatar || '/default-avatar.png'}
                            alt={user.username}
                            className="h-6 w-6 rounded-full border-2 border-white"
                            title={user.username}
                        />
                    ))}
                    {activeUsers.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                                +{activeUsers.length - 3}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        ),

        // Run Button
        <Button
            key="run"
            onClick={handleExecuteCode}
            disabled={processing || !code.trim()}
            variant="success"
            size="sm"
            className="flex items-center space-x-1"
        >
            <PlayIcon className="h-4 w-4" />
            <span className="hidden md:inline">
                {processing ? 'Running...' : 'Run'}
            </span>
        </Button>,

        // Share Button
        !readOnly && (
            <Button
                key="share"
                onClick={() => setShowShareModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
            >
                <ShareIcon className="h-4 w-4" />
                <span className="hidden md:inline">Share</span>
            </Button>
        ),

        // GitHub Sync
        !readOnly && project.repository && (
            <Button
                key="github"
                onClick={() => navigate('/github')}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1"
                title="GitHub Sync"
            >
                <CloudArrowUpIcon className="h-4 w-4" />
                <span className="hidden md:inline">Sync</span>
            </Button>
        ),

        // Chat Toggle
        <Button
            key="chat"
            onClick={() => setShowChat(!showChat)}
            variant="ghost"
            size="sm"
            className={showChat ? 'bg-blue-100 text-blue-700' : ''}
            title="Toggle Chat"
        >
            <ChatBubbleLeftIcon className="h-4 w-4" />
        </Button>
    ].filter(Boolean);

    // Project badges for header
    const projectBadges = (
        <div className="flex items-center space-x-2">
            {project.isPublic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <GlobeAltIcon className="h-3 w-3 mr-1" />
                    Public
                </span>
            )}
            {project.repository && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <CodeBracketSquareIcon className="h-3 w-3 mr-1" />
                    GitHub
                </span>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header
                title={project.name}
                subtitle="Collaborative coding with AI"
                showBackButton={true}
                backPath="/"
                actions={headerActions}
            >
                {projectBadges}
            </Header>

            {/* Main Content - 85% height */}
            <main className="h-[81.5vh] flex">
                {/* File Tree Sidebar */}
                {showFileTree && (
                    <div
                        className="bg-white border-r border-gray-200 overflow-y-auto resize-x"
                        style={{ width: sidebarWidth, minWidth: 200, maxWidth: 500 }}
                    >
                        <div className="h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                <h3 className="text-sm font-medium text-gray-900">
                                    Files
                                </h3>
                                {!readOnly && (
                                    <Button
                                        onClick={() => handleCreateFile('newfile.js')}
                                        variant="ghost"
                                        size="xs"
                                        className="p-1"
                                        title="New File"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* File Tree Content */}
                            <div className="flex-1 overflow-y-auto">
                                {filesLoading ? (
                                    <div className="p-4">
                                        <div className="animate-pulse space-y-2">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="h-6 bg-gray-200 rounded"></div>
                                            ))}
                                        </div>
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <DocumentIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No files yet
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            Create your first file to get started coding.
                                        </p>
                                        {!readOnly && (
                                            <div className="space-y-2">
                                                <Button
                                                    onClick={() => handleCreateFile('index.js')}
                                                    variant="primary"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <DocumentIcon className="h-4 w-4 mr-2" />
                                                    Create File
                                                </Button>
                                                <Button
                                                    onClick={() => handleCreateFile('src')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    <FolderIcon className="h-4 w-4 mr-2" />
                                                    Create Folder
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <FileTree
                                        files={files}
                                        activeFile={activeFile}
                                        onFileSelect={handleFileSelect}
                                        onCreateFile={handleCreateFile}
                                        onDeleteFile={handleDeleteFile}
                                        readOnly={readOnly}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Editor */}
                    <div className="flex-1 relative">
                        {activeFile ? (
                            <>
                                <CodeEditorWindow
                                    ref={editorRef}
                                    code={code}
                                    onChange={handleCodeChange}
                                    language={language}
                                    theme={theme}
                                    onCursorChange={handleCursorChange}
                                    readOnly={readOnly}
                                />
                                <CollaboratorCursors cursors={collaboratorCursors} />
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No file selected
                                    </h3>
                                    <p className="text-gray-500">
                                        Select a file from the sidebar to start editing
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Output Panel */}
                    {showOutput && (
                        <div
                            className="border-t border-gray-200 bg-white overflow-hidden"
                            style={{ height: outputHeight, minHeight: 200, maxHeight: 600 }}
                        >
                            <div className="h-full flex">
                                {/* Output Section */}
                                <div className="flex-1 flex flex-col">
                                    <div className="p-4 border-b border-gray-200">
                                        <h3 className="text-sm font-medium text-gray-900">Output window</h3>
                                    </div>
                                    <div className="flex-1 p-4">
                                        <OutputWindow outputDetails={outputDetails} />
                                    </div>
                                </div>

                                {/* Input Section */}
                                {!readOnly && (
                                    <div className="w-80 border-l border-gray-200 flex flex-col">
                                        <div className="p-4 border-b border-gray-200">
                                            <h3 className="text-sm font-medium text-gray-900">Command prompt</h3>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col">
                                            <div className="flex-1 flex flex-col justify-end">
                                                <CommandPrompt
                                                    customInput={customInput}
                                                    setCustomInput={setCustomInput}
                                                    className="h-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 border-l border-gray-200 bg-white">
                        <div className="h-full flex flex-col">
                            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">Project Chat</h3>
                                <Button
                                    onClick={() => setShowChat(false)}
                                    variant="ghost"
                                    size="xs"
                                    className="p-1"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            <ChatInterface projectId={projectId} />
                        </div>
                    </div>
                )}
            </main>

            {/* Status Bar */}
            <div className="bg-gray-800 text-white px-4 py-1 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {activeFile && (
                        <>
                            <span>{activeFile.name}</span>
                            <span>•</span>
                            <span>{language}</span>
                            <span>•</span>
                            <span>{code.split('\n').length} lines</span>
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`flex items-center space-x-1 ${connected ? 'text-green-400' : 'text-red-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span>{connected ? 'Connected' : 'Disconnected'}</span>
                    </span>
                    {!readOnly && lastSaveRef.current !== code && (
                        <span className="text-yellow-400">Unsaved changes</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollaborativeEditor;