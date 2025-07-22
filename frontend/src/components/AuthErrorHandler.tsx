import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Warning as WarningIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

interface AuthErrorDetail {
  message: string;
  error: any;
}

interface AuthErrorHandlerProps {
  children: ReactNode;
}

const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastError, setLastError] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const lastFailedRequest = useRef<any>(null);

  useEffect(() => {
    const handleAuthError = (event: CustomEvent<AuthErrorDetail>) => {
      setErrorMessage(event.detail.message);
      setLastError(event.detail.error);
      // Store the failed request for potential retry
      lastFailedRequest.current = event.detail.error?.config;
      setIsOpen(true);
      
      // Log debugging information
      console.log('🔍 Auth Error Debug Info:', {
        token: localStorage.getItem('token') ? 'Present' : 'Missing',
        tokenLength: localStorage.getItem('token')?.length || 0,
        requestUrl: event.detail.error?.config?.url,
        requestMethod: event.detail.error?.config?.method,
        requestHeaders: event.detail.error?.config?.headers,
        errorStatus: event.detail.error?.response?.status,
        errorMessage: event.detail.error?.response?.data?.message
      });
    };

    // Listen for auth errors
    window.addEventListener('auth-error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Check if user is still authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        // No token, can't retry
        setIsRetrying(false);
        return;
      }

      // For now, we'll just close the dialog and let the user try again
      // In a more advanced implementation, you could:
      // 1. Attempt to refresh the token
      // 2. Retry the last failed request
      // 3. Show a success message if it works
      
      setIsOpen(false);
      setIsRetrying(false);
      
      // Show a brief success message
      setTimeout(() => {
        // You could dispatch a success event here
        console.log('Retry successful - user can try their action again');
      }, 100);
      
    } catch (error) {
      console.error('Retry failed:', error);
      setIsRetrying(false);
      // If retry fails, suggest going to login
      setErrorMessage('Unable to restore your session. Please log in again.');
    }
  };

  const handleGoToLogin = () => {
    setIsOpen(false);
    logout();
    navigate('/login');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getDebugInfo = () => {
    const token = localStorage.getItem('token');
    const tokenData = token ? JSON.parse(atob(token.split('.')[1])) : null;
    
    return {
      tokenPresent: !!token,
      tokenLength: token?.length || 0,
      tokenExpiry: tokenData ? new Date(tokenData.exp * 1000).toLocaleString() : 'N/A',
      tokenIssued: tokenData ? new Date(tokenData.iat * 1000).toLocaleString() : 'N/A',
      requestUrl: lastError?.config?.url,
      requestMethod: lastError?.config?.method,
      errorStatus: lastError?.response?.status,
      errorMessage: lastError?.response?.data?.message
    };
  };

  return (
    <>
      {children}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Session Expired</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            Your session has expired. You can either:
          </Typography>
          
          <Box mt={2}>
            <Typography variant="body2" component="ul">
              <li>Try your action again (if you've just logged in)</li>
              <li>Go to the login page to re-authenticate</li>
            </Typography>
          </Box>

          {/* Debug Information */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" color="text.secondary">
                Debug Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                {JSON.stringify(getDebugInfo(), null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleRetry} 
            variant="outlined"
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
          <Button onClick={handleGoToLogin} variant="contained" color="primary">
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AuthErrorHandler; 