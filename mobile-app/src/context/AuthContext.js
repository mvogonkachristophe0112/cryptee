import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';
import api from '../services/api';
import Toast from 'react-native-toast-message';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState({ access: null, refresh: null });

  // Initialize auth state on app start
  useEffect(() => {
    // Set a timeout to force loading to complete after 5 seconds
    const timeout = setTimeout(() => {
      console.log('Auth initialization timeout, setting loading to false');
      setLoading(false);
    }, 5000);

    initializeAuth().finally(() => {
      clearTimeout(timeout);
    });
  }, []);

  const initializeAuth = async () => {
    console.log('Initializing auth...');
    try {
      const storedTokens = await AsyncStorage.getItem('tokens');
      console.log('Stored tokens:', storedTokens ? 'found' : 'not found');
      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);

        // Check if access token is still valid
        try {
          const decoded = jwtDecode(parsedTokens.access);
          const currentTime = Date.now() / 1000;

          if (decoded.exp > currentTime) {
            console.log('Token is valid, setting authenticated');
            setTokens(parsedTokens);
            setIsAuthenticated(true);

            // Get user profile
            try {
              const response = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${parsedTokens.access}` }
              });
              setUser(response.data.user);
            } catch (error) {
              console.log('Failed to get user profile:', error);
              // Token might be expired, try refresh
              await refreshToken();
            }
          } else {
            console.log('Token expired, trying refresh');
            // Try to refresh token
            await refreshToken();
          }
        } catch (decodeError) {
          console.log('Token decode error:', decodeError);
          // Invalid token, clear it
          await AsyncStorage.removeItem('tokens');
        }
      } else {
        console.log('No stored tokens, user not authenticated');
      }
    } catch (error) {
      console.log('Auth initialization error:', error);
    } finally {
      console.log('Auth initialization complete, setting loading to false');
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });

      const { access_token, refresh_token, user: userData } = response.data;

      const tokenData = {
        access: access_token,
        refresh: refresh_token
      };

      // Store tokens securely
      await AsyncStorage.setItem('tokens', JSON.stringify(tokenData));

      setTokens(tokenData);
      setUser(userData);
      setIsAuthenticated(true);

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome back, ${userData.username}!`
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', userData);

      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Account created successfully!'
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: errorMessage
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call logout endpoint
      if (tokens.access) {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${tokens.access}` }
        });
      }
    } catch (error) {
      console.log('Logout API error:', error);
    } finally {
      // Clear local storage regardless of API call result
      await AsyncStorage.removeItem('tokens');
      setTokens({ access: null, refresh: null });
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);

      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been securely logged out.'
      });
    }
  };

  const refreshToken = async () => {
    try {
      if (!tokens.refresh) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {}, {
        headers: { Authorization: `Bearer ${tokens.refresh}` }
      });

      const { access_token } = response.data;

      const newTokens = {
        access: access_token,
        refresh: tokens.refresh
      };

      await AsyncStorage.setItem('tokens', JSON.stringify(newTokens));
      setTokens(newTokens);

      return access_token;
    } catch (error) {
      console.log('Token refresh failed:', error);
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });

      Toast.show({
        type: 'success',
        text1: 'Password Reset Email Sent',
        text2: 'Check your email for password reset instructions.'
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send reset email';
      Toast.show({
        type: 'error',
        text1: 'Reset Failed',
        text2: errorMessage
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);

      const response = await api.put('/users/profile', profileData, {
        headers: { Authorization: `Bearer ${tokens.access}` }
      });

      setUser(response.data.user);

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been updated successfully.'
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errorMessage
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    if (!tokens.access) return null;

    try {
      const decoded = jwtDecode(tokens.access);
      const currentTime = Date.now() / 1000;

      if (decoded.exp > currentTime + 60) { // Token valid for more than 1 minute
        return tokens.access;
      } else {
        // Token expiring soon, refresh it
        return await refreshToken();
      }
    } catch (error) {
      console.log('Token validation error:', error);
      return null;
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    tokens,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    updateProfile,
    getValidToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};