-- Migration: Add unique constraints to user_interests table
-- Description: Prevent duplicate interests for the same user

-- Add unique constraint to prevent duplicate interests for the same user
-- A user should not have the same interest_type and interest_value combination
ALTER TABLE user_interests 
ADD CONSTRAINT unique_user_interest UNIQUE (user_id, interest_type, interest_value);

-- Add index for faster lookups
CREATE INDEX idx_user_interests_user_type_value ON user_interests (user_id, interest_type, interest_value);

-- Add index for priority-based queries
CREATE INDEX idx_user_interests_priority ON user_interests (user_id, priority);

-- Note: If there are existing duplicates, they will need to be cleaned up before this constraint can be applied
-- You may need to run a cleanup script first if duplicates exist 