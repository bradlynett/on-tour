import React, { useState } from 'react';
import axios from '../../services/apiClient';
import { Alert } from '@mui/material';

interface Enable2FAProps {
  onSetupComplete?: () => void;
  isOnboarding?: boolean;
}

const Enable2FA: React.FC<Enable2FAProps> = ({ onSetupComplete, isOnboarding = false }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'done' | 'status'>('status');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwError, setChangePwError] = useState('');
  const [changePwSuccess, setChangePwSuccess] = useState('');

  // Fetch 2FA status on mount
  React.useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/users/me');
        setIs2FAEnabled(res.data?.data?.user?.is2faEnabled || false);
      } catch {
        setError('Could not fetch 2FA status');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/2fa/setup');
      setQrCode(res.data.qrCodeDataUrl);
      setSecret(res.data.secret);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/2fa/verify', { token, secret });
      setBackupCodes(res.data.backupCodes);
      setIs2FAEnabled(true);
      setStep('done');
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupCodes = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.get('/2fa/backup-codes');
      setBackupCodes(res.data.backupCodes);
      setShowBackupCodes(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not fetch backup codes');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/2fa/backup-codes/regenerate');
      setBackupCodes(res.data.backupCodes);
      setSuccess('Backup codes regenerated!');
      setShowBackupCodes(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    setDisableError('');
    setSuccess('');
    try {
      await axios.post('/2fa/disable', { token: disableCode });
      setIs2FAEnabled(false);
      setSuccess('2FA disabled successfully.');
      setStep('status');
    } catch (err: any) {
      setDisableError(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  function validatePassword(password: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwError('');
    setChangePwSuccess('');
    if (!validatePassword(newPassword)) {
      setChangePwError('Password must be at least 8 characters, include uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePwError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/change-password', { oldPassword, newPassword });
      setChangePwSuccess('Password changed successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err: any) {
      setChangePwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>Two-Factor Authentication (2FA)</h2>
      {loading && <div>Loading...</div>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {step === 'status' && (
        <>
          <p>2FA is currently <b>{is2FAEnabled ? 'ENABLED' : 'DISABLED'}</b>.</p>
          {!is2FAEnabled ? (
            <button onClick={startSetup} disabled={loading}>
              {loading ? 'Loading...' : 'Enable 2FA'}
            </button>
          ) : (
            <>
              <button onClick={fetchBackupCodes} disabled={loading}>
                View Backup Codes
              </button>
              <button onClick={regenerateBackupCodes} disabled={loading} style={{ marginLeft: 8 }}>
                Regenerate Backup Codes
              </button>
              <div style={{ marginTop: 16 }}>
                <input
                  type="text"
                  placeholder="Enter TOTP or backup code to disable 2FA"
                  value={disableCode}
                  onChange={e => setDisableCode(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                  disabled={loading}
                />
                <button onClick={handleDisable2FA} disabled={loading || !disableCode}>
                  Disable 2FA
                </button>
                {disableError && <Alert severity="error" sx={{ mt: 1 }}>{disableError}</Alert>}
              </div>
              <button onClick={() => setShowChangePassword(v => !v)} style={{ marginTop: 16 }}>
                {showChangePassword ? 'Cancel Change Password' : 'Change Password'}
              </button>
              {showChangePassword && (
                <form onSubmit={handleChangePassword} style={{ marginTop: 12 }}>
                  <input
                    type="password"
                    placeholder="Old Password"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  <button type="submit" disabled={loading} style={{ width: '100%' }}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  {changePwError && <Alert severity="error" sx={{ mt: 1 }}>{changePwError}</Alert>}
                  {changePwSuccess && <Alert severity="success" sx={{ mt: 1 }}>{changePwSuccess}</Alert>}
                </form>
              )}
            </>
          )}
          {showBackupCodes && backupCodes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Your Backup Codes</h4>
              <ul>
                {backupCodes.map(code => (
                  <li key={code}><code>{code}</code></li>
                ))}
              </ul>
              <p>Each code can be used once. Save them securely.</p>
            </div>
          )}
        </>
      )}
      {step === 'verify' && (
        <div>
          <p>Scan this QR code with your Authenticator app, or enter the secret manually:</p>
          <img src={qrCode} alt="2FA QR Code" style={{ width: 200, height: 200 }} />
          <p><b>Secret:</b> <code>{secret}</code></p>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={token}
            onChange={e => setToken(e.target.value)}
            maxLength={6}
            style={{ width: '100%', margin: '10px 0' }}
          />
          <button onClick={verifyCode} disabled={loading || token.length !== 6}>
            {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </div>
      )}
      {step === 'done' && (
        <div>
          <h3>2FA Enabled!</h3>
          <p>Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app:</p>
          <ul>
            {backupCodes.map(code => (
              <li key={code}><code>{code}</code></li>
            ))}
          </ul>
          <button onClick={() => setStep('status')}>Back to 2FA Status</button>
        </div>
      )}
    </div>
  );
};

export default Enable2FA; 