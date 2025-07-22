-- Create events table for storing real event data
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    artist VARCHAR(255),
    venue_name VARCHAR(255),
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),
    venue_address TEXT,
    venue_postal_code VARCHAR(20),
    event_date TIMESTAMP,
    ticket_url TEXT,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50),
    images JSONB,
    classifications JSONB,
    promoter VARCHAR(255),
    info TEXT,
    please_note TEXT,
    price_ranges JSONB,
    seatmap TEXT,
    accessibility JSONB,
    ticket_limit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_external_id ON events(external_id);
CREATE INDEX IF NOT EXISTS idx_events_artist ON events(artist);
CREATE INDEX IF NOT EXISTS idx_events_venue_name ON events(venue_name);
CREATE INDEX IF NOT EXISTS idx_events_venue_city ON events(venue_city);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at_column(); 