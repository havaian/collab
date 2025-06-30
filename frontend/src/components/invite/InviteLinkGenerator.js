// frontend/src/components/invite/InviteLinkGenerator.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../shared/Button';
import {
    LinkIcon,
    ClockIcon,
    UserGroupIcon,
    ClipboardDocumentIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const InviteLinkGenerator = ({ isOpen, onClose, projectId, onLinkGenerated }) => {
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState(null);
    const [formData, setFormData] = useState({
        role: 'collaborator',
        expiresInHours: 24,
        maxUses: 1,
        message: ''
    });

    const generateLink = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/invites/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    projectId,
                    ...formData
                })
            });

            const result = await response.json();

            if (result.success) {
                setGeneratedLink(result.data);
                onLinkGenerated && onLinkGenerated(result.data);
                toast.success('Invite link generated successfully!');
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Generate link error:', error);
            toast.error(error.message || 'Failed to generate invite link');
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

    const formatExpirationTime = (hours) => {
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''}`;
    };

    const handleClose = () => {
        setGeneratedLink(null);
        setFormData({
            role: 'collaborator',
            expiresInHours: 24,
            maxUses: 1,
            message: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <LinkIcon className="w-5 h-5 mr-2" />
                        Generate Invite Link
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {!generatedLink ? (
                    <form onSubmit={generateLink} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Role
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="viewer">Viewer (Read-only)</option>
                                <option value="collaborator">Collaborator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Expires In
                            </label>
                            <select
                                value={formData.expiresInHours}
                                onChange={(e) => setFormData({ ...formData, expiresInHours: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value={1}>1 hour</option>
                                <option value={6}>6 hours</option>
                                <option value={24}>1 day</option>
                                <option value={48}>2 days</option>
                                <option value={72}>3 days</option>
                                <option value={168}>1 week</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Maximum Uses
                            </label>
                            <select
                                value={formData.maxUses}
                                onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value={1}>1 use (Single-use)</option>
                                <option value={3}>3 uses</option>
                                <option value={5}>5 uses</option>
                                <option value={10}>10 uses</option>
                                <option value={25}>25 uses</option>
                                <option value={50}>50 uses</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Message (Optional)
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Add a message for invitees..."
                                className="w-full border rounded px-3 py-2 h-20 resize-none"
                                maxLength={500}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                {formData.message.length}/500 characters
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={loading}
                                className="flex-1"
                            >
                                Generate Link
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <LinkIcon className="w-5 h-5 text-green-600 mr-2" />
                                <span className="font-medium text-green-800">
                                    Invite Link Generated!
                                </span>
                            </div>

                            <div className="bg-white border rounded p-3 mb-3">
                                <code className="text-sm break-all text-gray-800">
                                    {generatedLink.inviteLink}
                                </code>
                            </div>

                            <Button
                                onClick={() => copyToClipboard(generatedLink.inviteLink)}
                                variant="secondary"
                                size="sm"
                                className="w-full flex items-center justify-center"
                            >
                                <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                                Copy Link
                            </Button>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                                <UserGroupIcon className="w-4 h-4 mr-2" />
                                Role: <span className="font-medium ml-1">{generatedLink.role}</span>
                            </div>
                            <div className="flex items-center">
                                <ClockIcon className="w-4 h-4 mr-2" />
                                Expires: <span className="font-medium ml-1">
                                    {new Date(generatedLink.expiresAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-4 h-4 mr-2 text-center">#</span>
                                Max uses: <span className="font-medium ml-1">{generatedLink.maxUses}</span>
                            </div>
                        </div>

                        {generatedLink.message && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <div className="text-sm font-medium text-blue-800 mb-1">Message:</div>
                                <div className="text-sm text-blue-700">{generatedLink.message}</div>
                            </div>
                        )}

                        <div className="flex space-x-3 pt-4">
                            <Button
                                onClick={handleClose}
                                variant="secondary"
                                className="flex-1"
                            >
                                Done
                            </Button>
                            <Button
                                onClick={() => setGeneratedLink(null)}
                                className="flex-1"
                            >
                                Generate Another
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InviteLinkGenerator;