-- Migration 17: Add companion tables
-- Add travel companion functionality

-- Add new columns to users table for companion setup
ALTER TABLE users 
ADD COLUMN setup_token VARCHAR(255) NULL,
ADD COLUMN setup_token_expiry TIMESTAMP NULL,
ADD COLUMN is_companion BOOLEAN DEFAULT FALSE,
ADD COLUMN primary_user_id INTEGER NULL,
ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT fk_users_primary_user FOREIGN KEY (primary_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create user_companions table to track relationships
CREATE TABLE user_companions (
    id SERIAL PRIMARY KEY,
    primary_user_id INTEGER NOT NULL,
    companion_user_id INTEGER NOT NULL,
    relationship_type VARCHAR(50) DEFAULT 'travel_companion',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_companions_primary_user FOREIGN KEY (primary_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_companions_companion_user FOREIGN KEY (companion_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_companion_relationship UNIQUE (primary_user_id, companion_user_id)
);

-- Create saved_companions table to store companion info for future trips
CREATE TABLE saved_companions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    street_address TEXT NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(50) NULL,
    zip_code VARCHAR(20) NULL,
    country VARCHAR(100) DEFAULT 'United States',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_companions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_setup_token ON users(setup_token);
CREATE INDEX idx_users_is_companion ON users(is_companion);
CREATE INDEX idx_user_companions_primary_user ON user_companions(primary_user_id);
CREATE INDEX idx_user_companions_companion_user ON user_companions(companion_user_id);
CREATE INDEX idx_saved_companions_user ON saved_companions(user_id);
CREATE INDEX idx_saved_companions_email ON saved_companions(email);

-- Note: Triggers for updated_at will be handled by application logic 