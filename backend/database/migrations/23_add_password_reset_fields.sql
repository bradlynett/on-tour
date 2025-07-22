-- Migration: Add password reset fields to users table
-- Adds fields for secure password reset

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expiry TIMESTAMP;

-- Index for quick lookup by reset token
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Add comments for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Secure token for password reset';
COMMENT ON COLUMN users.password_reset_expiry IS 'Expiry timestamp for password reset token'; 