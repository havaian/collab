import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/apiService';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-toastify';
import {
    FolderIcon,
    FolderOpenIcon,
    DocumentIcon,
    CodeBracketSquareIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const FileTree = ({ projectId, onFileSelect, selectedFile, readOnly = false }) => {
    const [files, setFiles] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
    const [isLoading, setIsLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [createType, setCreateType] = useState('file'); // 'file' or 'folder'
    const [targetFile, setTargetFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');
    const { socket } = useSocket();

    useEffect(() => {
        if (projectId) {
            loadProjectFiles();
        }
    }, [projectId]);

    // Socket event listeners for real-time file updates
    useEffect(() => {
        if (!socket) return;

        const handleFileCreated = ({ file }) => {
            setFiles(prev => [...prev, file]);
            toast.success(`File "${file.name}" created`);
        };

        const handleFileUpdated = ({ file }) => {
            setFiles(prev => prev.map(f => f.id === file.id ? file : f));
        };

        const handleFileDeleted = ({ fileId, fileName }) => {
            setFiles(prev => prev.filter(f => f.id !== fileId));
            toast.success(`File "${fileName}" deleted`);
        };

        const handleFileRenamed = ({ fileId, oldName, newName }) => {
            setFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, name: newName } : f
            ));
            toast.success(`File renamed from "${oldName}" to "${newName}"`);
        };

        socket.on('file:created', handleFileCreated);
        socket.on('file:updated', handleFileUpdated);
        socket.on('file:deleted', handleFileDeleted);
        socket.on('file:renamed', handleFileRenamed);

        return () => {
            socket.off('file:created', handleFileCreated);
            socket.off('file:updated', handleFileUpdated);
            socket.off('file:deleted', handleFileDeleted);
            socket.off('file:renamed', handleFileRenamed);
        };
    }, [socket]);

    const loadProjectFiles = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.getProjectFiles(projectId);

            // Transform flat file list into tree structure
            const fileTree = buildFileTree(response.files || []);
            setFiles(fileTree);
        } catch (error) {
            console.error('Failed to load project files:', error);
            toast.error('Failed to load project files');
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const buildFileTree = (flatFiles) => {
        const tree = [];
        const fileMap = new Map();

        // First pass: create all file objects
        flatFiles.forEach(file => {
            fileMap.set(file.id, {
                ...file,
                children: file.type === 'folder' ? [] : undefined
            });
        });

        // Second pass: build tree structure
        flatFiles.forEach(file => {
            const fileObj = fileMap.get(file.id);

            if (!file.parentId) {
                // Root level file/folder
                tree.push(fileObj);
            } else {
                // Child file/folder
                const parent = fileMap.get(file.parentId);
                if (parent && parent.children) {
                    parent.children.push(fileObj);
                }
            }
        });

        return tree.sort((a, b) => {
            // Sort folders first, then files, alphabetically
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };

    const toggleFolder = useCallback((folderId) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    }, [expandedFolders]);

    const handleFileClick = useCallback((file) => {
        if (file.type === 'folder') {
            toggleFolder(file.id);
        } else {
            onFileSelect && onFileSelect(file);
        }
    }, [toggleFolder, onFileSelect]);

    const handleContextMenu = (e, file) => {
        if (readOnly) return;

        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            file
        });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleCreateFile = async (name, type, parentId = null) => {
        try {
            const fileData = {
                projectId,
                name,
                type,
                parentId,
                content: type === 'file' ? '' : undefined
            };

            const response = await apiService.createFile(fileData);

            // File will be added via socket event
            toast.success(`${type === 'file' ? 'File' : 'Folder'} created successfully`);

            return response.file;
        } catch (error) {
            toast.error(`Failed to create ${type}`);
            throw error;
        }
    };

    const handleDeleteFile = async (file) => {
        if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
            return;
        }

        try {
            await apiService.deleteFile(file.id);
            // File will be removed via socket event
        } catch (error) {
            toast.error('Failed to delete file');
        }
    };

    const handleRenameFile = async (file, newName) => {
        try {
            await apiService.renameFile(file.id, newName);
            // File will be updated via socket event
        } catch (error) {
            toast.error('Failed to rename file');
        }
    };

    const handleDuplicateFile = async (file) => {
        try {
            const duplicateName = `${file.name.replace(/\.[^/.]+$/, '')}_copy${file.name.match(/\.[^/.]+$/) || ''}`;

            // Get file content first
            const fileContent = await apiService.getFile(file.id);

            const fileData = {
                projectId,
                name: duplicateName,
                type: 'file',
                parentId: file.parentId,
                content: fileContent.content
            };

            await handleCreateFile(duplicateName, 'file', file.parentId);
        } catch (error) {
            toast.error('Failed to duplicate file');
        }
    };

    const getFileIcon = (file) => {
        if (file.type === 'folder') {
            return expandedFolders.has(file.id)
                ? <FolderOpenIcon className="w-4 h-4 text-blue-500" />
                : <FolderIcon className="w-4 h-4 text-blue-500" />;
        }

        // Code file icons based on extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'];

        if (codeExtensions.includes(extension)) {
            return <CodeBracketSquareIcon className="w-4 h-4 text-green-500" />;
        }

        return <DocumentIcon className="w-4 h-4 text-gray-500" />;
    };

    const renderFileNode = (file, depth = 0) => {
        const isSelected = selectedFile?.id === file.id;
        const isExpanded = expandedFolders.has(file.id);

        return (
            <div key={file.id}>
                <div
                    className={`
                        flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                        ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
                    `}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    onClick={() => handleFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <span className="truncate text-gray-900 dark:text-gray-100">
                            {file.name}
                        </span>
                    </div>

                    {file.type === 'file' && file.language && (
                        <span className="text-xs text-gray-500 uppercase">
                            {file.language}
                        </span>
                    )}
                </div>

                {file.type === 'folder' && isExpanded && file.children && (
                    <div>
                        {file.children.map(child => renderFileNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Files
                </h3>
                {!readOnly && (
                    <div className="flex space-x-1">
                        <button
                            onClick={() => {
                                setCreateType('file');
                                setTargetFile(null);
                                setNewFileName('');
                                setShowCreateModal(true);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="New File"
                        >
                            <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                )}
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <DocumentIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files in this project</p>
                        {!readOnly && (
                            <button
                                onClick={() => {
                                    setCreateType('file');
                                    setTargetFile(null);
                                    setNewFileName('');
                                    setShowCreateModal(true);
                                }}
                                className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                            >
                                Create your first file
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="py-2">
                        {files.map(file => renderFileNode(file))}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={closeContextMenu}
                    />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg py-1 min-w-32"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y
                        }}
                    >
                        {contextMenu.file.type === 'file' && (
                            <button
                                onClick={() => {
                                    handleDuplicateFile(contextMenu.file);
                                    closeContextMenu();
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                                <span>Duplicate</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setTargetFile(contextMenu.file);
                                setNewFileName(contextMenu.file.name);
                                setShowRenameModal(true);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                            <PencilIcon className="w-4 h-4" />
                            <span>Rename</span>
                        </button>

                        <button
                            onClick={() => {
                                handleDeleteFile(contextMenu.file);
                                closeContextMenu();
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    </div>
                </>
            )}

            {/* Create File Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium mb-4">
                            Create New {createType === 'file' ? 'File' : 'Folder'}
                        </h3>
                        <input
                            type="text"
                            placeholder={`${createType === 'file' ? 'File' : 'Folder'} name`}
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            autoFocus
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && newFileName.trim()) {
                                    handleCreateFile(newFileName.trim(), createType);
                                    setShowCreateModal(false);
                                    setNewFileName('');
                                }
                            }}
                        />
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={() => {
                                    if (newFileName.trim()) {
                                        handleCreateFile(newFileName.trim(), createType);
                                        setShowCreateModal(false);
                                        setNewFileName('');
                                    }
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                disabled={!newFileName.trim()}
                            >
                                Create
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewFileName('');
                                }}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename File Modal */}
            {showRenameModal && targetFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium mb-4">
                            Rename {targetFile.type === 'file' ? 'File' : 'Folder'}
                        </h3>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            autoFocus
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && newFileName.trim()) {
                                    handleRenameFile(targetFile, newFileName.trim());
                                    setShowRenameModal(false);
                                    setTargetFile(null);
                                    setNewFileName('');
                                }
                            }}
                        />
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={() => {
                                    if (newFileName.trim()) {
                                        handleRenameFile(targetFile, newFileName.trim());
                                        setShowRenameModal(false);
                                        setTargetFile(null);
                                        setNewFileName('');
                                    }
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                disabled={!newFileName.trim()}
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => {
                                    setShowRenameModal(false);
                                    setTargetFile(null);
                                    setNewFileName('');
                                }}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileTree;