import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import FileUpload from './components/files/FileUpload';
import FileList from './components/files/FileList';
import FileDetails from './components/files/FileDetails';
import ShareFile from './components/sharing/ShareFile';
import SharedFiles from './components/sharing/SharedFiles';
import Profile from './components/user/Profile';
import Settings from './components/settings/Settings';
import Copyright from './components/common/Copyright';
import LoadingSpinner from './components/common/LoadingSpinner';
import Chat from './components/chat/Chat';
import OfflineEncryption from './components/offline/OfflineEncryption';
import Home from './components/home/Home';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { TranslationProvider } from './context/TranslationContext';

// Services
import { api } from './services/api';

function AppContent() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('access_token');
    if (token) {
      // Validate token with backend
      api.get('/auth/me')
        .then(response => {
          // Token is valid, user context should be updated by AuthContext
        })
        .catch(error => {
          // Token is invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route
            path="/home"
            element={<Home />}
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" replace /> : <Register />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/upload"
            element={user ? <FileUpload /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/files"
            element={user ? <FileList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/files/:fileId"
            element={user ? <FileDetails /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/share/:fileId"
            element={user ? <ShareFile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/shared"
            element={user ? <SharedFiles /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/copyright"
            element={<Copyright />}
          />
          <Route
            path="/crypchat"
            element={user ? <Chat /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/offline-encryption"
            element={user ? <OfflineEncryption /> : <Navigate to="/login" replace />}
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/home"} replace />}
          />

          {/* 404 - redirect to dashboard or login */}
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TranslationProvider>
  );
}

export default App;