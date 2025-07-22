-- Migration: Add password_changed_at to users table
-- Used for session/token invalidation on password change/reset

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change/reset for session invalidation'; 