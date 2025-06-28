import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';

const CollaboratorCursors = ({
    projectId,
    fileId,
    monacoEditor,
    isActive = false,
    cursors: propCursors, 
    user
}) => {
    const [localCursors, setLocalCursors] = useState({});
    const [collaborators, setCollaborators] = useState({});
    const { socket } = useSocket();
    const cursorDecorations = useRef({});
    const selectionDecorations = useRef({});
    const lastCursorPosition = useRef(null);
    const cursorUpdateTimeout = useRef(null);

    // Predefined colors for collaborators
    const collaboratorColors = [
        '#3B82F6', // Blue
        '#10B981', // Green  
        '#F59E0B', // Yellow
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#F97316', // Orange
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#EC4899', // Pink
        '#6B7280'  // Gray
    ];

    useEffect(() => {
        if (!socket || !fileId || !isActive) return;

        // Join file for cursor tracking
        socket.emit('file:join-cursor-tracking', { fileId });

        // Socket event listeners
        const handleCursorUpdate = (data) => {
            const { userId, cursor, selection, user: cursorUser } = data;

            if (userId === user.id) return; // Ignore own cursor

            setLocalCursors(prev => ({
                ...prev,
                [userId]: {
                    ...cursor,
                    selection,
                    user: cursorUser,
                    lastUpdate: Date.now()
                }
            }));

            // Update collaborator info
            setCollaborators(prev => ({
                ...prev,
                [userId]: {
                    ...cursorUser,
                    color: prev[userId]?.color || getNextAvailableColor(prev),
                    isActive: true
                }
            }));
        };

        const handleCollaboratorJoined = (data) => {
            const { user: joinedUser } = data;

            if (joinedUser.id === user.id) return;

            setCollaborators(prev => ({
                ...prev,
                [joinedUser.id]: {
                    ...joinedUser,
                    color: getNextAvailableColor(prev),
                    isActive: true
                }
            }));
        };

        const handleCollaboratorLeft = (data) => {
            const { userId } = data;

            setLocalCursors(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });

            setCollaborators(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });

            // Clean up Monaco decorations
            cleanupUserDecorations(userId);
        };

        const handleCollaboratorInactive = (data) => {
            const { userId } = data;

            setLocalCursors(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });

            setCollaborators(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    isActive: false
                }
            }));

            cleanupUserDecorations(userId);
        };

        socket.on('cursor:update', handleCursorUpdate);
        socket.on('cursor:collaborator-joined', handleCollaboratorJoined);
        socket.on('cursor:collaborator-left', handleCollaboratorLeft);
        socket.on('cursor:collaborator-inactive', handleCollaboratorInactive);

        return () => {
            socket.off('cursor:update', handleCursorUpdate);
            socket.off('cursor:collaborator-joined', handleCollaboratorJoined);
            socket.off('cursor:collaborator-left', handleCollaboratorLeft);
            socket.off('cursor:collaborator-inactive', handleCollaboratorInactive);

            // Leave cursor tracking
            socket.emit('file:leave-cursor-tracking', { fileId });

            // Clean up all decorations
            Object.keys(cursorDecorations.current).forEach(cleanupUserDecorations);
        };
    }, [socket, fileId, isActive, user.id]);

    // Send cursor updates to other collaborators
    useEffect(() => {
        if (!socket || !monacoEditor || !fileId || !isActive) return;

        const handleCursorChange = () => {
            const position = monacoEditor.getPosition();
            const selection = monacoEditor.getSelection();

            if (!position) return;

            const currentPosition = {
                lineNumber: position.lineNumber,
                column: position.column
            };

            // Throttle cursor updates (send at most every 100ms)
            if (cursorUpdateTimeout.current) {
                clearTimeout(cursorUpdateTimeout.current);
            }

            cursorUpdateTimeout.current = setTimeout(() => {
                // Only send if position actually changed
                if (!lastCursorPosition.current ||
                    lastCursorPosition.current.lineNumber !== currentPosition.lineNumber ||
                    lastCursorPosition.current.column !== currentPosition.column) {

                    socket.emit('cursor:update', {
                        fileId,
                        cursor: currentPosition,
                        selection: selection ? {
                            startLineNumber: selection.startLineNumber,
                            startColumn: selection.startColumn,
                            endLineNumber: selection.endLineNumber,
                            endColumn: selection.endColumn
                        } : null
                    });

                    lastCursorPosition.current = currentPosition;
                }
            }, 100);
        };

        // Listen to cursor position changes
        const cursorDisposable = monacoEditor.onDidChangeCursorPosition(handleCursorChange);
        const selectionDisposable = monacoEditor.onDidChangeCursorSelection(handleCursorChange);

        return () => {
            cursorDisposable.dispose();
            selectionDisposable.dispose();
            if (cursorUpdateTimeout.current) {
                clearTimeout(cursorUpdateTimeout.current);
            }
        };
    }, [socket, monacoEditor, fileId, isActive]);

    // Update Monaco editor decorations when localCursors change
    useEffect(() => {
        if (!monacoEditor) return;

        Object.entries(localCursors).forEach(([userId, cursorData]) => {
            const collaborator = collaborators[userId];
            if (!collaborator) return;

            updateCursorDecorations(userId, cursorData, collaborator.color);
        });

        // Clean up old localCursors that are no longer active
        Object.keys(cursorDecorations.current).forEach(userId => {
            if (!localCursors[userId]) {
                cleanupUserDecorations(userId);
            }
        });
    }, [localCursors, collaborators, monacoEditor]);

    const getNextAvailableColor = (currentCollaborators) => {
        const usedColors = Object.values(currentCollaborators).map(c => c.color);
        return collaboratorColors.find(color => !usedColors.includes(color)) || collaboratorColors[0];
    };

    const updateCursorDecorations = (userId, cursorData, color) => {
        if (!monacoEditor) return;

        const { lineNumber, column, selection } = cursorData;

        // Clean up existing decorations for this user
        cleanupUserDecorations(userId);

        const decorations = [];

        // Cursor decoration
        decorations.push({
            range: new monacoEditor.constructor.Range(lineNumber, column, lineNumber, column),
            options: {
                className: `collaborator-cursor collaborator-cursor-${userId}`,
                hoverMessage: { value: `**${collaborators[userId]?.username || 'Unknown User'}**` },
                stickiness: monacoEditor.constructor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
            }
        });

        // Selection decoration
        if (selection && (
            selection.startLineNumber !== selection.endLineNumber ||
            selection.startColumn !== selection.endColumn
        )) {
            decorations.push({
                range: new monacoEditor.constructor.Range(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                ),
                options: {
                    className: `collaborator-selection collaborator-selection-${userId}`,
                    stickiness: monacoEditor.constructor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            });
        }

        // Apply decorations
        if (decorations.length > 0) {
            const decorationIds = monacoEditor.deltaDecorations([], decorations);
            cursorDecorations.current[userId] = decorationIds;
        }

        // Inject CSS for this user's cursor and selection colors
        injectCollaboratorStyles(userId, color);
    };

    const cleanupUserDecorations = (userId) => {
        if (!monacoEditor) return;

        const decorationIds = cursorDecorations.current[userId];
        if (decorationIds) {
            monacoEditor.deltaDecorations(decorationIds, []);
            delete cursorDecorations.current[userId];
        }

        // Remove CSS styles
        removeCollaboratorStyles(userId);
    };

    const injectCollaboratorStyles = (userId, color) => {
        const styleId = `collaborator-styles-${userId}`;

        // Remove existing styles
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create new styles
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .collaborator-cursor-${userId}::before {
                content: '';
                position: absolute;
                width: 2px;
                height: 18px;
                background-color: ${color};
                border-radius: 1px;
                z-index: 1000;
                animation: blink 1s infinite;
            }
            
            .collaborator-cursor-${userId}::after {
                content: '${collaborators[userId]?.username || 'User'}';
                position: absolute;
                top: -24px;
                left: 0;
                background-color: ${color};
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 1001;
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .collaborator-cursor-${userId}:hover::after {
                opacity: 1;
            }
            
            .collaborator-selection-${userId} {
                background-color: ${color}33 !important;
                border: 1px solid ${color}66;
                border-radius: 2px;
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
        `;

        document.head.appendChild(style);
    };

    const removeCollaboratorStyles = (userId) => {
        const styleId = `collaborator-styles-${userId}`;
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
    };

    // Clean up cursor positions that haven't been updated recently
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const staleThreshold = 30000; // 30 seconds

            setLocalCursors(prev => {
                const updated = { ...prev };
                let hasChanges = false;

                Object.entries(updated).forEach(([userId, cursorData]) => {
                    if (now - cursorData.lastUpdate > staleThreshold) {
                        delete updated[userId];
                        cleanupUserDecorations(userId);
                        hasChanges = true;
                    }
                });

                return hasChanges ? updated : prev;
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(cleanupInterval);
    }, []);

    // Render active collaborators list (optional UI component)
    const renderCollaboratorsList = () => {
        const activeCollaborators = Object.values(collaborators).filter(c => c.isActive);

        if (activeCollaborators.length === 0) {
            return null;
        }

        return (
            <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Active Collaborators
                </h4>
                <div className="space-y-2">
                    {activeCollaborators.map(collaborator => (
                        <div
                            key={collaborator.id}
                            className="flex items-center space-x-2"
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: collaborator.color }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {collaborator.username}
                            </span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Render collaborators list if needed */}
            {renderCollaboratorsList()}

            {/* The actual cursor/selection decorations are handled by Monaco editor */}
            {/* This component primarily manages the state and socket communication */}
        </>
    );
};

export default CollaboratorCursors;