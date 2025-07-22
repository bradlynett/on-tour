-- Migration: Add event type classification support
-- This enables support for sports, comedy, theater, and other event types

-- Add event_type column to events table
ALTER TABLE events 
ADD COLUMN event_type VARCHAR(50) DEFAULT 'music' CHECK (event_type IN ('music', 'sports', 'comedy', 'theater', 'family', 'other'));

-- Add event_subtype column for more specific classification
ALTER TABLE events 
ADD COLUMN event_subtype VARCHAR(100);

-- Add venue_type column for venue classification
ALTER TABLE events 
ADD COLUMN venue_type VARCHAR(50);

-- Add special_venue column for venues like Las Vegas Sphere
ALTER TABLE events 
ADD COLUMN special_venue BOOLEAN DEFAULT FALSE;

-- Add event_metadata JSONB column for type-specific data
ALTER TABLE events 
ADD COLUMN event_metadata JSONB DEFAULT '{}';

-- Create index for event type queries
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_event_subtype ON events(event_subtype);
CREATE INDEX IF NOT EXISTS idx_events_special_venue ON events(special_venue);

-- Add comments for documentation
COMMENT ON COLUMN events.event_type IS 'Primary classification of event (music, sports, comedy, theater, family, other)';
COMMENT ON COLUMN events.event_subtype IS 'Specific subtype (e.g., "baseball", "standup", "broadway")';
COMMENT ON COLUMN events.venue_type IS 'Type of venue (arena, stadium, theater, club, outdoor)';
COMMENT ON COLUMN events.special_venue IS 'Flag for special venues like Las Vegas Sphere';
COMMENT ON COLUMN events.event_metadata IS 'Type-specific metadata (team info, show details, etc.)';

-- Update existing events to have music type
UPDATE events SET event_type = 'music' WHERE event_type IS NULL; 