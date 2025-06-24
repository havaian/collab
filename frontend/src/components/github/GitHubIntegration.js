// src/components/github/GitHubIntegration.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import githubService from '../../services/githubService';
import Button from '../shared/Button';

const GitHubIntegration = ({ projectId, onImport }) => {
    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        setLoading(true);
        try {
            const response = await githubService.getRepositories();
            setRepositories(response.data.repositories);
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncRepository = async (repoUrl) => {
        setSyncing(true);
        try {
            await githubService.syncRepository(projectId, repoUrl);
            onImport && onImport();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const importRepository = async (repo) => {
        setSyncing(true);
        try {
            const response = await githubService.importRepository(
                repo.clone_url,
                repo.name,
                repo.description
            );
            onImport && onImport(response.data);
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">GitHub Repositories</h3>
                <Button onClick={fetchRepositories} disabled={loading}>
                    {loading ? 'Loading...' : 'Refresh'}
                </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {repositories.map(repo => (
                    <div key={repo.id} className="border rounded p-3 flex justify-between items-center">
                        <div>
                            <h4 className="font-medium">{repo.name}</h4>
                            <p className="text-sm text-gray-600">{repo.description}</p>
                            <span className="text-xs text-gray-500">{repo.language}</span>
                        </div>
                        <div className="space-x-2">
                            {projectId ? (
                                <Button
                                    size="sm"
                                    onClick={() => syncRepository(repo.clone_url)}
                                    disabled={syncing}
                                >
                                    {syncing ? 'Syncing...' : 'Sync'}
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => importRepository(repo)}
                                    disabled={syncing}
                                >
                                    {syncing ? 'Importing...' : 'Import'}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GitHubIntegration;