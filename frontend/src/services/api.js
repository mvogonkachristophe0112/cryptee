import axios from 'axios';
import { encryptFormData, decryptApiResponse, getSessionKey, resetSessionKey } from '../utils/crypto';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          // Try to refresh the token
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions with encryption
export const authAPI = {
  login: async (credentials) => {
    const encryptedPayload = encryptFormData(credentials);
    const response = await api.post('/auth/login', encryptedPayload);
    return response;
  },
  register: async (userData) => {
    const encryptedPayload = encryptFormData(userData);
    const response = await api.post('/auth/register', encryptedPayload);
    return response;
  },
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
  verifyEmail: () => api.post('/auth/verify-email'),
};

// Files API functions with encryption support
export const filesAPI = {
  listFiles: (params) => api.get('/files', { params }),
  uploadFile: async (file, onProgress) => {
    // Encrypt file before upload
    const { encryptFile } = await import('../utils/crypto');
    const encryptedFile = await encryptFile(file);

    const formData = new FormData();
    formData.append('file', new Blob([encryptedFile.encryptedData]), encryptedFile.originalName);
    formData.append('encryption_key', encryptedFile.key);
    formData.append('original_name', encryptedFile.originalName);

    return api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  },
  getFile: (fileId) => api.get(`/files/${fileId}`),
  downloadFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
    // Decrypt file after download
    const { decryptFile } = await import('../utils/crypto');
    const decryptedData = decryptFile(await response.data.text(), response.data.key);
    return { ...response, data: decryptedData };
  },
  deleteFile: (fileId) => api.delete(`/files/${fileId}`),
  restoreFile: (fileId) => api.post(`/files/${fileId}/restore`),
  permanentDeleteFile: (fileId) => api.delete(`/files/${fileId}/permanent-delete`),

  // Version management
  listFileVersions: (fileId) => api.get(`/files/${fileId}/versions`),
  getFileVersion: (fileId, versionId) => api.get(`/files/${fileId}/versions/${versionId}`),
  downloadFileVersion: async (fileId, versionId) => {
    const response = await api.get(`/files/${fileId}/versions/${versionId}/download`, { responseType: 'blob' });
    const { decryptFile } = await import('../utils/crypto');
    const decryptedData = decryptFile(await response.data.text(), response.data.key);
    return { ...response, data: decryptedData };
  },
  createFileVersion: async (fileId, file, onProgress) => {
    const { encryptFile } = await import('../utils/crypto');
    const encryptedFile = await encryptFile(file);

    const formData = new FormData();
    formData.append('file', new Blob([encryptedFile.encryptedData]), encryptedFile.originalName);
    formData.append('encryption_key', encryptedFile.key);

    return api.post(`/files/${fileId}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  },
  deleteFileVersion: (fileId, versionId) => api.delete(`/files/${fileId}/versions/${versionId}`),
};

// Shares API functions
export const sharesAPI = {
  createShare: (shareData) => api.post('/shares', shareData),
  listShares: (params) => api.get('/shares', { params }),
  accessShare: (shareLink, password) =>
    api.get(`/shares/${shareLink}`, { params: password ? { password } : {} }),
  downloadSharedFile: (shareLink, password) =>
    api.get(`/shares/${shareLink}/download`, {
      params: password ? { password } : {},
      responseType: 'blob'
    }),
  revokeShare: (shareId) => api.delete(`/shares/${shareId}`),
  extendShare: (shareId, days) => api.post(`/shares/${shareId}/extend`, { days }),
  getShareStats: () => api.get('/shares/stats'),
};

// Chat API functions
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (conversationId) => api.get(`/chat/conversations/${conversationId}`),
  createConversation: (recipient) => api.post('/chat/conversations', { recipient }),
  sendMessage: (conversationId, content) => api.post('/chat/messages', { conversation_id: conversationId, content }),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`),
  searchUsers: (query) => api.get('/chat/users/search', { params: { q: query } }),
  markConversationRead: (conversationId) => api.post(`/chat/conversations/${conversationId}/read`),
  getChatSettings: () => api.get('/chat/settings'),
  updateChatSettings: (settings) => api.put('/chat/settings', settings),
  getChatThemes: () => api.get('/chat/themes'),
  createChatTheme: (themeData) => api.post('/chat/themes', themeData),
  updateChatTheme: (themeId, themeData) => api.put(`/chat/themes/${themeId}`, themeData),
  deleteChatTheme: (themeId) => api.delete(`/chat/themes/${themeId}`),
};

// Users API functions
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  changePassword: (passwordData) => api.post('/users/change-password', passwordData),
  getStorageInfo: () => api.get('/users/storage-info'),
  getActivity: (params) => api.get('/users/activity', { params }),

  // Admin functions
  listUsers: (params) => api.get('/users', { params }),
  updateUserStatus: (userId, statusData) => api.put(`/users/${userId}/status`, statusData),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

// Utility functions
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Handle logout cleanup
export const handleLogout = () => {
  resetSessionKey();
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export { api };