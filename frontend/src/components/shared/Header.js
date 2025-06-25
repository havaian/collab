// frontend/src/components/shared/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    CodeBracketSquareIcon,
    ArrowRightOnRectangleIcon,
    ArrowLeftIcon,
    ChevronDownIcon,
    UserIcon,
    Cog6ToothIcon,
    EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Button from './Button';
import AnimatedLogo from './AnimatedLogo';

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
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userMenuItems = [
        {
            label: 'Profile',
            icon: UserIcon,
            path: '/profile',
            description: 'View and edit your profile'
        },
        {
            label: 'Settings',
            icon: Cog6ToothIcon,
            path: '/settings',
            description: 'Application preferences'
        },
        {
            label: 'Invites',
            icon: EnvelopeIcon,
            path: '/invites',
            description: 'Manage project invitations'
        },
        {
            label: 'GitHub',
            icon: CodeBracketSquareIcon,
            path: '/github',
            description: 'GitHub integration settings'
        }
    ];

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
                                <span className="hidden md:inline">Main page</span>
                            </Button>
                        )}

                        {/* Logo & Title */}
                        <div className="flex items-center space-x-4">
                            <AnimatedLogo 
                                size="medium"
                                onClick={() => navigate('/')}
                                className="transition-all duration-200"
                            />

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

                        {/* User Menu Dropdown */}
                        <div className="relative" ref={menuRef}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                avatar={user?.avatar || '/default-avatar.png'}
                                avatarAlt={user?.username || 'User'}
                                avatarSize="sm"
                                className="flex items-center space-x-2"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-gray-900">
                                        {user?.username || 'User'}
                                    </span>
                                </div>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </Button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 pt-2 z-50">
                                    {/* User Info Header */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <div className="flex items-center space-x-3">
                                            <img
                                                src={user?.avatar || '/default-avatar.png'}
                                                alt={user?.username || 'User'}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {user?.displayName || user?.username || 'User'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {user?.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="pt-2">
                                        {userMenuItems.map((item) => {
                                            const IconComponent = item.icon;
                                            return (
                                                <button
                                                    key={item.path}
                                                    onClick={() => {
                                                        navigate(item.path);
                                                        setShowUserMenu(false);
                                                    }}
                                                    className="w-full px-6 py-2 text-left hover:bg-gray-200 flex items-center space-x-3 transition-colors"
                                                >
                                                    <IconComponent className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                                        <p className="text-xs text-gray-500">{item.description}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Logout */}
                                    <div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-6 py-4 text-left hover:bg-gray-200 flex items-center space-x-3 text-red-600 hover:text-red-700 transition-colors"
                                        >
                                            <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                            <span className="text-sm font-medium">Sign out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;