// frontend/src/components/shared/Header.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    CodeBracketIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Button from './Button';

const Header = ({
    title,
    subtitle,
    showBackButton = false,
    backPath = '/',
    children,
    actions = []
}) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="h-[15vh] bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-full flex items-center justify-between">
                    {/* Left Side */}
                    <div className="flex items-center space-x-6">
                        {/* Back Button */}
                        {showBackButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(backPath)}
                                className="flex items-center space-x-2"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                                <span className="hidden md:inline">Back</span>
                            </Button>
                        )}

                        {/* Logo & Title */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                                <div className="flex items-center">
                                    <CodeBracketIcon className="h-8 w-8 text-blue-600 mr-2" />
                                </div>
                                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    GPT-Collab
                                </span>
                            </div>

                            {title && (
                                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                                    <span>•</span>
                                    <div>
                                        <span className="font-medium text-gray-900">{title}</span>
                                        {subtitle && <span className="ml-2 text-gray-500">{subtitle}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center - Custom Actions/Content */}
                    <div className="flex-1 flex justify-center">
                        {children}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center space-x-4">
                        {/* Custom Actions */}
                        {actions.map((action, index) => (
                            <div key={index}>
                                {action}
                            </div>
                        ))}

                        {/* Profile Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/profile')}
                            className="flex items-center space-x-2"
                        >
                            <UserIcon className="h-5 w-5" />
                            <span className="hidden md:inline">Profile</span>
                        </Button>

                        {/* User Info */}
                        <div className="flex items-center space-x-3">
                            <img
                                className="h-8 w-8 rounded-full border-2 border-gray-200"
                                src={user?.avatar || '/default-avatar.png'}
                                alt={user?.username}
                            />
                            <div className="hidden md:block">
                                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                            title="Logout"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;