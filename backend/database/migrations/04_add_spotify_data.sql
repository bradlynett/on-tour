-- Migration: Add spotify_data table
-- Description: Store user Spotify music data

CREATE TABLE IF NOT EXISTS spotify_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    music_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_spotify_data_user_id ON spotify_data(user_id);
CREATE INDEX IF NOT EXISTS idx_spotify_data_updated_at ON spotify_data(updated_at); 