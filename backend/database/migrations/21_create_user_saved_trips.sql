-- Migration: Create user_saved_trips table for persistent trip saves
CREATE TABLE IF NOT EXISTS user_saved_trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_suggestion_id INTEGER NOT NULL REFERENCES trip_suggestions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, trip_suggestion_id)
);
-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_saved_trips_user_id ON user_saved_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_trips_trip_id ON user_saved_trips(trip_suggestion_id); 