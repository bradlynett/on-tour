-- Migration: Create user_behavior table for analytics

CREATE TABLE IF NOT EXISTS user_behavior (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(32) NOT NULL, -- e.g., 'view', 'book', 'like', 'search', etc.
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    price_range NUMERIC(10,2), -- User's price range for this action (optional)
    distance_preference INTEGER, -- User's distance preference in miles (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_action_type ON user_behavior(action_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_event_id ON user_behavior(event_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_created_at ON user_behavior(created_at); 