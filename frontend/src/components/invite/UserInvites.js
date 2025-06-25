// src/components/invite/UserInvites.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inviteService from '../../services/inviteService';
import Header from '../shared/Header';
import Button from '../shared/Button';
import {
    EnvelopeIcon,
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    UserGroupIcon,
    FolderIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const UserInvites = () => {
    const navigate = useNavigate();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingInvites, setProcessingInvites] = useState(new Set());

    useEffect(() => {
        fetchUserInvites();
    }, []);

    const fetchUserInvites = async () => {
        setLoading(true);
        try {
            const response = await inviteService.getUserInvites();
            // Fix: Safely handle the response structure
            setInvites(response || []);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
            setInvites([]); // Set empty array on error
            toast.error('Failed to load invitations');
        } finally {
            setLoading(false);
        }
    };

    const respondToInvite = async (token, action) => {
        if (processingInvites.has(token)) return;

        setProcessingInvites(prev => new Set([...prev, token]));
        try {
            if (action === 'accept') {
                await inviteService.acceptInvite(token);
                toast.success('Invitation accepted! You can now access the project.');
            } else {
                await inviteService.declineInvite(token);
                toast.success('Invitation declined.');
            }
            setInvites(invites.filter(inv => inv.token !== token));
        } catch (error) {
            console.error(`Failed to ${action} invite:`, error);
            toast.error(`Failed to ${action} invitation. Please try again.`);
        } finally {
            setProcessingInvites(prev => {
                const newSet = new Set(prev);
                newSet.delete(token);
                return newSet;
            });
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'owner': return 'bg-purple-100 text-purple-800';
            case 'collaborator': return 'bg-blue-100 text-blue-800';
            case 'viewer': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <>
                <Header
                    title="Project Invitations"
                    showBackButton={true}
                    backPath="/"
                />
                <div className="min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Loading your invitations...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="Project Invitations"
                subtitle={`${invites.length} pending invitation${invites.length !== 1 ? 's' : ''}`}
                showBackButton={true}
                backPath="/"
                actions={[
                    <Button
                        key="refresh"
                        variant="ghost"
                        onClick={fetchUserInvites}
                        className="flex items-center space-x-2"
                    >
                        <span className="text-sm">Refresh</span>
                    </Button>
                ]}
            />

            <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {invites.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-12 max-w-md mx-auto">
                                <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending invitations</h3>
                                <p className="text-gray-600 mb-8">
                                    You don't have any project invitations at the moment.
                                    When someone invites you to collaborate, they'll appear here.
                                </p>
                                <Button
                                    onClick={() => navigate('/')}
                                    className="w-full"
                                >
                                    Back to Dashboard
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Header */}
                            <div className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-blue-100 p-3 rounded-full">
                                            <UserGroupIcon className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                You have {invites.length} pending invitation{invites.length !== 1 ? 's' : ''}
                                            </h2>
                                            <p className="text-gray-600">
                                                Review and respond to project collaboration requests
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invitations List */}
                            <div className="space-y-4">
                                {invites.map(invite => (
                                    <div
                                        key={invite._id}
                                        className="bg-white rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] border-2 border-gray-900 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200 p-6"
                                    >
                                        <div className="flex items-start justify-between">
                                            {/* Project Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <div className="bg-blue-100 p-2 rounded-lg">
                                                        <FolderIcon className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-gray-900">
                                                            {invite.projectId?.name || 'Unknown Project'}
                                                        </h3>
                                                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                                                            <span className="flex items-center space-x-1">
                                                                <ClockIcon className="h-4 w-4" />
                                                                <span>Invited {formatDate(invite.createdAt)}</span>
                                                            </span>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invite.role)}`}>
                                                                {invite.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {invite.projectId?.description && (
                                                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                                                        {invite.projectId.description}
                                                    </p>
                                                )}

                                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-medium">{invite.invitedBy?.username || 'Someone'}</span> invited you to join this project as a <span className="font-medium">{invite.role}</span>.
                                                    </p>
                                                    {invite.message && (
                                                        <p className="text-sm text-gray-600 mt-2 italic">
                                                            "{invite.message}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col space-y-2 ml-6">
                                                <Button
                                                    onClick={() => respondToInvite(invite.token, 'accept')}
                                                    disabled={processingInvites.has(invite.token)}
                                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                    <span>
                                                        {processingInvites.has(invite.token) ? 'Accepting...' : 'Accept'}
                                                    </span>
                                                </Button>
                                                <Button
                                                    onClick={() => respondToInvite(invite.token, 'decline')}
                                                    disabled={processingInvites.has(invite.token)}
                                                    variant="ghost"
                                                    className="flex items-center space-x-2 border-2 border-gray-300 hover:border-red-300 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                    <span>
                                                        {processingInvites.has(invite.token) ? 'Declining...' : 'Decline'}
                                                    </span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default UserInvites;