import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Alert, CircularProgress, LinearProgress, Fade, Zoom } from '@mui/material';
import axios from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflow: 'auto',
};

const buttonSx = {
  color: 'white',
  backgroundColor: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.25)',
  fontWeight: 600,
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.18)',
    border: '1.5px solid rgba(255,255,255,0.4)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
  },
  '&:disabled': {
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    transform: 'none',
  },
};

const textFieldSx = {
  mb: 2,
  '& .MuiInputLabel-root': { color: 'white', opacity: 0.8 },
  '& .MuiOutlinedInput-root': {
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1.5,
    transition: 'all 0.3s ease',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: 'white' },
    '&.Mui-error fieldset': { borderColor: '#f44336' },
  },
  '& .MuiInputBase-input': { color: 'white' },
  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.7)' },
};

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState<'email' | 'login' | 'signup' | 'reset' | '2fa'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [totp, setTotp] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; feedback: string[] }>({ score: 0, feedback: [] });
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letter');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letter');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Include number');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Include special character');
    
    setPasswordStrength({ score, feedback });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    checkPasswordStrength(value);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return '#f44336';
    if (passwordStrength.score <= 3) return '#ff9800';
    if (passwordStrength.score <= 4) return '#ffeb3b';
    return '#4caf50';
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const res = await axios.post('/auth/check-email', { email });
      console.log('res:', res);
      setStep((res as any).exists ? 'login' : 'signup');
    } catch (err: any) {
      setError('Error checking email. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { email, password });
      if (res.data.twoFactorRequired) {
        setPendingLogin({ email, password });
        setStep('2fa');
      } else {
        onClose();
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!pendingLogin) return;
      const res = await axios.post('/auth/login', {
        email: pendingLogin.email,
        password: pendingLogin.password,
        totp: totp || undefined,
        backupCode: backupCode || undefined,
      });
      if (res.data.twoFactorRequired) {
        setError('Invalid 2FA code. Please try again.');
      } else {
        onClose();
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Invalid 2FA code or backup code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validate password strength
    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password.');
      setLoading(false);
      return;
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await register({ email, password });
      console.log('Registration response:', response);
      console.log('Response structure:', {
        success: response?.success,
        hasData: !!response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : 'no data',
        user: response?.data?.user,
        needsOnboarding: response?.data?.user?.needsOnboarding
      });
      onClose();
      
      // Check if user needs onboarding
      if (response?.data?.user?.needsOnboarding) {
        console.log('User needs onboarding, navigating to /onboarding');
        navigate('/onboarding');
      } else {
        console.log('User does not need onboarding, navigating to /dashboard');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMsg('');
    setLoading(true);
    try {
      await axios.post('/auth/forgot-password', { email: resetEmail });
      setResetMsg('If your email is registered, a reset link has been sent to your inbox.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setResetEmail('');
    setResetMsg('');
    setTotp('');
    setBackupCode('');
    setError('');
    setLoading(false);
    setChecking(false);
    setPendingLogin(null);
    setPasswordStrength({ score: 0, feedback: [] });
    setRememberMe(false);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
              Welcome to Concert Travel
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.8, textAlign: 'center' }}>
              Enter your email to get started
            </Typography>
            <form onSubmit={handleEmailSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={checking}
                sx={textFieldSx}
                InputProps={{
                  endAdornment: checking && <CircularProgress size={20} sx={{ color: 'white' }} />
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={checking || !email}
                sx={buttonSx}
              >
                {checking ? 'Checking...' : 'Continue'}
              </Button>
            </form>
          </motion.div>
        );

      case 'login':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
              Welcome Back
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.8, textAlign: 'center' }}>
              Sign in to your account
            </Typography>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                disabled
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                sx={textFieldSx}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !password}
                sx={buttonSx}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
              <Button
                color="secondary"
                fullWidth
                sx={{ mt: 1, fontSize: '0.875rem', opacity: 0.7, textTransform: 'none', '&:hover': { opacity: 1, backgroundColor: 'transparent' } }}
                onClick={() => { setStep('reset'); setResetEmail(email); }}
              >
                Forgot password?
              </Button>
            </form>
          </motion.div>
        );

      case 'signup':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
              Create Your Account
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.8, textAlign: 'center' }}>
              Create a strong password for your new account
            </Typography>
            <form onSubmit={handleSignup}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                disabled
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                label="Create Password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={loading}
                error={passwordStrength.score < 3 && password.length > 0}
                helperText={
                  password.length > 0 ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ flex: 1, height: 4, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(passwordStrength.score / 5) * 100}%`,
                              bgcolor: getPasswordStrengthColor(),
                              transition: 'all 0.3s ease'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: getPasswordStrengthColor() }}>
                          {passwordStrength.score < 3 ? 'Weak' : passwordStrength.score < 4 ? 'Fair' : 'Strong'}
                        </Typography>
                      </Box>
                      {passwordStrength.feedback.length > 0 && (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {passwordStrength.feedback.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  ) : 'At least 8 characters with uppercase, lowercase, and number'
                }
                sx={textFieldSx}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                error={confirmPassword !== '' && password !== confirmPassword}
                helperText={confirmPassword !== '' && password !== confirmPassword ? "Passwords don't match" : ""}
                sx={textFieldSx}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !password || password !== confirmPassword || passwordStrength.score < 3}
                sx={buttonSx}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
            </form>
          </motion.div>
        );

      case 'reset':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
              Reset Password
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.8, textAlign: 'center' }}>
              Enter your email to receive a reset link
            </Typography>
            <form onSubmit={handleReset}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={loading}
                sx={textFieldSx}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !resetEmail}
                sx={buttonSx}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </Button>
            </form>
          </motion.div>
        );

      case '2fa':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.8, textAlign: 'center' }}>
              Enter your 2FA code or backup code
            </Typography>
            <form onSubmit={handle2FALogin}>
              <TextField
                fullWidth
                label="TOTP Code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                disabled={loading}
                sx={textFieldSx}
                placeholder="123456"
              />
              <Typography variant="body2" sx={{ mb: 2, color: 'white', opacity: 0.7, textAlign: 'center' }}>
                OR
              </Typography>
              <TextField
                fullWidth
                label="Backup Code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                disabled={loading}
                sx={textFieldSx}
                placeholder="ABCD-1234"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || (!totp && !backupCode)}
                sx={buttonSx}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
              </Button>
            </form>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
    >
      <Box sx={style}>
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            </motion.div>
          )}
          
          {resetMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResetMsg('')}>
                {resetMsg}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {renderStep()}

        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress sx={{ bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default AuthModal; 