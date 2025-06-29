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
import CollaboratorCursors from './CollaboratorCursors';
import Header from '../shared/Header';
import Button from '../shared/Button';
import { toast } from 'react-toastify';
import {
    ChatBubbleLeftIcon,
    XMarkIcon,
    PlayIcon,
    DocumentArrowDownIcon,
    FolderOpenIcon,
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
    const [activeFile, setActiveFile] = useState(null);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [theme, setTheme] = useState('oceanic-next');
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [fileCache, setFileCache] = useState(new Map());

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
            joinFileEditing(activeFile._id);
        }

        return () => {
            if (activeFile && socket) {
                leaveFileEditing(activeFile._id);
            }
        };
    }, [activeFile, socket, isFileJoined]);

    // Auto-save functionality
    useEffect(() => {
        // Only auto-save if we have an active file and the content actually changed
        if (activeFile && activeFile._id && code !== lastSaveRef.current && !readOnly) {
            // Clear any existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout
            saveTimeoutRef.current = setTimeout(() => {
                // Double-check we're still on the same file before saving
                if (activeFile && activeFile._id) {
                    console.log('Triggering auto-save for:', activeFile.name, activeFile._id);
                    handleAutoSave();
                }
            }, AUTO_SAVE_DELAY);
        }

        // Cleanup timeout when component unmounts or activeFile changes
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [code, activeFile?._id]); // Watch activeFile._id specifically

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
            setActiveUsers(prev => [...prev.filter(u => u._id !== joinedUser._id), joinedUser]);
            toast.info(`${joinedUser.username} joined the project`, { autoClose: 2000 });
        });

        socket.on('user:left', ({ user: leftUser }) => {
            setActiveUsers(prev => prev.filter(u => u._id !== leftUser._id));
            toast.info(`${leftUser.username} left the project`, { autoClose: 2000 });
        });

        // File collaboration events
        socket.on('file:joined', ({ file, activeEditors }) => {
            console.log('Joined file editing:', file.name);
            setCollaboratorCursors({});
        });

        socket.on('file:user-joined', ({ user: joinedUser, fileId }) => {
            if (fileId === activeFile?._id) {
                toast.info(`${joinedUser.username} is now editing this file`, { autoClose: 2000 });
            }
        });

        socket.on('file:user-left', ({ user: leftUser, fileId }) => {
            if (fileId === activeFile?._id) {
                setCollaboratorCursors(prev => {
                    const updated = { ...prev };
                    delete updated[leftUser._id];
                    return updated;
                });
            }
        });

        socket.on('file:edit', ({ changes, user: editUser, fileId }) => {
            if (editUser._id !== user._id && fileId === activeFile?._id) {
                // Apply collaborative changes (in a real implementation, this would use operational transforms)
                console.log('Collaborative edit received:', changes);
            }
        });

        socket.on('file:saved', ({ savedBy, fileId }) => {
            if (savedBy._id !== user._id && fileId === activeFile?._id) {
                toast.success(`File saved by ${savedBy.username}`, { autoClose: 2000 });
                loadFileContent(fileId);
            }
        });

        socket.on('file:cursor', ({ user: cursorUser, cursor, fileId }) => {
            if (cursorUser._id !== user._id && fileId === activeFile?._id) {
                setCollaboratorCursors(prev => ({
                    ...prev,
                    [cursorUser._id]: { user: cursorUser, cursor }
                }));
            }
        });

        // Code execution events
        socket.on('code:executed', ({ user: execUser, language: execLang }) => {
            if (execUser._id !== user._id) {
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

        // CRITICAL: Clear any pending auto-save to prevent cross-file contamination
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        try {
            // Leave current file editing if any
            if (activeFile && socket) {
                leaveFileEditing(activeFile._id);
            }

            setActiveFile(file);

            // Use file._id as the cache key
            const cacheKey = file._id;
            console.log('Selecting file:', file.name, 'ID:', cacheKey);

            // Check cache first
            if (fileCache.has(cacheKey)) {
                console.log('Loading from cache:', file.name, 'ID:', cacheKey);
                const cachedFile = fileCache.get(cacheKey);
                setCode(cachedFile.content);
                setLanguage(cachedFile.language);
                lastSaveRef.current = cachedFile.content;
            } else {
                console.log('Loading from API:', file.name, 'ID:', cacheKey);
                const response = await apiService.getFile(file._id);

                // Map file extension to Monaco language
                const getLanguageFromPath = (path) => {
                    const ext = path.split('.').pop().toLowerCase();
                    const languageMap = {
                        'js': 'javascript',
                        'jsx': 'javascript',
                        'ts': 'typescript',
                        'tsx': 'typescript',
                        'html': 'html',
                        'css': 'css',
                        'scss': 'scss',
                        'sass': 'sass',
                        'json': 'json',
                        'py': 'python',
                        'java': 'java',
                        'cpp': 'cpp',
                        'c': 'c',
                        'go': 'go',
                        'rs': 'rust',
                        'php': 'php',
                        'rb': 'ruby',
                        'md': 'markdown',
                        'yml': 'yaml',
                        'yaml': 'yaml',
                        'xml': 'xml',
                        'sql': 'sql',
                        'sh': 'shell',
                        'bash': 'shell',
                        'vue': 'html',
                        'txt': 'plaintext'
                    };
                    return languageMap[ext] || 'plaintext';
                };

                const detectedLanguage = getLanguageFromPath(file.path) || response.file.language || 'javascript';

                // Cache the file with explicit ID
                const fileData = {
                    content: response.file.content,
                    language: detectedLanguage,
                    fileId: file._id,  // Store ID for debugging
                    fileName: file.name  // Store name for debugging
                };

                console.log('Caching file:', file.name, 'ID:', cacheKey, 'Content length:', response.file.content.length);
                console.log('First 100 chars of content:', response.file.content.substring(0, 100));
                console.log('API returned file path:', response.file.path);
                console.log('API returned file name:', response.file.name);

                setFileCache(prev => {
                    const newCache = new Map(prev);
                    newCache.set(cacheKey, fileData);
                    console.log('Cache now has:', Array.from(newCache.keys()));
                    return newCache;
                });

                setCode(response.file.content);
                setLanguage(detectedLanguage);
                lastSaveRef.current = response.file.content;
            }

            // Clear output when switching files
            setOutputDetails(null);

        } catch (error) {
            console.error('Failed to load file:', error);
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
                        fileId: activeFile._id,
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

        // CRITICAL: Only save if the current code actually belongs to the active file
        const currentFileId = activeFile._id;
        console.log('Auto-saving file:', activeFile.name, 'ID:', currentFileId);
        console.log('Content length:', code.length);
        console.log('Last saved content length:', lastSaveRef.current?.length || 0);

        try {
            await apiService.updateFile(currentFileId, { content: code });

            // Only update refs and cache if we're still on the same file
            if (activeFile && activeFile._id === currentFileId) {
                lastSaveRef.current = code;

                // Emit save event
                if (socket) {
                    socket.emit('file:save', {
                        fileId: currentFileId,
                        content: code
                    });
                }

                // Update cache for this specific file
                setFileCache(prev => {
                    const newCache = new Map(prev);
                    if (newCache.has(currentFileId)) {
                        const existingCache = newCache.get(currentFileId);
                        newCache.set(currentFileId, {
                            ...existingCache,
                            content: code
                        });
                        console.log('Updated cache for file:', currentFileId);
                    }
                    return newCache;
                });
            }

        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    };

    const handleManualSave = async () => {
        if (!activeFile || readOnly) return;

        try {
            await apiService.updateFile(activeFile._id, { content: code });
            lastSaveRef.current = code;

            if (socket) {
                socket.emit('file:save', {
                    fileId: activeFile._id,
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
                fileId: activeFile?._id
            });

            setOutputDetails(result.output);

            // Emit execution event
            if (socket) {
                socket.emit('code:execute', {
                    projectId,
                    fileId: activeFile?._id,
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

    const handleCursorChange = useCallback((position) => {
        if (socket && activeFile && isFileJoined) {
            socket.emit('file:cursor', {
                fileId: activeFile._id,
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
                            key={user._id}
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

            {/* Main Content - Fixed Height Layout */}
            <main className="h-[calc(100vh-132px)] flex">
                {/* File Tree Sidebar */}
                {showFileTree && (
                    <div
                        className="bg-white border-r border-gray-200 overflow-hidden flex-shrink-0"
                        style={{ width: sidebarWidth, minWidth: 200, maxWidth: 500 }}
                    >
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between p-3 border-b border-gray-200">
                                <h3 className="text-sm font-medium text-gray-900">Files ({files.length})</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto py-2">
                                {(() => {
                                    // Build tree structure from paths
                                    const buildTreeFromPaths = (files) => {
                                        const tree = {};

                                        files.forEach(file => {
                                            const pathParts = file.path.split('/').filter(part => part);
                                            let current = tree;

                                            // Create folder structure
                                            for (let i = 0; i < pathParts.length - 1; i++) {
                                                const folderName = pathParts[i];
                                                if (!current[folderName]) {
                                                    current[folderName] = {
                                                        name: folderName,
                                                        type: 'folder',
                                                        path: pathParts.slice(0, i + 1).join('/'),
                                                        children: {},
                                                        _id: `folder-${pathParts.slice(0, i + 1).join('-')}`
                                                    };
                                                }
                                                current = current[folderName].children;
                                            }

                                            // Add the file
                                            const fileName = pathParts[pathParts.length - 1];
                                            current[fileName] = {
                                                ...file,
                                                children: file.type === 'folder' ? {} : undefined
                                            };
                                        });

                                        // Convert to array and sort
                                        const convertToArray = (obj) => {
                                            return Object.values(obj)
                                                .map(item => ({
                                                    ...item,
                                                    children: item.children ? convertToArray(item.children) : undefined
                                                }))
                                                .sort((a, b) => {
                                                    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                                                    return a.name.localeCompare(b.name);
                                                });
                                        };

                                        return convertToArray(tree);
                                    };

                                    const renderFile = (file, depth = 0) => {
                                        const isActive = activeFile && activeFile._id === file._id;
                                        const isExpanded = expandedFolders.has(file._id || file.path);

                                        return (
                                            <div key={file._id || file.path}>
                                                <div
                                                    className={`flex items-center text-sm cursor-pointer hover:bg-gray-300 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                                                        }`}
                                                    style={{ paddingLeft: `${depth * 16 + 12}px`, paddingTop: '6px', paddingBottom: '6px' }}
                                                    onClick={() => {
                                                        if (file.type === 'folder') {
                                                            const newExpanded = new Set(expandedFolders);
                                                            const key = file._id || file.path;
                                                            if (newExpanded.has(key)) {
                                                                newExpanded.delete(key);
                                                            } else {
                                                                newExpanded.add(key);
                                                            }
                                                            setExpandedFolders(newExpanded);
                                                        } else {
                                                            handleFileSelect(file);
                                                        }
                                                    }}
                                                >
                                                    {file.type === 'folder' ? (
                                                        isExpanded ? <FolderOpenIcon className="w-4 h-4 mr-2 text-blue-500" /> : <FolderIcon className="w-4 h-4 mr-2 text-blue-500" />
                                                    ) : (
                                                        <DocumentIcon className="w-4 h-4 mr-2" />
                                                    )}
                                                    {file.name}
                                                </div>
                                                {file.type === 'folder' && isExpanded && file.children && (
                                                    <div>
                                                        {file.children.map(child => renderFile(child, depth + 1))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };

                                    return buildTreeFromPaths(files).map(file => renderFile(file));
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor Area - Fixed Height with Scroll */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Editor Container - Takes remaining space, scrollable */}
                    <div className="flex-1 min-h-0 relative">
                        {activeFile ? (
                            <>
                                <div className="h-full">
                                    <CodeEditorWindow
                                        ref={editorRef}
                                        code={code}
                                        onChange={handleCodeChange}
                                        language={language}
                                        theme={theme}
                                        onCursorChange={handleCursorChange}
                                        readOnly={readOnly}
                                    />
                                </div>
                                <CollaboratorCursors
                                    cursors={collaboratorCursors}
                                    projectId={projectId}
                                    fileId={activeFile?._id}
                                    monacoEditor={editorRef.current}
                                    isActive={isFileJoined}
                                    user={user}
                                />
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

                    {/* Output Panel - Fixed Height */}
                    {showOutput && (
                        <div
                            className="border-t border-gray-200 bg-white flex-shrink-0"
                            style={{ height: outputHeight }}
                        >
                            <div className="h-full flex">
                                {/* Output Section */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="p-3 border-b border-gray-200 flex-shrink-0">
                                        <h3 className="text-sm font-medium text-gray-900">Output</h3>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <OutputWindow outputDetails={outputDetails} />
                                    </div>
                                </div>

                                {/* Input Section */}
                                {!readOnly && (
                                    <div className="w-80 border-l border-gray-200 flex flex-col flex-shrink-0">
                                        <div className="p-3 border-b border-gray-200 flex-shrink-0">
                                            <h3 className="text-sm font-medium text-gray-900">Input</h3>
                                        </div>
                                        <div className="flex-1 overflow-auto">
                                            <CommandPrompt
                                                customInput={customInput}
                                                setCustomInput={setCustomInput}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
                        <div className="h-full flex flex-col">
                            <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
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
                            <div className="flex-1 overflow-hidden">
                                <ChatInterface projectId={projectId} />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Status Bar */}
            <div className="bg-gray-800 text-white px-4 py-2 text-xs flex items-center justify-between flex-shrink-0">
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