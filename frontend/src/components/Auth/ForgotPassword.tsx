import React, { useState } from 'react';
import axios from '../../services/apiClient';
import { Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    try {
      await axios.post('/auth/forgot-password', { email });
      setSuccess('If your email is registered, a reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#222' }}>
      <Paper sx={{ p: 4, minWidth: 340, maxWidth: 400 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Forgot Password</Typography>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={e => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || !email}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ForgotPassword; 