-- Migration: Add address fields to users table
-- Run this after the initial schema is created

-- Add address fields to users table
ALTER TABLE users 
ADD COLUMN street_address VARCHAR(255),
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(50),
ADD COLUMN zip_code VARCHAR(20),
ADD COLUMN country VARCHAR(100) DEFAULT 'United States';

-- Add index for location-based queries
CREATE INDEX idx_users_location ON users(city, state, country);

-- Update existing users to have a default country if null
UPDATE users SET country = 'United States' WHERE country IS NULL; 