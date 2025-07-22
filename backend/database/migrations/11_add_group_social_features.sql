-- Migration: Add group trips and social features
-- This enables group trip planning and social connections

-- Create group_trips table
CREATE TABLE IF NOT EXISTS group_trips (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_participants INTEGER DEFAULT 10,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    privacy VARCHAR(20) DEFAULT 'private' CHECK (privacy IN ('private', 'friends', 'public')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_trip_id INTEGER NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'left')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_trip_id, user_id)
);

-- Create user_connections table (friends/followers)
CREATE TABLE IF NOT EXISTS user_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_type VARCHAR(20) DEFAULT 'friend' CHECK (connection_type IN ('friend', 'follower')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, connected_user_id)
);

-- Create group_trip_components table
CREATE TABLE IF NOT EXISTS group_trip_components (
    id SERIAL PRIMARY KEY,
    group_trip_id INTEGER NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('flight', 'hotel', 'car', 'activity', 'transportation', 'ticket')),
    provider VARCHAR(100) NOT NULL,
    provider_id VARCHAR(255),
    details JSONB NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    max_participants INTEGER,
    booking_deadline TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group_trip_bookings table
CREATE TABLE IF NOT EXISTS group_trip_bookings (
    id SERIAL PRIMARY KEY,
    group_trip_id INTEGER NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL REFERENCES group_trip_components(id) ON DELETE CASCADE,
    booking_reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    service_fee DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    booking_status VARCHAR(50) DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create group_trip_messages table
CREATE TABLE IF NOT EXISTS group_trip_messages (
    id SERIAL PRIMARY KEY,
    group_trip_id INTEGER NOT NULL REFERENCES group_trips(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_trips_created_by ON group_trips(created_by);
CREATE INDEX IF NOT EXISTS idx_group_trips_status ON group_trips(status);
CREATE INDEX IF NOT EXISTS idx_group_trips_privacy ON group_trips(privacy);
CREATE INDEX IF NOT EXISTS idx_group_members_group_trip_id ON group_members(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_user_id ON user_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_group_trip_components_group_trip_id ON group_trip_components(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_bookings_group_trip_id ON group_trip_bookings(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_bookings_user_id ON group_trip_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_messages_group_trip_id ON group_trip_messages(group_trip_id);
CREATE INDEX IF NOT EXISTS idx_group_trip_messages_created_at ON group_trip_messages(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_group_trips_updated_at BEFORE UPDATE ON group_trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_connections_updated_at BEFORE UPDATE ON user_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_trip_components_updated_at BEFORE UPDATE ON group_trip_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_trip_bookings_updated_at BEFORE UPDATE ON group_trip_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE group_trips IS 'Stores group trip plans with multiple participants';
COMMENT ON TABLE group_members IS 'Stores group trip participants and their roles';
COMMENT ON TABLE user_connections IS 'Stores user social connections (friends/followers)';
COMMENT ON TABLE group_trip_components IS 'Stores travel components available for group booking';
COMMENT ON TABLE group_trip_bookings IS 'Stores individual user bookings within group trips';
COMMENT ON TABLE group_trip_messages IS 'Stores group chat messages for trip coordination'; 