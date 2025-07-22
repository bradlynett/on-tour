const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { pool } = require('../config/database');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt, generateBackupCodes, maskBackupCodes } = require('../utils/encryption');

// POST /api/2fa/setup
// Generates a TOTP secret and returns QR code and secret
router.post('/setup', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const secret = speakeasy.generateSecret({ name: 'Concert Travel App' });
  const otpauthUrl = secret.otpauth_url;
  const base32 = secret.base32;
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
  // Store secret temporarily in session or client until verified
  res.json({ secret: base32, qrCodeDataUrl });
});

// POST /api/2fa/verify
// User submits TOTP code and secret to enable 2FA
router.post('/verify', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { token, secret } = req.body;
  if (!token || !secret) {
    return res.status(400).json({ error: 'Token and secret required' });
  }
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
  if (!verified) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }
  // Generate backup codes
  const backupCodes = generateBackupCodes();
  await pool.query(
    'UPDATE users SET totp_secret = $1, is_2fa_enabled = TRUE, totp_backup_codes = $2 WHERE id = $3',
    [encrypt(secret), encrypt(JSON.stringify(backupCodes)), userId]
  );
  res.json({ success: true, backupCodes });
});

// GET /api/2fa/backup-codes
// Returns masked backup codes
router.get('/backup-codes', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { rows } = await pool.query('SELECT totp_backup_codes FROM users WHERE id = $1', [userId]);
  if (!rows.length || !rows[0].totp_backup_codes) {
    return res.status(400).json({ error: 'No backup codes found' });
  }
  const codes = JSON.parse(decrypt(rows[0].totp_backup_codes));
  res.json({ backupCodes: maskBackupCodes(codes) });
});

// POST /api/2fa/backup-codes/regenerate
// Regenerates backup codes
router.post('/backup-codes/regenerate', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const backupCodes = generateBackupCodes();
  await pool.query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [encrypt(JSON.stringify(backupCodes)), userId]);
  res.json({ backupCodes });
});

// POST /api/2fa/use-backup-code
// Use a backup code for 2FA (login or disable)
router.post('/use-backup-code', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { code, action } = req.body; // action: 'login' or 'disable'
  if (!code) return res.status(400).json({ error: 'Backup code required' });
  const { rows } = await pool.query('SELECT totp_backup_codes FROM users WHERE id = $1', [userId]);
  if (!rows.length || !rows[0].totp_backup_codes) {
    return res.status(400).json({ error: 'No backup codes found' });
  }
  let codes = JSON.parse(decrypt(rows[0].totp_backup_codes));
  const codeIdx = codes.findIndex(c => c === code);
  if (codeIdx === -1) {
    return res.status(400).json({ error: 'Invalid backup code' });
  }
  // Remove used code
  codes.splice(codeIdx, 1);
  await pool.query('UPDATE users SET totp_backup_codes = $1 WHERE id = $2', [encrypt(JSON.stringify(codes)), userId]);
  if (action === 'disable') {
    // Disable 2FA
    await pool.query('UPDATE users SET totp_secret = NULL, is_2fa_enabled = FALSE WHERE id = $1', [userId]);
    return res.json({ success: true, message: '2FA disabled using backup code' });
  }
  // For login, just return success
  res.json({ success: true, message: 'Backup code accepted' });
});

// POST /api/2fa/disable
// Disable 2FA using TOTP token or backup code
router.post('/disable', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    // First try to verify as TOTP token
    const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id = $1 AND is_2fa_enabled = TRUE', [userId]);
    
    if (rows.length === 0) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const secret = decrypt(rows[0].totp_secret);
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (verified) {
      // Disable 2FA
      await pool.query('UPDATE users SET totp_secret = NULL, is_2fa_enabled = FALSE, totp_backup_codes = NULL WHERE id = $1', [userId]);
      return res.json({ success: true, message: '2FA disabled successfully' });
    }

    // If TOTP verification failed, try as backup code
    const backupResult = await pool.query('SELECT totp_backup_codes FROM users WHERE id = $1', [userId]);
    if (backupResult.rows.length > 0 && backupResult.rows[0].totp_backup_codes) {
      let codes = JSON.parse(decrypt(backupResult.rows[0].totp_backup_codes));
      const codeIdx = codes.findIndex(c => c === token);
      
      if (codeIdx !== -1) {
        // Remove used code and disable 2FA
        codes.splice(codeIdx, 1);
        await pool.query('UPDATE users SET totp_secret = NULL, is_2fa_enabled = FALSE, totp_backup_codes = $1 WHERE id = $2', [encrypt(JSON.stringify(codes)), userId]);
        return res.json({ success: true, message: '2FA disabled using backup code' });
      }
    }

    return res.status(400).json({ error: 'Invalid token or backup code' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

module.exports = router; 