-- Migration: Add reward program membership numbers to travel_preferences table
-- Run this after the initial schema is created

-- Add reward_program_memberships field to store program names and membership numbers
ALTER TABLE travel_preferences 
ADD COLUMN reward_program_memberships JSONB;

-- Add index for reward program queries
CREATE INDEX idx_travel_preferences_reward_programs ON travel_preferences USING GIN (reward_program_memberships);

-- Update existing reward_programs to migrate to new structure
-- This will be handled in the application code 