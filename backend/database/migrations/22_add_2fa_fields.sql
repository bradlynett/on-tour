-- Migration: Add TOTP 2FA fields to users table
-- Adds fields for TOTP-based two-factor authentication

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT;

-- Index for quick lookup of 2FA-enabled users
CREATE INDEX IF NOT EXISTS idx_users_is_2fa_enabled ON users(is_2fa_enabled);

-- Add comments for documentation
COMMENT ON COLUMN users.totp_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN users.is_2fa_enabled IS 'Indicates if user has enabled TOTP 2FA';
COMMENT ON COLUMN users.totp_backup_codes IS 'Encrypted backup codes for TOTP 2FA recovery'; 