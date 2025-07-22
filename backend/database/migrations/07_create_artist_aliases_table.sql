-- Migration: Create artist_aliases table
-- This table stores artist name variations and aliases for improved matching

CREATE TABLE IF NOT EXISTS artist_aliases (
    id SERIAL PRIMARY KEY,
    primary_name VARCHAR(255) NOT NULL,
    alias_name VARCHAR(255) NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(primary_name, alias_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artist_aliases_primary_name ON artist_aliases(primary_name);
CREATE INDEX IF NOT EXISTS idx_artist_aliases_alias_name ON artist_aliases(alias_name);
CREATE INDEX IF NOT EXISTS idx_artist_aliases_confidence ON artist_aliases(confidence);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_artist_aliases_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_artist_aliases_updated_at ON artist_aliases;
CREATE TRIGGER trigger_update_artist_aliases_updated_at
    BEFORE UPDATE ON artist_aliases
    FOR EACH ROW
    EXECUTE FUNCTION update_artist_aliases_updated_at();

-- Insert some initial artist aliases
INSERT INTO artist_aliases (primary_name, alias_name, confidence) VALUES
    ('taylor swift', 'taylor alison swift', 0.95),
    ('taylor swift', 'tswift', 0.85),
    ('taylor swift', 'tay', 0.75),
    ('ed sheeran', 'edward christopher sheeran', 0.95),
    ('ed sheeran', 'ed', 0.80),
    ('beyonce', 'beyoncé', 0.90),
    ('beyonce', 'beyonce knowles', 0.85),
    ('beyonce', 'beyoncé knowles-carter', 0.90),
    ('drake', 'aubrey drake graham', 0.95),
    ('drake', 'drizzy', 0.80),
    ('drake', 'champagne papi', 0.75),
    ('post malone', 'austin richard post', 0.95),
    ('post malone', 'posty', 0.80),
    ('ariana grande', 'ariana grande-butera', 0.90),
    ('bruno mars', 'peter gene hernandez', 0.95),
    ('bruno mars', 'bruno', 0.75),
    ('justin bieber', 'justin drew bieber', 0.95),
    ('justin bieber', 'biebs', 0.80),
    ('lady gaga', 'stefani joanne angelina germanotta', 0.95),
    ('lady gaga', 'gaga', 0.85),
    ('kendrick lamar', 'kendrick lamar duckworth', 0.95),
    ('kendrick lamar', 'k dot', 0.80),
    ('the weeknd', 'abel makkonen tesfaye', 0.95),
    ('the weeknd', 'weeknd', 0.85),
    ('billie eilish', 'billie eilish pirate baird oconnell', 0.95),
    ('harry styles', 'harry edward styles', 0.95),
    ('bad bunny', 'benito antonio martínez ocasio', 0.95),
    ('morgan wallen', 'morgan cole wallen', 0.95),
    ('luke combs', 'luke albert combs', 0.95),
    ('zach bryan', 'zachary lane bryan', 0.95)
ON CONFLICT (primary_name, alias_name) DO NOTHING; 