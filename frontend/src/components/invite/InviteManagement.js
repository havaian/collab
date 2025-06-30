// frontend/src/components/invite/InviteManagement.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Button from '../shared/Button';
import InviteLinkGenerator from './InviteLinkGenerator';
import {
    LinkIcon,
    ClipboardDocumentIcon,
    TrashIcon,
    ClockIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

const InviteManagement = ({ projectId, isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [inviteLinks, setInviteLinks] = useState([]);
    const [showGenerator, setShowGenerator] = useState(false);
    const [deletingIds, setDeletingIds] = useState(new Set());

    useEffect(() => {
        if (isOpen && projectId) {
            fetchInviteLinks();
        }
    }, [isOpen, projectId]);

    const fetchInviteLinks = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/invites/project/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setInviteLinks(result.data || []);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Fetch invite links error:', error);
            toast.error('Failed to load invite links');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Link copied to clipboard!');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Link copied to clipboard!');
        }
    };

    const revokeInviteLink = async (inviteId) => {
        if (deletingIds.has(inviteId)) return;

        const confirmRevoke = window.confirm(
            'Are you sure you want to revoke this invite link? This action cannot be undone.'
        );

        if (!confirmRevoke) return;

        setDeletingIds(prev => new Set([...prev, inviteId]));

        try {
            const response = await fetch(`/api/invites/${inviteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setInviteLinks(prev => prev.filter(link => link.id !== inviteId));
                toast.success('Invite link revoked successfully');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Revoke invite link error:', error);
            toast.error('Failed to revoke invite link');
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(inviteId);
                return newSet;
            });
        }
    };

    const handleLinkGenerated = (newLink) => {
        setInviteLinks(prev => [newLink, ...prev]);
        setShowGenerator(false);
    };

    const formatTimeRemaining = (expiresAt) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'collaborator': return 'bg-blue-100 text-blue-800';
            case 'viewer': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUsageColor = (current, max) => {
        const percentage = (current / max) * 100;
        if (percentage >= 100) return 'text-red-600';
        if (percentage >= 80) return 'text-yellow-600';
        return 'text-green-600';
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center">
                            <LinkIcon className="w-5 h-5 mr-2" />
                            Manage Invite Links
                        </h2>
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => setShowGenerator(true)}
                                size="sm"
                                className="flex items-center"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Generate New Link
                            </Button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-3 text-gray-600">Loading invite links...</span>
                        </div>
                    ) : inviteLinks.length === 0 ? (
                        <div className="text-center py-12">
                            <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Active Invite Links
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Generate invite links to allow others to join your project
                            </p>
                            <Button
                                onClick={() => setShowGenerator(true)}
                                className="flex items-center mx-auto"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Generate Your First Link
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {inviteLinks.map((link) => {
                                const timeRemaining = formatTimeRemaining(link.expiresAt);
                                const isExpired = timeRemaining === 'Expired';
                                const isNearExpiry = !isExpired && timeRemaining.includes('m') && !timeRemaining.includes('h') && !timeRemaining.includes('d');

                                return (
                                    <div
                                        key={link.id}
                                        className={`border rounded-lg p-4 ${isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(link.role)}`}>
                                                        {link.role.charAt(0).toUpperCase() + link.role.slice(1)}
                                                    </span>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <ClockIcon className="w-4 h-4 mr-1" />
                                                        <span className={isExpired ? 'text-red-600' : isNearExpiry ? 'text-yellow-600' : ''}>
                                                            {isExpired ? 'Expired' : `${timeRemaining} remaining`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <UserGroupIcon className="w-4 h-4 mr-1" />
                                                        <span className={getUsageColor(link.currentUses, link.maxUses)}>
                                                            {link.currentUses}/{link.maxUses} uses
                                                        </span>
                                                    </div>
                                                </div>

                                                {link.message && (
                                                    <div className="mb-3">
                                                        <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded p-2">
                                                            <span className="font-medium">Message:</span> {link.message}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="bg-gray-50 border rounded p-2 mb-3">
                                                    <code className="text-xs break-all text-gray-800">
                                                        {link.inviteLink}
                                                    </code>
                                                </div>

                                                <div className="text-xs text-gray-500">
                                                    Created {new Date(link.createdAt).toLocaleDateString()} by {link.invitedBy.username}
                                                </div>
                                            </div>

                                            <div className="flex flex-col space-y-2 ml-4">
                                                <Button
                                                    onClick={() => copyToClipboard(link.inviteLink)}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex items-center"
                                                    disabled={isExpired}
                                                >
                                                    <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                                                    Copy
                                                </Button>
                                                <Button
                                                    onClick={() => revokeInviteLink(link.id)}
                                                    variant="danger"
                                                    size="sm"
                                                    loading={deletingIds.has(link.id)}
                                                    className="flex items-center"
                                                >
                                                    <TrashIcon className="w-4 h-4 mr-2" />
                                                    Revoke
                                                </Button>
                                            </div>
                                        </div>

                                        {isNearExpiry && !isExpired && (
                                            <div className="mt-3 flex items-center text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                                                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                                                This invite link will expire soon!
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
                        <h4 className="font-medium mb-2">Security Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Only share invite links with trusted collaborators</li>
                            <li>Use single-use links for maximum security</li>
                            <li>Set appropriate expiration times based on your needs</li>
                            <li>Revoke links immediately if they're no longer needed</li>
                        </ul>
                    </div>
                </div>
            </div>

            <InviteLinkGenerator
                isOpen={showGenerator}
                onClose={() => setShowGenerator(false)}
                projectId={projectId}
                onLinkGenerated={handleLinkGenerated}
            />
        </>
    );
};

export default InviteManagement;