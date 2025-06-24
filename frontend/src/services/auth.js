// src/services/auth.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

export const getCurrentUser = async (token) => {
    const response = await api.get('/auth/user', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
};

export const logout = async (token) => {
    await api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const updateSettings = async (token, settings) => {
    const response = await api.put('/auth/settings', { settings }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
};