// src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { token, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && token) {
            const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            newSocket.on('connect', () => {
                console.log('🔌 Connected to server');
                setConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('🔌 Disconnected from server');
                setConnected(false);
            });

            newSocket.on('error', (error) => {
                console.error('Socket error:', error);
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
                setSocket(null);
                setConnected(false);
            };
        }
    }, [isAuthenticated, token]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
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