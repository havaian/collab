import React, { useState, useEffect } from 'react';

const ChatInterface = ({ projectId, onSendMessage }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // TODO: Load chat history for the project
        // This would typically fetch from your API
        loadChatHistory();
    }, [projectId]);

    const loadChatHistory = async () => {
        try {
            // Placeholder for API call
            // const response = await apiService.getChatHistory(projectId);
            // setMessages(response);
            setMessages([
                {
                    id: 1,
                    user: 'System',
                    message: 'Welcome to the collaborative chat!',
                    timestamp: new Date().toISOString(),
                    type: 'system'
                }
            ]);
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isLoading) return;

        const message = {
            id: Date.now(),
            user: 'You', // TODO: Get from auth context
            message: newMessage,
            timestamp: new Date().toISOString(),
            type: 'user'
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');
        setIsLoading(true);

        try {
            // TODO: Send to API and get AI response
            if (onSendMessage) {
                await onSendMessage(message);
            }

            // Simulate AI response for now
            setTimeout(() => {
                const aiResponse = {
                    id: Date.now() + 1,
                    user: 'AI Assistant',
                    message: 'I received your message. This is a placeholder response.',
                    timestamp: new Date().toISOString(),
                    type: 'ai'
                };
                setMessages(prev => [...prev, aiResponse]);
                setIsLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Project Chat</h3>
                <p className="text-sm text-gray-600">Collaborate with AI and team members</p>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.type === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : msg.type === 'ai'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            <div className="text-xs font-medium mb-1">{msg.user}</div>
                            <div className="text-sm">{msg.message}</div>
                            <div className="text-xs opacity-75 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                            <div className="text-sm">AI is typing...</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;