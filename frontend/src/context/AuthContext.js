import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, handleLogout } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('access_token');
    if (token) {
      // Validate token and get user info
      authAPI.getCurrentUser()
        .then(response => {
          setUser(response.data.user);
        })
        .catch(error => {
          // Token is invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      console.log('=== FRONTEND LOGIN START ===');
      console.log('Credentials:', { email: credentials.email, passwordProvided: !!credentials.password });
      setLoading(true);

      console.log('Calling authAPI.login...');
      const response = await authAPI.login(credentials);
      console.log('API response received:', response);

      const { user, access_token, refresh_token } = response.data;
      console.log('Response data:', { user: !!user, accessToken: !!access_token, refreshToken: !!refresh_token });

      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      console.log('Tokens stored in localStorage');

      // Set user
      setUser(user);
      console.log('User state updated');

      console.log(`Welcome back, ${user.first_name || user.email}!`);
      console.log('=== FRONTEND LOGIN SUCCESS ===');
      return { success: true };
    } catch (error) {
      console.error('=== FRONTEND LOGIN ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Login failed';
      console.error('Final error message:', errorMessage);
      console.log('Login error:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);

      const { user, access_token, refresh_token } = response.data;

      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Set user
      setUser(user);

      console.log(`Welcome to Cryptee, ${user.first_name || user.email}!`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      console.log('Registration error:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Logout on backend might fail, but we still want to clear local state
      console.warn('Backend logout failed:', error);
    }

    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Clear user state
    setUser(null);

    // Reset encryption session
    handleLogout();

    toast.info('You have been logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};