import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthErrorHandler from './components/AuthErrorHandler';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProfilePage from './components/Profile/ProfilePage';
import SpotifyCallback from './pages/SpotifyCallback';
import TripSuggestionsPage from './pages/TripSuggestionsPage';
import Dashboard from './pages/Dashboard';
import EventSearch from './components/Events/EventSearch';
import BookingPage from './pages/BookingPage';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AuthErrorHandler>
            <Header onMenuClick={handleMenuClick} />
            <Sidebar open={sidebarOpen} onClose={handleSidebarClose} />
            <Routes>
              {/* Public routes - no header margin */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/spotify/callback" element={<SpotifyCallback />} />
              
              {/* Protected routes - with header margin */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <OnboardingFlow />
                  </Box>
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <Dashboard />
                  </Box>
                </ProtectedRoute>
              } />
              <Route path="/trips" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <TripSuggestionsPage />
                  </Box>
                </ProtectedRoute>
              } />
              <Route path="/events" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <EventSearch />
                  </Box>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <ProfilePage />
                  </Box>
                </ProtectedRoute>
              } />
              <Route path="/booking/:tripId" element={
                <ProtectedRoute>
                  <Box sx={{ marginTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
                    <BookingPage />
                  </Box>
                </ProtectedRoute>
              } />
            </Routes>
          </AuthErrorHandler>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;