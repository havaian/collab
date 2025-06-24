// src/components/invite/UserInvites.js
import React, { useState, useEffect } from 'react';
import inviteService from '../../services/inviteService';
import Button from '../shared/Button';

const UserInvites = () => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserInvites();
    }, []);

    const fetchUserInvites = async () => {
        try {
            const response = await inviteService.getUserInvites();
            setInvites(response.data);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        } finally {
            setLoading(false);
        }
    };

    const respondToInvite = async (token, action) => {
        try {
            if (action === 'accept') {
                await inviteService.acceptInvite(token);
            } else {
                await inviteService.declineInvite(token);
            }
            setInvites(invites.filter(inv => inv.token !== token));
        } catch (error) {
            console.error(`Failed to ${action} invite:`, error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">Project Invitations</h2>

            {invites.length === 0 ? (
                <p className="text-gray-500">No pending invitations</p>
            ) : (
                <div className="space-y-3">
                    {invites.map(invite => (
                        <div key={invite._id} className="border rounded p-4">
                            <div className="mb-3">
                                <h3 className="font-medium">{invite.projectId.name}</h3>
                                <p className="text-sm text-gray-600">{invite.projectId.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Invited by {invite.invitedBy.username} as {invite.role}
                                </p>
                            </div>

                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    onClick={() => respondToInvite(invite.token, 'accept')}
                                >
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => respondToInvite(invite.token, 'decline')}
                                >
                                    Decline
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserInvites;