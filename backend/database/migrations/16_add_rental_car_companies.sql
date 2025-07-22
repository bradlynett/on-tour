-- Add rental_car_companies column to travel_preferences table
ALTER TABLE travel_preferences 
ADD COLUMN IF NOT EXISTS rental_car_companies TEXT[]; 