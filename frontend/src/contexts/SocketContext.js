// frontend/src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { isAuthenticated, token } = useAuth();
    
    // Use refs to track reconnection state
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000;
    const eventHandlersRef = useRef(new Map());

    // Enhanced WebSocket connection function with reconnection logic
    const connectSocket = (authToken) => {
        // Don't connect if already connected
        if (socket && socket.connected) {
            return socket;
        }

        try {
            // Use correct WebSocket URL
            const wsUrl = process.env.REACT_APP_SOCKET_URL || 'https://collab.ytech.space';

            const newSocket = io(wsUrl, {
                auth: { token: authToken },
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });

            // Connection successful
            newSocket.on('connect', () => {
                console.log('🔌 WebSocket connected');
                reconnectAttemptsRef.current = 0;
                setConnected(true);
            });

            // Handle disconnection
            newSocket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket disconnected:', reason);
                setConnected(false);
                
                if (reason === 'io server disconnect') {
                    // Server disconnected, attempt reconnection
                    attemptReconnection(authToken);
                }
            });

            // Handle connection errors
            newSocket.on('connect_error', (error) => {
                console.error('❌ WebSocket connection error:', error.message);
                setConnected(false);
                attemptReconnection(authToken);
            });

            // General error handler
            newSocket.on('error', (error) => {
                console.error('Socket error:', error);
                setConnected(false);
            });

            setSocket(newSocket);
            return newSocket;

        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            setConnected(false);
            return null;
        }
    };

    // Reconnection logic
    const attemptReconnection = (authToken) => {
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error('❌ Max WebSocket reconnection attempts reached');
            return;
        }

        reconnectAttemptsRef.current++;
        console.log(`🔄 WebSocket reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        setTimeout(() => {
            if (socket && !socket.connected) {
                socket.connect();
            } else if (!socket) {
                connectSocket(authToken);
            }
        }, reconnectDelay * reconnectAttemptsRef.current);
    };

    // Enhanced disconnect function
    const disconnectSocket = () => {
        if (socket) {
            console.log('🔌 Cleaning up WebSocket connection');
            socket.disconnect();
            setSocket(null);
        }
        setConnected(false);
        reconnectAttemptsRef.current = 0;
        eventHandlersRef.current.clear();
    };

    // Enhanced emit function with connection check
    const emitEvent = (event, data) => {
        if (socket && socket.connected) {
            socket.emit(event, data);
        } else {
            console.warn('⚠️ WebSocket not connected, cannot emit:', event);
        }
    };

    // Enhanced event listener management
    const addEventListener = (event, handler) => {
        if (socket) {
            socket.on(event, handler);
        }
        eventHandlersRef.current.set(event, handler);
    };

    const removeEventListener = (event, handler) => {
        if (socket) {
            socket.off(event, handler);
        }
        eventHandlersRef.current.delete(event);
    };

    // Main useEffect for connection management
    useEffect(() => {
        if (isAuthenticated && token) {
            // Clean up any existing connection first
            if (socket) {
                disconnectSocket();
            }

            // Create new connection
            const newSocket = connectSocket(token);

            return () => {
                disconnectSocket();
            };
        } else {
            // Clean up when not authenticated
            if (socket) {
                disconnectSocket();
            }
        }
    }, [isAuthenticated, token]);

    // Enhanced context value with all WebSocket methods
    const contextValue = {
        socket,
        connected,
        // Enhanced methods
        emit: emitEvent,
        on: addEventListener,
        off: removeEventListener,
        disconnect: disconnectSocket,
        reconnect: () => {
            if (token) {
                reconnectAttemptsRef.current = 0;
                connectSocket(token);
            }
        },
        // Connection status
        isConnected: connected,
        reconnectAttempts: reconnectAttemptsRef.current,
        maxReconnectAttempts
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

// Custom hook for easier event handling
export const useSocketEvent = (eventName, handler, deps = []) => {
    const { socket, connected } = useSocket();

    useEffect(() => {
        if (connected && socket && handler) {
            socket.on(eventName, handler);

            return () => {
                socket.off(eventName, handler);
            };
        }
    }, [socket, connected, eventName, handler, ...deps]);
};

// Custom hook for emitting events
export const useSocketEmit = () => {
    const { emit, connected } = useSocket();

    return (eventName, data) => {
        if (connected) {
            emit(eventName, data);
        } else {
            console.warn(`⚠️ Cannot emit '${eventName}': WebSocket not connected`);
        }
    };
};