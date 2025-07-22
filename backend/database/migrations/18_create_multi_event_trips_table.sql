-- Migration 18: Create multi_event_trips table for Phase 6
-- This table stores multi-event trip plans with route optimization and cost analysis

CREATE TABLE IF NOT EXISTS multi_event_trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    events JSONB NOT NULL DEFAULT '[]', -- Array of event IDs
    route_data JSONB NOT NULL DEFAULT '{}', -- Optimized route information
    cost_analysis JSONB NOT NULL DEFAULT '{}', -- Cost breakdown and savings
    status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'cancelled', 'completed')),
    group_id INTEGER REFERENCES trip_groups(id) ON DELETE SET NULL, -- For group trips
    preferences JSONB DEFAULT '{}', -- User preferences for the trip
    metadata JSONB DEFAULT '{}', -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_user_id ON multi_event_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_status ON multi_event_trips(status);
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_group_id ON multi_event_trips(group_id);
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_created_at ON multi_event_trips(created_at);

-- Create GIN indexes for JSONB fields for efficient querying
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_events_gin ON multi_event_trips USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_route_data_gin ON multi_event_trips USING GIN (route_data);
CREATE INDEX IF NOT EXISTS idx_multi_event_trips_cost_analysis_gin ON multi_event_trips USING GIN (cost_analysis);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_multi_event_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_multi_event_trips_updated_at
    BEFORE UPDATE ON multi_event_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_multi_event_trips_updated_at();

-- Add comments for documentation
COMMENT ON TABLE multi_event_trips IS 'Stores multi-event trip plans with route optimization and cost analysis';
COMMENT ON COLUMN multi_event_trips.events IS 'Array of event IDs that are part of this multi-event trip';
COMMENT ON COLUMN multi_event_trips.route_data IS 'Optimized route information including segments, distances, and travel times';
COMMENT ON COLUMN multi_event_trips.cost_analysis IS 'Cost breakdown including total cost, savings, and cost per event';
COMMENT ON COLUMN multi_event_trips.group_id IS 'Reference to trip group for collaborative trips';
COMMENT ON COLUMN multi_event_trips.preferences IS 'User preferences used for route optimization and component selection';
COMMENT ON COLUMN multi_event_trips.metadata IS 'Additional metadata for analytics and insights'; 