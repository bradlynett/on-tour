import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireOnboarding = false }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log('ProtectedRoute - user:', user);
  console.log('ProtectedRoute - location:', location.pathname);
  console.log('ProtectedRoute - needsOnboarding:', user?.needsOnboarding);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user needs onboarding and we're not already on the onboarding page, redirect to onboarding
  if (user.needsOnboarding && location.pathname !== '/onboarding') {
    console.log('Redirecting to onboarding because needsOnboarding =', user.needsOnboarding);
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 