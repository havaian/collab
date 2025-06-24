// src/socket/rooms.js
class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> { users: Set, metadata: {} }
        this.userRooms = new Map(); // userId -> Set of roomIds
    }

    joinRoom(socket, roomId, metadata = {}) {
        const userId = socket.userId;

        socket.join(roomId);

        // Initialize room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                users: new Set(),
                metadata,
                createdAt: new Date()
            });
        }

        // Add user to room
        const room = this.rooms.get(roomId);
        room.users.add(userId);

        // Track user's rooms
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId).add(roomId);

        // Notify other users in the room
        socket.to(roomId).emit('user:joined', {
            user: socket.user,
            roomId,
            timestamp: new Date()
        });

        // Send current room state to joining user
        socket.emit('room:state', {
            roomId,
            users: Array.from(room.users),
            metadata: room.metadata
        });

        console.log(`👥 User ${socket.user.username} joined room ${roomId}`);
    }

    leaveRoom(socket, roomId) {
        const userId = socket.userId;

        socket.leave(roomId);

        if (this.rooms.has(roomId)) {
            const room = this.rooms.get(roomId);
            room.users.delete(userId);

            // Clean up empty rooms
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
            }
        }

        if (this.userRooms.has(userId)) {
            this.userRooms.get(userId).delete(roomId);

            // Clean up empty user room sets
            if (this.userRooms.get(userId).size === 0) {
                this.userRooms.delete(userId);
            }
        }

        // Notify other users in the room
        socket.to(roomId).emit('user:left', {
            user: socket.user,
            roomId,
            timestamp: new Date()
        });

        console.log(`👥 User ${socket.user.username} left room ${roomId}`);
    }

    leaveAllRooms(socket) {
        const userId = socket.userId;

        if (this.userRooms.has(userId)) {
            const userRoomSet = this.userRooms.get(userId);
            userRoomSet.forEach(roomId => {
                this.leaveRoom(socket, roomId);
            });
        }
    }

    getRoomUsers(roomId) {
        return this.rooms.has(roomId) ? Array.from(this.rooms.get(roomId).users) : [];
    }

    getUserRooms(userId) {
        return this.userRooms.has(userId) ? Array.from(this.userRooms.get(userId)) : [];
    }

    broadcastToRoom(roomId, event, data, excludeUserId = null) {
        if (this.rooms.has(roomId)) {
            const room = this.rooms.get(roomId);
            room.users.forEach(userId => {
                if (userId !== excludeUserId) {
                    const userSockets = this.io.sockets.adapter.rooms.get(userId);
                    if (userSockets) {
                        userSockets.forEach(socketId => {
                            this.io.to(socketId).emit(event, data);
                        });
                    }
                }
            });
        }
    }
}

module.exports = RoomManager;