-- backend/database/schema.sql

-- Concert Travel App Schema
--
-- Authoritative event airport lookup uses metro_areas (city/state -> primary_airport)
-- Hotel search is based on venue city/state, not airport
-- Ticket search always uses Ticketmaster external_id if available
-- All trip component enrichment (flights, hotels, cars, tickets) is required for user-facing APIs

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
    user_id INTEGER REFERENCES users(id),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    is_primary BOOLEAN DEFAULT false
);

-- Payment methods
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    card_type VARCHAR(50) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    expiry_month INTEGER NOT NULL,
    expiry_year INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT false,
    encrypted_data TEXT NOT NULL
);

-- Travel preferences
CREATE TABLE travel_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    primary_airport VARCHAR(10),
    preferred_airlines TEXT[],
    flight_class VARCHAR(20) DEFAULT 'economy',
    preferred_hotel_brands TEXT[],
    rental_car_preference VARCHAR(100),
    rental_car_companies TEXT[],
    reward_programs TEXT[],
    preferred_destinations TEXT[]
);

-- User interests
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    interest_type VARCHAR(50) NOT NULL, -- 'artist', 'genre', 'venue', 'city'
    interest_value VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 1
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
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip suggestions
CREATE TABLE trip_suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_id INTEGER REFERENCES events(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, booked
    total_cost DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip components (flights, hotels, etc.)
CREATE TABLE trip_components (
    id SERIAL PRIMARY KEY,
    trip_suggestion_id INTEGER REFERENCES trip_suggestions(id),
    component_type VARCHAR(20) NOT NULL, -- 'flight', 'hotel', 'car', 'ticket'
    provider VARCHAR(100),
    price DECIMAL(10,2),
    details JSONB,
    booking_reference VARCHAR(255)
);

-- User trip feedback (Netflix-style)
CREATE TABLE user_trip_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    trip_suggestion_id INTEGER REFERENCES trip_suggestions(id) ON DELETE CASCADE,
    feedback VARCHAR(20) NOT NULL CHECK (feedback IN ('double_up', 'up', 'down')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metro Areas (authoritative source for city-to-airport mapping)
CREATE TABLE metro_areas (
    id SERIAL PRIMARY KEY,
    suburb VARCHAR,
    state VARCHAR,
    metro_area VARCHAR,
    primary_airport VARCHAR,
    city VARCHAR(100),
    population VARCHAR(20),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    county VARCHAR(100)
);

ALTER TABLE events
ADD COLUMN seatgeek_event_id VARCHAR(255),
ADD COLUMN ticketmaster_event_id VARCHAR(255);