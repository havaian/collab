import React, { useState, useEffect } from 'react';

const CollaboratorCursors = ({ collaborators = [], currentUserId }) => {
    const [cursors, setCursors] = useState({});

    useEffect(() => {
        // TODO: Listen to real-time cursor updates via WebSocket
        // socket.on('cursor-update', handleCursorUpdate);
        // socket.on('collaborator-joined', handleCollaboratorJoined);
        // socket.on('collaborator-left', handleCollaboratorLeft);

        // Mock collaborator data for development
        const mockCursors = {
            'user-1': {
                id: 'user-1',
                name: 'Alice Johnson',
                color: '#3B82F6',
                position: { line: 10, column: 25 },
                selection: { start: { line: 10, column: 20 }, end: { line: 10, column: 30 } },
                isActive: true
            },
            'user-2': {
                id: 'user-2',
                name: 'Bob Smith',
                color: '#10B981',
                position: { line: 15, column: 10 },
                selection: null,
                isActive: true
            }
        };

        setCursors(mockCursors);

        return () => {
            // TODO: Cleanup socket listeners
            // socket.off('cursor-update', handleCursorUpdate);
            // socket.off('collaborator-joined', handleCollaboratorJoined);
            // socket.off('collaborator-left', handleCollaboratorLeft);
        };
    }, [collaborators]);

    const handleCursorUpdate = (data) => {
        setCursors(prev => ({
            ...prev,
            [data.userId]: {
                ...prev[data.userId],
                position: data.position,
                selection: data.selection,
                isActive: true
            }
        }));
    };

    const handleCollaboratorJoined = (collaborator) => {
        setCursors(prev => ({
            ...prev,
            [collaborator.id]: {
                ...collaborator,
                position: { line: 1, column: 1 },
                selection: null,
                isActive: true
            }
        }));
    };

    const handleCollaboratorLeft = (userId) => {
        setCursors(prev => {
            const newCursors = { ...prev };
            delete newCursors[userId];
            return newCursors;
        });
    };

    const renderCursor = (cursor) => {
        if (!cursor.isActive || cursor.id === currentUserId) {
            return null;
        }

        return (
            <div
                key={cursor.id}
                className="absolute pointer-events-none z-10"
                style={{
                    // TODO: Calculate actual pixel position based on editor line/column
                    // This would need integration with Monaco Editor's coordinate system
                    top: `${cursor.position.line * 20}px`,
                    left: `${cursor.position.column * 8}px`
                }}
            >
                {/* Cursor Line */}
                <div
                    className="w-0.5 h-5 animate-pulse"
                    style={{ backgroundColor: cursor.color }}
                />

                {/* Cursor Label */}
                <div
                    className="absolute top-0 left-1 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
                    style={{ backgroundColor: cursor.color }}
                >
                    {cursor.name}
                </div>

                {/* Selection Highlight */}
                {cursor.selection && (
                    <div
                        className="absolute opacity-30 rounded"
                        style={{
                            backgroundColor: cursor.color,
                            top: 0,
                            left: `${(cursor.selection.start.column - cursor.position.column) * 8}px`,
                            width: `${(cursor.selection.end.column - cursor.selection.start.column) * 8}px`,
                            height: '20px'
                        }}
                    />
                )}
            </div>
        );
    };

    const renderCollaboratorList = () => {
        const activeCursors = Object.values(cursors).filter(c => c.isActive);

        if (activeCursors.length === 0) {
            return null;
        }

        return (
            <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-3 border border-gray-200 z-20">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">
                    Collaborators ({activeCursors.length})
                </h4>
                <div className="space-y-1">
                    {activeCursors.map(cursor => (
                        <div key={cursor.id} className="flex items-center space-x-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cursor.color }}
                            />
                            <span className="text-xs text-gray-700">{cursor.name}</span>
                            <div className="text-xs text-gray-500">
                                L{cursor.position.line}:C{cursor.position.column}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Render individual cursors */}
            <div className="relative">
                {Object.values(cursors).map(renderCursor)}
            </div>

            {/* Render collaborator list */}
            {renderCollaboratorList()}
        </>
    );
};

export default CollaboratorCursors;