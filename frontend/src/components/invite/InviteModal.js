// src/components/invite/InviteModal.js
import React, { useState } from 'react';
import Button from '../shared/Button';
import inviteService from '../../services/inviteService';

const InviteModal = ({ isOpen, onClose, projectId, onInviteSent }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('collaborator');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sendInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await inviteService.createInvite(projectId, email, role);
            setEmail('');
            onInviteSent && onInviteSent();
            onClose();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to send invite');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Invite Collaborator</h2>

                <form onSubmit={sendInvite} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border rounded px-3 py-2"
                            placeholder="colleague@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="collaborator">Collaborator</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}

                    <div className="flex justify-end space-x-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !email}
                        >
                            {loading ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteModal;