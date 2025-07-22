-- Migration: Add Spotify tokens table
-- Run this after the initial schema is created

-- Create Spotify tokens table
CREATE TABLE spotify_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for user lookups
CREATE INDEX idx_spotify_tokens_user_id ON spotify_tokens(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_spotify_tokens_updated_at BEFORE UPDATE ON spotify_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 