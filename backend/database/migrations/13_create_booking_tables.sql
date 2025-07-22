-- Create booking tables for Phase 2
-- Migration: 13_create_booking_tables.sql

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'pending', 'confirmed', 'cancelled', 'completed')),
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create booking_components table
CREATE TABLE IF NOT EXISTS booking_components (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('flight', 'hotel', 'car', 'ticket')),
    provider VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    details JSONB,
    booking_reference VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_booking_components_booking_id ON booking_components(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_components_type ON booking_components(component_type);
CREATE INDEX IF NOT EXISTS idx_booking_components_status ON booking_components(status);

-- Add comments for documentation
COMMENT ON TABLE bookings IS 'Stores user trip bookings with total costs and status';
COMMENT ON TABLE booking_components IS 'Stores individual components (flights, hotels, cars, tickets) for each booking';
COMMENT ON COLUMN bookings.status IS 'Current status of the booking: planning, pending, confirmed, cancelled, completed';
COMMENT ON COLUMN booking_components.component_type IS 'Type of travel component: flight, hotel, car, ticket';
COMMENT ON COLUMN booking_components.provider IS 'Provider of the component (e.g., amadeus, eventbrite, unified)';
COMMENT ON COLUMN booking_components.booking_reference IS 'External booking reference from the provider'; 