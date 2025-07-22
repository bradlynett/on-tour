-- Create updated_at trigger function (must exist before triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS 'BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END' LANGUAGE plpgsql;

-- Create trip_plans table
CREATE TABLE IF NOT EXISTS trip_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    travelers JSONB, -- Array of traveler objects
    budget DECIMAL(10,2),
    preferences JSONB, -- User preferences for this trip
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'booked', 'completed', 'cancelled')),
    total_cost DECIMAL(10,2) DEFAULT 0,
    service_fee DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trip_components table
CREATE TABLE IF NOT EXISTS trip_components (
    id SERIAL PRIMARY KEY,
    trip_plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('flight', 'hotel', 'car', 'activity', 'transportation')),
    provider VARCHAR(100) NOT NULL, -- 'amadeus', 'skyscanner', etc.
    provider_id VARCHAR(255), -- External provider's ID
    details JSONB NOT NULL, -- Full component details
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    booking_reference VARCHAR(255), -- External booking reference
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trip_bookings table
CREATE TABLE IF NOT EXISTS trip_bookings (
    id SERIAL PRIMARY KEY,
    trip_plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_reference VARCHAR(255) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    service_fee DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    booking_status VARCHAR(50) DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    confirmation_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trip_notifications table
CREATE TABLE IF NOT EXISTS trip_notifications (
    id SERIAL PRIMARY KEY,
    trip_plan_id INTEGER NOT NULL REFERENCES trip_plans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('booking_confirmation', 'payment_received', 'trip_reminder', 'price_alert', 'cancellation')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON trip_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_status ON trip_plans(status);
CREATE INDEX IF NOT EXISTS idx_trip_plans_event_id ON trip_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_trip_components_trip_plan_id ON trip_components(trip_plan_id);
CREATE INDEX IF NOT EXISTS idx_trip_components_type ON trip_components(type);
CREATE INDEX IF NOT EXISTS idx_trip_components_provider ON trip_components(provider);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_trip_plan_id ON trip_bookings(trip_plan_id);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_user_id ON trip_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_booking_reference ON trip_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_read ON trip_notifications(read);

-- Create triggers for updated_at (must be after tables exist)
CREATE TRIGGER update_trip_plans_updated_at BEFORE UPDATE ON trip_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_components_updated_at BEFORE UPDATE ON trip_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trip_bookings_updated_at BEFORE UPDATE ON trip_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE trip_plans IS 'Stores user trip plans with events and travel preferences';
COMMENT ON TABLE trip_components IS 'Stores individual travel components (flights, hotels, cars) for each trip plan';
COMMENT ON TABLE trip_bookings IS 'Stores booking information and payment status for completed trips';
COMMENT ON TABLE trip_notifications IS 'Stores notifications sent to users about their trips'; 