// src/components/profile/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import Button from '../shared/Button';

const ProfilePage = () => {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
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
        try {
            const response = await profileService.getProfile(userId);
            setProfile(response.data);

            if (isOwnProfile) {
                setEditData({
                    bio: response.data.user.bio || '',
                    location: response.data.user.location || '',
                    website: response.data.user.website || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        try {
            await profileService.updateProfile(editData);
            setEditing(false);
            fetchProfile();
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!profile) return <div>Profile not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <img
                            src={profile.user.avatar || '/default-avatar.png'}
                            alt={profile.user.username}
                            className="w-16 h-16 rounded-full"
                        />
                        <div>
                            <h1 className="text-2xl font-bold">{profile.user.username}</h1>
                            <p className="text-gray-600">
                                Joined {new Date(profile.user.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <Button
                            onClick={() => setEditing(!editing)}
                            variant={editing ? 'secondary' : 'primary'}
                        >
                            {editing ? 'Cancel' : 'Edit Profile'}
                        </Button>
                    )}
                </div>

                {/* Profile Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        {editing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Bio</label>
                                    <textarea
                                        value={editData.bio}
                                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                        rows={3}
                                        maxLength={500}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={editData.location}
                                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                        maxLength={100}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Your location"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Website</label>
                                    <input
                                        type="url"
                                        value={editData.website}
                                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                                        maxLength={200}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>

                                <Button onClick={saveProfile}>
                                    Save Changes
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {profile.user.bio && (
                                    <div>
                                        <h3 className="font-medium mb-2">About</h3>
                                        <p className="text-gray-700">{profile.user.bio}</p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    {profile.user.location && (
                                        <span>📍 {profile.user.location}</span>
                                    )}
                                    {profile.user.website && (
                                        <a
                                            href={profile.user.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            🔗 Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Projects */}
                        <div>
                            <h3 className="font-medium mb-3">Recent Projects</h3>
                            <div className="space-y-2">
                                {profile.projects.map(project => (
                                    <div key={project._id} className="border rounded p-3">
                                        <h4 className="font-medium">{project.name}</h4>
                                        <p className="text-sm text-gray-600">{project.description}</p>
                                        <span className="text-xs text-gray-500">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded p-4">
                            <h3 className="font-medium mb-3">Stats</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Projects:</span>
                                    <span className="font-medium">{profile.stats.totalProjects}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Collaborations:</span>
                                    <span className="font-medium">{profile.stats.collaborations}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;