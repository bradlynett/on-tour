-- Extend existing trip_suggestions table with booking fields
ALTER TABLE trip_suggestions 
ADD COLUMN IF NOT EXISTS booking_id VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'available' CHECK (booking_status IN ('available', 'processing', 'confirmed', 'partial', 'failed', 'cancelled', 'refund_requested')),
ADD COLUMN IF NOT EXISTS booking_details JSONB,
ADD COLUMN IF NOT EXISTS booking_created_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS booking_updated_at TIMESTAMP NULL;

-- Create indexes for trip_suggestions booking fields
CREATE INDEX IF NOT EXISTS idx_trip_suggestions_booking_id ON trip_suggestions(booking_id);
CREATE INDEX IF NOT EXISTS idx_trip_suggestions_booking_status ON trip_suggestions(booking_status);

-- Extend existing trip_components table with booking fields
ALTER TABLE trip_components 
ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'processing' CHECK (booking_status IN ('processing', 'confirmed', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS confirmation_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS booking_details JSONB,
ADD COLUMN IF NOT EXISTS booking_created_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS booking_updated_at TIMESTAMP NULL;

-- Create indexes for trip_components booking fields
CREATE INDEX IF NOT EXISTS idx_trip_components_booking_status ON trip_components(booking_status);

-- Create booking_analytics table for tracking booking metrics
CREATE TABLE IF NOT EXISTS booking_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_bookings INTEGER DEFAULT 0,
    successful_bookings INTEGER DEFAULT 0,
    failed_bookings INTEGER DEFAULT 0,
    partial_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    avg_components_per_booking DECIMAL(5,2) DEFAULT 0.00,
    last_booking_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for booking_analytics
CREATE INDEX IF NOT EXISTS idx_booking_analytics_user_id ON booking_analytics(user_id);

-- Create booking_notifications table for tracking booking-related notifications
CREATE TABLE IF NOT EXISTS booking_notifications (
    id SERIAL PRIMARY KEY,
    trip_suggestion_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('confirmation', 'cancellation', 'refund', 'reminder', 'update')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_suggestion_id) REFERENCES trip_suggestions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for booking_notifications
CREATE INDEX IF NOT EXISTS idx_booking_notifications_trip_suggestion_id ON booking_notifications(trip_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_user_id ON booking_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_type ON booking_notifications(type);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_status ON booking_notifications(status);

-- Insert sample booking analytics for existing users
INSERT INTO booking_analytics (user_id, total_bookings, successful_bookings, failed_bookings, partial_bookings, total_spent, avg_components_per_booking)
SELECT 
    u.id,
    0,
    0,
    0,
    0,
    0.00,
    0.00
FROM users u
WHERE u.id NOT IN (SELECT user_id FROM booking_analytics)
ON CONFLICT DO NOTHING; 