-- Add needs_onboarding column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS needs_onboarding BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_needs_onboarding ON users(needs_onboarding);

COMMENT ON COLUMN users.needs_onboarding IS 'Indicates if user needs to complete onboarding flow'; 