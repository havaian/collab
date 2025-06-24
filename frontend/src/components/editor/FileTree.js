import React, { useState, useEffect } from 'react';

const FileTree = ({ projectId, onFileSelect, selectedFile }) => {
    const [files, setFiles] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProjectFiles();
    }, [projectId]);

    const loadProjectFiles = async () => {
        try {
            // TODO: Replace with actual API call
            // const response = await apiService.getProjectFiles(projectId);
            // setFiles(response.data);

            // Mock file structure for now
            const mockFiles = [
                {
                    id: 'src',
                    name: 'src',
                    type: 'folder',
                    path: 'src',
                    children: [
                        { id: 'app-js', name: 'App.js', type: 'file', path: 'src/App.js' },
                        { id: 'index-js', name: 'index.js', type: 'file', path: 'src/index.js' },
                        {
                            id: 'components',
                            name: 'components',
                            type: 'folder',
                            path: 'src/components',
                            children: [
                                { id: 'header-js', name: 'Header.js', type: 'file', path: 'src/components/Header.js' },
                                { id: 'sidebar-js', name: 'Sidebar.js', type: 'file', path: 'src/components/Sidebar.js' }
                            ]
                        }
                    ]
                },
                {
                    id: 'public',
                    name: 'public',
                    type: 'folder',
                    path: 'public',
                    children: [
                        { id: 'index-html', name: 'index.html', type: 'file', path: 'public/index.html' }
                    ]
                },
                { id: 'package-json', name: 'package.json', type: 'file', path: 'package.json' },
                { id: 'readme-md', name: 'README.md', type: 'file', path: 'README.md' }
            ];

            setFiles(mockFiles);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load project files:', error);
            setIsLoading(false);
        }
    };

    const toggleFolder = (folderId) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const handleFileClick = (file) => {
        if (file.type === 'folder') {
            toggleFolder(file.id);
        } else {
            onFileSelect && onFileSelect(file);
        }
    };

    const getFileIcon = (file) => {
        if (file.type === 'folder') {
            return expandedFolders.has(file.id) ? '📂' : '📁';
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'js':
            case 'jsx':
                return '📄';
            case 'ts':
            case 'tsx':
                return '📘';
            case 'html':
                return '🌐';
            case 'css':
                return '🎨';
            case 'json':
                return '⚙️';
            case 'md':
                return '📝';
            default:
                return '📄';
        }
    };

    const renderFileItem = (file, depth = 0) => {
        const isSelected = selectedFile?.id === file.id;
        const isExpanded = expandedFolders.has(file.id);

        return (
            <div key={file.id}>
                <div
                    className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100 text-blue-800' : ''
                        }`}
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                    onClick={() => handleFileClick(file)}
                >
                    <span className="text-sm mr-2">{getFileIcon(file)}</span>
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    {file.type === 'folder' && (
                        <span className="text-xs text-gray-500">
                            {isExpanded ? '▼' : '▶'}
                        </span>
                    )}
                </div>

                {file.type === 'folder' && isExpanded && file.children && (
                    <div>
                        {file.children.map(child => renderFileItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-white border-r border-gray-200">
            {/* Header */}
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Files</h3>
            </div>

            {/* File Tree */}
            <div className="overflow-y-auto">
                {files.map(file => renderFileItem(file))}
            </div>

            {/* Actions */}
            <div className="p-2 border-t border-gray-200">
                <button className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700">
                    + New File
                </button>
            </div>
        </div>
    );
};

export default FileTree;