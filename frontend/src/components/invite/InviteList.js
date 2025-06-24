// src/components/invite/InviteList.js
import React, { useState, useEffect } from 'react';
import inviteService from '../../services/inviteService';
import Button from '../shared/Button';

const InviteList = ({ projectId }) => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvites();
    }, [projectId]);

    const fetchInvites = async () => {
        try {
            const response = await inviteService.getProjectInvites(projectId);
            setInvites(response.data);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteInvite = async (inviteId) => {
        try {
            await inviteService.deleteInvite(inviteId);
            setInvites(invites.filter(inv => inv._id !== inviteId));
        } catch (error) {
            console.error('Failed to delete invite:', error);
        }
    };

    if (loading) return <div>Loading invites...</div>;

    return (
        <div className="space-y-3">
            <h3 className="font-medium">Pending Invites</h3>

            {invites.length === 0 ? (
                <p className="text-gray-500 text-sm">No pending invites</p>
            ) : (
                <div className="space-y-2">
                    {invites.map(invite => (
                        <div key={invite._id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                                <div className="font-medium">{invite.email}</div>
                                <div className="text-sm text-gray-600">
                                    Role: {invite.role} •
                                    Invited by {invite.invitedBy.username} •
                                    {invite.status}
                                </div>
                            </div>

                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => deleteInvite(invite._id)}
                            >
                                Cancel
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InviteList;