-- Enhanced schema with better constraints and indexes for Concert Travel App

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User addresses
CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_type VARCHAR(50) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
    expiry_year INTEGER NOT NULL CHECK (expiry_year >= 2024),
    is_default BOOLEAN DEFAULT false,
    encrypted_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel preferences
CREATE TABLE travel_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    primary_airport VARCHAR(10),
    preferred_airlines TEXT[],
    flight_class VARCHAR(20) DEFAULT 'economy' CHECK (flight_class IN ('economy', 'premium_economy', 'business', 'first')),
    preferred_hotel_brands TEXT[],
    rental_car_preference VARCHAR(100),
    reward_programs TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User interests
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interest_type VARCHAR(50) NOT NULL CHECK (interest_type IN ('artist', 'genre', 'venue', 'city')),
    interest_value VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    venue_name VARCHAR(255),
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),
    event_date TIMESTAMP NOT NULL,
    ticket_url VARCHAR(500),
    min_price DECIMAL(10,2) CHECK (min_price >= 0),
    max_price DECIMAL(10,2) CHECK (max_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seatgeek_event_id VARCHAR(255),
    ticketmaster_event_id VARCHAR(255)
);

-- Trip suggestions
CREATE TABLE trip_suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'booked', 'cancelled')),
    total_cost DECIMAL(10,2) CHECK (total_cost >= 0),
    service_fee DECIMAL(10,2) CHECK (service_fee >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip components (flights, hotels, etc.)
CREATE TABLE trip_components (
    id SERIAL PRIMARY KEY,
    trip_suggestion_id INTEGER REFERENCES trip_suggestions(id) ON DELETE CASCADE,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('flight', 'hotel', 'car', 'ticket', 'parking', 'transportation')),
    provider VARCHAR(100),
    price DECIMAL(10,2) CHECK (price >= 0),
    details JSONB,
    booking_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_travel_preferences_user_id ON travel_preferences(user_id);
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_type_value ON user_interests(interest_type, interest_value);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_artist ON events(artist);
CREATE INDEX idx_events_venue_city ON events(venue_city);
CREATE INDEX idx_trip_suggestions_user_id ON trip_suggestions(user_id);
CREATE INDEX idx_trip_suggestions_status ON trip_suggestions(status);
CREATE INDEX idx_trip_components_trip_id ON trip_components(trip_suggestion_id);
CREATE INDEX idx_trip_components_type ON trip_components(component_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_preferences_updated_at BEFORE UPDATE ON travel_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_suggestions_updated_at BEFORE UPDATE ON trip_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 