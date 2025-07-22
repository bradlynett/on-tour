-- Migration: Create airports table for city-to-IATA lookups
CREATE TABLE IF NOT EXISTS airports (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    iata_code VARCHAR(3) NOT NULL,
    name VARCHAR(255),
    country VARCHAR(100),
    state VARCHAR(50),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6)
);

CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
CREATE INDEX IF NOT EXISTS idx_airports_iata_code ON airports(iata_code); 