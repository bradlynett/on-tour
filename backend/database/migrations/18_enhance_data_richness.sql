-- Migration: 18_enhance_data_richness.sql
-- Enhance data richness for events and trip components

-- Add enhanced fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS doors_open TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_seating_chart TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS accessibility_features JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parking_info JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS public_transport JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_photos JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_duration INTERVAL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_restrictions VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS dress_code VARCHAR(200);
ALTER TABLE events ADD COLUMN IF NOT EXISTS prohibited_items TEXT[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS covid_policies JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_website TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_phone VARCHAR(20);
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_email VARCHAR(255);

-- Add enhanced fields to trip_components table for better detail tracking
ALTER TABLE trip_components ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE trip_components ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);
ALTER TABLE trip_components ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE trip_components ADD COLUMN IF NOT EXISTS data_source VARCHAR(100);
ALTER TABLE trip_components ADD COLUMN IF NOT EXISTS data_freshness TIMESTAMP;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_time);
CREATE INDEX IF NOT EXISTS idx_events_venue_capacity ON events(venue_capacity);
CREATE INDEX IF NOT EXISTS idx_trip_components_provider_id ON trip_components(provider_id);
CREATE INDEX IF NOT EXISTS idx_trip_components_data_source ON trip_components(data_source);
CREATE INDEX IF NOT EXISTS idx_trip_components_last_updated ON trip_components(last_updated);

-- Create a function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_trip_components_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_updated
DROP TRIGGER IF EXISTS update_trip_components_updated_at ON trip_components;
CREATE TRIGGER update_trip_components_updated_at
    BEFORE UPDATE ON trip_components
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_components_updated_at_column();

-- Add comments to document the new fields
COMMENT ON COLUMN events.event_time IS 'Specific time the event starts';
COMMENT ON COLUMN events.doors_open IS 'Time doors open for the event';
COMMENT ON COLUMN events.venue_capacity IS 'Maximum capacity of the venue';
COMMENT ON COLUMN events.venue_seating_chart IS 'URL to venue seating chart';
COMMENT ON COLUMN events.accessibility_features IS 'JSON array of accessibility features available';
COMMENT ON COLUMN events.parking_info IS 'JSON object with parking details and pricing';
COMMENT ON COLUMN events.public_transport IS 'JSON object with public transportation options';
COMMENT ON COLUMN events.venue_photos IS 'JSON array of venue photo URLs';
COMMENT ON COLUMN events.event_duration IS 'Expected duration of the event';
COMMENT ON COLUMN events.age_restrictions IS 'Age restrictions for the event';
COMMENT ON COLUMN events.dress_code IS 'Dress code requirements';
COMMENT ON COLUMN events.prohibited_items IS 'Array of items not allowed at the event';
COMMENT ON COLUMN events.covid_policies IS 'JSON object with COVID-19 related policies';

COMMENT ON COLUMN trip_components.provider_id IS 'External provider''s unique identifier';
COMMENT ON COLUMN trip_components.external_reference IS 'External booking reference number';
COMMENT ON COLUMN trip_components.last_updated IS 'Timestamp of last data update';
COMMENT ON COLUMN trip_components.data_source IS 'Source of the component data (e.g., amadeus, ticketmaster)';
COMMENT ON COLUMN trip_components.data_freshness IS 'Timestamp when data was last refreshed from source'; 