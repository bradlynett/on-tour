-- Migration: Add preferred destinations to travel preferences
-- This allows users to specify cities/states they want to visit

-- Add preferred_destinations column to travel_preferences table
ALTER TABLE travel_preferences 
ADD COLUMN preferred_destinations JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN travel_preferences.preferred_destinations IS 'Array of preferred destination cities/states for trip prioritization'; 