# Database Documentation

## Overview
The Concert Travel App uses PostgreSQL as its primary database, with automated migrations, triggers for data integrity, and comprehensive seed data for development and testing.

## Database Schema

### Core Tables

#### Users & Authentication
- **users**: User accounts, profiles, preferences
- **travel_preferences**: User travel preferences (airlines, hotels, etc.)
- **user_interests**: User artist/genre/venue interests with priorities

#### Events & Concerts
- **events**: Concert events with venue, artist, pricing info
- **artist_metadata**: Comprehensive artist information (genres, popularity, etc.)
- **artist_aliases**: Artist name variations and aliases for matching

#### Trip Management
- **trip_suggestions**: Generated trip suggestions for users
- **trip_components**: Individual components (flights, hotels, cars, tickets)

#### Spotify Integration
- **spotify_tokens**: User Spotify OAuth tokens
- **spotify_data**: User Spotify listening data

### Key Relationships
```
users (1) ←→ (1) travel_preferences
users (1) ←→ (many) user_interests
users (1) ←→ (many) trip_suggestions
trip_suggestions (1) ←→ (many) trip_components
events (many) ←→ (1) artist_metadata
artist_metadata (1) ←→ (many) artist_aliases
```

## Migration System

### Overview
- Automated migration tracking via `database_migrations` table
- Sequential execution with error handling
- Support for rollbacks and status checking

### Migration Files
1. `01_add_address_fields.sql` - User address fields
2. `02_add_reward_membership_numbers.sql` - Reward program fields
3. `03_add_spotify_tokens.sql` - Spotify integration
4. `04_add_spotify_data.sql` - Spotify user data
5. `05_add_preferred_destinations.sql` - Travel preferences
6. `06_create_events_table.sql` - Events system
7. `07_create_artist_aliases_table.sql` - Artist aliases
8. `08_create_artist_metadata_table.sql` - Artist metadata system

### Running Migrations
```bash
# From backend directory
npm run db:migrate
npm run db:migrate:status
```

## Triggers & Functions

### Auto-Update Timestamps
All tables with `updated_at` columns have triggers that automatically update timestamps:
- `update_events_updated_at_column()`
- `update_artist_aliases_updated_at()`
- `update_artist_metadata_updated_at()`

### Example Trigger
```sql
CREATE OR REPLACE FUNCTION update_events_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
```

## Indexes & Performance

### Primary Indexes
- Primary keys on all tables
- Foreign key indexes for relationships
- Unique constraints where needed

### Search Indexes
- `idx_events_artist` - Artist name searches
- `idx_events_venue_city` - Location-based searches
- `idx_artist_metadata_genres` - Genre-based searches (GIN)
- `idx_artist_metadata_popularity` - Popularity-based sorting

## Seed Data

### Initial Data
- Artist metadata for popular artists
- Artist aliases for name matching
- Sample events (if available)

### Testing Data
- Test users and preferences
- Sample trip suggestions
- Mock event data

## Database Configuration

### Connection
- Connection pooling via `pg` library
- Environment-based configuration
- SSL support for production

### Environment Variables
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

## Backup & Recovery

### Backup Strategy
- Regular automated backups
- Point-in-time recovery capability
- Migration-based schema versioning

### Development
- Local PostgreSQL instance
- Docker support via `docker-compose.yml`
- Seed data for development

## Related Documentation
- [Backend & API](backend.md)
- [Artist Metadata System](artist-metadata-system.md)
- [Enhanced Artist Matching](enhanced-artist-matching.md)
- [Backend Migration System](../backend/DATABASE_MIGRATIONS.md)

---
[Back to README](../README.md) 