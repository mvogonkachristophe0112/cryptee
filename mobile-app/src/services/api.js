import axios from 'axios';
import { Platform } from 'react-native';

// Configure API base URL
const API_BASE_URL = 'http://localhost:5000/api'; // Use localhost for development

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const tokens = await AsyncStorage.getItem('tokens');

      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.access) {
          config.headers.Authorization = `Bearer ${parsedTokens.access}`;
        }
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If token is expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const tokens = await AsyncStorage.getItem('tokens');

        if (tokens) {
          const parsedTokens = JSON.parse(tokens);

          if (parsedTokens.refresh) {
            // Try to refresh token
            const refreshResponse = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${parsedTokens.refresh}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            const newAccessToken = refreshResponse.data.access_token;

            // Update stored tokens
            const newTokens = {
              access: newAccessToken,
              refresh: parsedTokens.refresh,
            };

            await AsyncStorage.setItem('tokens', JSON.stringify(newTokens));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
        // If refresh fails, the AuthContext will handle logout
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getCurrentUser: () => api.get('/auth/me'),
};

export const messagesAPI = {
  getMessages: (params) => api.get('/messages', { params }),
  sendMessage: (messageData) => api.post('/messages', messageData),
  getMessage: (messageId) => api.get(`/messages/${messageId}`),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  uploadAttachment: (messageId, formData) =>
    api.post(`/messages/${messageId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getContacts: () => api.get('/messages/contacts'),
  createContact: (contactData) => api.post('/messages/contacts', contactData),
  updateContact: (contactId, contactData) => api.put(`/messages/contacts/${contactId}`, contactData),
  deleteContact: (contactId) => api.delete(`/messages/contacts/${contactId}`),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  getStorageInfo: () => api.get('/users/storage-info'),
  getActivity: () => api.get('/users/activity'),
};

export const filesAPI = {
  uploadFile: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getFiles: (params) => api.get('/files', { params }),
  getFile: (fileId) => api.get(`/files/${fileId}`),
  downloadFile: (fileId) => api.get(`/files/${fileId}/download`, {
    responseType: 'blob',
  }),
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
};

export default api;