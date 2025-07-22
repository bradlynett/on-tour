// frontend/src/components/Auth/Login.tsx
import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const backgroundUrl = '/Rio Beach Concert.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, isLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [totp, setTotp] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.email || !formData.password) {
      setFormError('Please enter both email and password.');
      return;
    }
    try {
      const result = await login(formData.email, formData.password);
      if (result?.twoFactorRequired) {
        setTwoFARequired(true);
        setPendingLogin({ email: formData.email, password: formData.password });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!totp && !backupCode) {
      setFormError('Enter your 2FA code or backup code.');
      return;
    }
    try {
      if (!pendingLogin) return;
      const result = await login(pendingLogin.email, pendingLogin.password, totp || undefined, backupCode || undefined);
      if (result?.twoFactorRequired) {
        setFormError('Invalid 2FA or backup code.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setFormError('Invalid 2FA or backup code.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('${backgroundUrl}') center center / cover no-repeat`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Paper elevation={8} sx={{ p: 5, bgcolor: 'rgba(0,0,0,0.7)', color: 'white', minWidth: 340, maxWidth: 400 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, letterSpacing: 1 }}>
          Login to On-Tour
        </Typography>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!twoFARequired ? (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              variant="outlined"
              fullWidth
              sx={{ mb: 2,
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputBase-input': { color: 'white' }
              }}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              variant="outlined"
              fullWidth
              sx={{ mb: 3,
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: 'white' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputBase-input': { color: 'white' }
              }}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              type="submit"
              sx={{ mb: 2, fontWeight: 600, bgcolor: 'white', color: 'black', '&:hover': { bgcolor: '#f5f5f5', color: 'black' } }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handle2FASubmit}>
            <Typography sx={{ mb: 1 }}>Enter your 2FA code or backup code:</Typography>
            <TextField
              label="2FA Code"
              name="totp"
              variant="outlined"
              fullWidth
              sx={{ mb: 2, '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              value={totp}
              onChange={e => setTotp(e.target.value)}
              disabled={isLoading}
            />
            <Typography align="center" sx={{ my: 1 }}>or</Typography>
            <TextField
              label="Backup Code"
              name="backupCode"
              variant="outlined"
              fullWidth
              sx={{ mb: 3, '& .MuiInputLabel-root': { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' }, '&:hover fieldset': { borderColor: 'white' }, '&.Mui-focused fieldset': { borderColor: 'white' } }, '& .MuiInputBase-input': { color: 'white' } }}
              InputLabelProps={{ style: { color: 'white' } }}
              InputProps={{ style: { color: 'white' } }}
              value={backupCode}
              onChange={e => setBackupCode(e.target.value)}
              disabled={isLoading}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify 2FA'}
            </Button>
          </Box>
        )}
        <Button
          variant="text"
          color="secondary"
          fullWidth
          onClick={() => navigate('/register')}
          sx={{ color: 'white', textDecoration: 'underline' }}
        >
          Don&apos;t have an account? Sign Up
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;