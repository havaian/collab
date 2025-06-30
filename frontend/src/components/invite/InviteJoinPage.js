// frontend/src/components/invite/InviteJoinPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../shared/Button';
import {
    UserGroupIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';

const InviteJoinPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [inviteDetails, setInviteDetails] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            fetchInviteDetails();
        }
    }, [token]);

    const fetchInviteDetails = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/invites/${token}/details`);
            const result = await response.json();

            if (result.success) {
                setInviteDetails(result.data);
            } else {
                setError(result.error || 'Failed to load invite details');
            }

        } catch (error) {
            console.error('Fetch invite details error:', error);
            setError('Network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const joinProject = async () => {
        setJoining(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Redirect to login with return URL
                const returnUrl = encodeURIComponent(window.location.pathname);
                navigate(`/login?return=${returnUrl}`);
                return;
            }

            const response = await fetch(`/api/invites/${inviteDetails.token || token}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Successfully joined ${result.data.project.name}!`);
                navigate(`/projects/${result.data.project.id}`);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Join project error:', error);
            toast.error(error.message || 'Failed to join project');
        } finally {
            setJoining(false);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'collaborator': return 'bg-blue-100 text-blue-800';
            case 'viewer': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleDescription = (role) => {
        switch (role) {
            case 'admin': return 'Full project management access';
            case 'collaborator': return 'Can edit files and contribute to the project';
            case 'viewer': return 'Read-only access to project files';
            default: return 'Project access';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-center text-gray-600">Loading invite details...</p>
                </div>
            </div>
        );
    }

    if (error || !inviteDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'This invite link is invalid or has expired.'}
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const { valid, expired, usedUp, project, invitedBy, role, message, expiresAt, currentUses, maxUses } = inviteDetails;

    if (!valid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {expired ? 'Invite Expired' : usedUp ? 'Invite Used Up' : 'Invite Invalid'}
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {expired && 'This invite link has expired.'}
                            {usedUp && 'This invite link has reached its maximum usage limit.'}
                            {!expired && !usedUp && 'This invite link is no longer valid.'}
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-4">
                <div className="text-center mb-6">
                    <UserGroupIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Join Project Invitation
                    </h1>
                    <p className="text-gray-600">
                        You've been invited to collaborate on a project
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    {/* Project Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-1">
                            {project.name}
                        </h3>
                        {project.description && (
                            <p className="text-gray-600 text-sm">
                                {project.description}
                            </p>
                        )}
                    </div>

                    {/* Inviter Info */}
                    <div className="flex items-center space-x-3">
                        <img
                            src={invitedBy.avatar || '/default-avatar.png'}
                            alt={invitedBy.username}
                            className="w-10 h-10 rounded-full"
                        />
                        <div>
                            <p className="font-medium text-gray-900">
                                Invited by {invitedBy.username}
                            </p>
                            <p className="text-sm text-gray-600">
                                {new Date(inviteDetails.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Role Assignment */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-900">Your Role:</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(role)}`}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                        </div>
                        <p className="text-sm text-blue-700">
                            {getRoleDescription(role)}
                        </p>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="font-medium text-green-900 mb-1">Message:</p>
                            <p className="text-sm text-green-700">{message}</p>
                        </div>
                    )}

                    {/* Invite Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 rounded p-3">
                            <div className="flex items-center text-gray-600 mb-1">
                                <ClockIcon className="w-4 h-4 mr-1" />
                                Expires
                            </div>
                            <div className="font-medium text-gray-900">
                                {new Date(expiresAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                            <div className="flex items-center text-gray-600 mb-1">
                                <span className="w-4 h-4 mr-1 text-center">#</span>
                                Usage
                            </div>
                            <div className="font-medium text-gray-900">
                                {currentUses}/{maxUses} uses
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/')}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={joinProject}
                        loading={joining}
                        className="flex-1 flex items-center justify-center"
                    >
                        {joining ? 'Joining...' : 'Join Project'}
                        {!joining && <ArrowRightIcon className="w-4 h-4 ml-2" />}
                    </Button>
                </div>

                {/* Security Notice */}
                <div className="mt-6 text-xs text-gray-500 text-center">
                    <p>
                        By joining this project, you agree to the collaboration terms.
                        You can leave the project at any time from your dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InviteJoinPage;