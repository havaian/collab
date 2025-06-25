// src/components/profile/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import profileService from '../../services/profileService';
import Header from '../shared/Header';
import Button from '../shared/Button';
import {
    PencilIcon,
    MapPinIcon,
    LinkIcon,
    CalendarIcon,
    FolderIcon,
    UsersIcon,
    CodeBracketIcon,
    CheckIcon,
    XMarkIcon,
    UserIcon,
    ChartBarIcon,
    ClockIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const ProfilePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState({
        bio: '',
        location: '',
        website: ''
    });

    const isOwnProfile = !userId || userId === currentUser?.id;

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const userid = await authService.getUserId();
            const response = await profileService.getProfile(userid);
            setProfile(response);

            if (isOwnProfile) {
                setEditData({
                    bio: response.user.bio || '',
                    location: response.user.location || '',
                    website: response.user.website || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            await profileService.updateProfile(editData);
            setEditing(false);
            await fetchProfile();
            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast.error('Failed to save profile changes');
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setEditing(false);
        setEditData({
            bio: profile.user.bio || '',
            location: profile.user.location || '',
            website: profile.user.website || ''
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

        return formatDate(dateString);
    };

    const getLanguageIcon = (language) => {
        const icons = {
            javascript: '🟨',
            typescript: '🔷',
            python: '🐍',
            java: '☕',
            cpp: '⚡',
            csharp: '🔵',
            php: '🐘',
            ruby: '💎',
            go: '🐹',
            rust: '🦀'
        };
        return icons[language?.toLowerCase()] || '📄';
    };

    if (loading) {
        return (
            <>
                <Header
                    title="Profile"
                    showBackButton={true}
                    backPath="/"
                />
                <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Loading profile...</p>
                    </div>
                </div>
            </>
        );
    }

    if (!profile) {
        return (
            <>
                <Header
                    title="Profile"
                    showBackButton={true}
                    backPath="/"
                />
                <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                    <div className="text-center">
                        <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
                        <p className="text-gray-600 mb-6">The user profile you're looking for doesn't exist.</p>
                        <Button onClick={() => navigate('/')}>
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={isOwnProfile ? "Your Profile" : `${profile.user.username}'s Profile`}
                showBackButton={true}
                backPath="/"
                actions={isOwnProfile ? [
                    <Button
                        key="edit"
                        variant="ghost"
                        onClick={() => editing ? cancelEdit() : setEditing(true)}
                        className="flex items-center space-x-2"
                    >
                        {editing ? (
                            <>
                                <XMarkIcon className="h-4 w-4" />
                                <span className="text-sm">Cancel</span>
                            </>
                        ) : (
                            <>
                                <PencilIcon className="h-4 w-4" />
                                <span className="text-sm">Edit</span>
                            </>
                        )}
                    </Button>
                ] : []}
            />

            <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Main Profile Section */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Profile Header */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                    <div className="relative">
                                        <img
                                            src={profile.user.avatar || '/default-avatar.png'}
                                            alt={profile.user.username}
                                            className="w-24 h-24 rounded-full border-4 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                            <div>
                                                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                                                    {profile.user.displayName || profile.user.username}
                                                </h1>
                                                <p className="text-lg text-gray-600">@{profile.user.username}</p>
                                            </div>
                                            {!isOwnProfile && (
                                                <div className="flex space-x-2 mt-4 sm:mt-0">
                                                    <Button
                                                        variant="ghost"
                                                        className="border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                                                        disabled={true}
                                                    >
                                                        Follow
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                                                        disabled={true}
                                                    >
                                                        Message
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                                <span>Joined {formatDate(profile.user.createdAt)}</span>
                                            </div>
                                            {profile.user.location && (
                                                <div className="flex items-center space-x-1">
                                                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                    <span>{profile.user.location}</span>
                                                </div>
                                            )}
                                            {profile.user.website && (
                                                <a
                                                    href={profile.user.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    <LinkIcon className="h-4 w-4" />
                                                    <span>Website</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bio Section */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>

                                {editing ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                            <textarea
                                                value={editData.bio}
                                                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                                rows={4}
                                                maxLength={500}
                                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                placeholder="Tell us about yourself..."
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>Share your interests, experience, and what you're working on</span>
                                                <span>{editData.bio.length}/500</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                                <input
                                                    type="text"
                                                    value={editData.location}
                                                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                                    maxLength={100}
                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Your location"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                                <input
                                                    type="url"
                                                    value={editData.website}
                                                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                                                    maxLength={200}
                                                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="https://yourwebsite.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex space-x-4 pt-4">
                                            <Button
                                                onClick={saveProfile}
                                                disabled={saving}
                                                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white"
                                            >
                                                <CheckIcon className="h-4 w-4" />
                                                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                                            </Button>
                                            <Button
                                                onClick={cancelEdit}
                                                variant="ghost"
                                                className="flex items-center space-x-2 border-2 border-gray-300 hover:bg-gray-50"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                                <span>Cancel</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {profile.user.bio ? (
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                                                {profile.user.bio}
                                            </p>
                                        ) : (
                                            <div className="text-center py-8">
                                                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                                <p className="text-gray-500 italic">
                                                    {isOwnProfile ? "Add a bio to tell others about yourself." : "This user hasn't added a bio yet."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Projects Section */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
                                </div>

                                {profile.projects && profile.projects.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {profile.projects.slice(0, 6).map(project => (
                                            <div
                                                key={project._id}
                                                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                                                onClick={() => navigate(`/project/${project._id}`)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className="text-lg">
                                                                {getLanguageIcon(project.settings?.language)}
                                                            </span>
                                                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                                                                {project.name}
                                                            </h3>
                                                            {project.isPublic && (
                                                                <GlobeAltIcon className="h-4 w-4 text-green-500" title="Public" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                            {project.description || 'No description provided'}
                                                        </p>
                                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                                            <span className="flex items-center space-x-1">
                                                                <ClockIcon className="h-3 w-3" />
                                                                <span>{formatRelativeTime(project.updatedAt || project.createdAt)}</span>
                                                            </span>
                                                            {project.settings?.language && (
                                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                                    {project.settings.language}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <CodeBracketIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                                        <p className="text-gray-600 mb-6">
                                            {isOwnProfile ? "You haven't created any projects yet." : "This user hasn't created any public projects yet."}
                                        </p>
                                        {isOwnProfile && (
                                            <Button
                                                onClick={() => navigate('/')}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                Create Your First Project
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Stats Card */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <ChartBarIcon className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <FolderIcon className="h-5 w-5 text-blue-600" />
                                            <span className="text-gray-700">Projects</span>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-900">
                                            {profile.stats?.totalProjects || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <UsersIcon className="h-5 w-5 text-green-600" />
                                            <span className="text-gray-700">Collaborations</span>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-900">
                                            {profile.stats?.collaborations || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <CodeBracketIcon className="h-5 w-5 text-purple-600" />
                                            <span className="text-gray-700">Contributions</span>
                                        </div>
                                        <span className="text-2xl font-bold text-gray-900">
                                            {profile.stats?.contributions || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Card */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <ClockIcon className="h-5 w-5 text-green-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-700">
                                            {profile.user.lastActive ?
                                                `Last active ${formatRelativeTime(profile.user.lastActive)}` :
                                                'Active recently'
                                            }
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Member since {formatDate(profile.user.createdAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card - Only for viewing other users */}
                            {!isOwnProfile && (
                                <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect</h3>
                                    <div className="space-y-3">
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            disabled={true}
                                        >
                                            Send Message
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full border-2 border-gray-300 hover:bg-gray-50"
                                            disabled={true}
                                        >
                                            Follow
                                        </Button>
                                        <p className="text-xs text-gray-500 text-center">
                                            Social features coming soon
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfilePage;