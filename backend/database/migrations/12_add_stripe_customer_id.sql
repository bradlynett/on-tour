-- Migration: Add Stripe customer ID to users table
-- This enables Stripe payment processing and customer management

-- Add stripe_customer_id column to users table
ALTER TABLE users 
ADD COLUMN stripe_customer_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing and customer management'; 