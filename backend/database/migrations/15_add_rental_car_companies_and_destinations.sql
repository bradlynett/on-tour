-- Add rental_car_companies and preferred_destinations columns to travel_preferences table
ALTER TABLE travel_preferences 
ADD COLUMN IF NOT EXISTS rental_car_companies TEXT[],
ADD COLUMN IF NOT EXISTS preferred_destinations TEXT[]; 