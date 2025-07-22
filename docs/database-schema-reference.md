# Database Schema Reference

## Users Table

The `users` table stores user account information and authentication details.

### Schema

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    street_address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Two-Factor Authentication (2FA)
    totp_secret VARCHAR(255),
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    totp_backup_codes TEXT,
    
    -- Password Management
    password_reset_token VARCHAR(255),
    password_reset_expiry TIMESTAMP,
    password_changed_at TIMESTAMP,
    
    -- Onboarding
    needs_onboarding BOOLEAN DEFAULT TRUE,
    
    -- Spotify Integration
    spotify_access_token TEXT,
    spotify_refresh_token TEXT,
    spotify_token_expiry TIMESTAMP,
    
    -- Reward Programs
    reward_program_memberships JSONB
);
```

### Field Descriptions

#### Core User Information
- `id`: Unique user identifier (auto-increment)
- `email`: User's email address (unique, required)
- `password_hash`: Bcrypt-hashed password (required)
- `first_name`: User's first name
- `last_name`: User's last name
- `phone`: User's phone number
- `street_address`: User's street address
- `city`: User's city
- `state`: User's state/province
- `zip_code`: User's postal code
- `country`: User's country (defaults to 'United States')
- `created_at`: Timestamp when user was created
- `updated_at`: Timestamp when user was last updated

#### Two-Factor Authentication (2FA)
- `totp_secret`: Encrypted TOTP secret for 2FA (AES-256 encrypted)
- `is_2fa_enabled`: Boolean indicating if user has enabled TOTP 2FA
- `totp_backup_codes`: Encrypted backup codes for 2FA recovery (AES-256 encrypted, JSON array)

#### Password Management
- `password_reset_token`: Secure token for password reset (generated when user requests reset)
- `password_reset_expiry`: Expiry timestamp for password reset token (1 hour from generation)
- `password_changed_at`: Timestamp of last password change/reset (used for session invalidation)

#### Onboarding
- `needs_onboarding`: Boolean indicating if user needs to complete onboarding flow (defaults to TRUE for new users)

#### Spotify Integration
- `spotify_access_token`: Spotify OAuth access token
- `spotify_refresh_token`: Spotify OAuth refresh token
- `spotify_token_expiry`: Expiry timestamp for Spotify access token

#### Reward Programs
- `reward_program_memberships`: JSONB field storing reward program membership numbers and details

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_2fa_enabled ON users(is_2fa_enabled);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_needs_onboarding ON users(needs_onboarding);
CREATE INDEX idx_users_spotify_token_expiry ON users(spotify_token_expiry);
```

### Security Features

1. **Password Security**:
   - Passwords are hashed using bcrypt with 12 salt rounds
   - Password reset tokens expire after 1 hour
   - Session invalidation on password change/reset

2. **Two-Factor Authentication**:
   - TOTP secrets are encrypted using AES-256
   - Backup codes are encrypted using AES-256
   - 8-digit alphanumeric backup codes
   - Backup codes are consumed after use

3. **Data Protection**:
   - Sensitive fields (TOTP secrets, backup codes) are encrypted at rest
   - Password reset tokens are cryptographically secure
   - Session tokens include password change timestamp for invalidation

### Related Tables

- `travel_preferences`: User travel preferences and settings
- `user_interests`: User's music and event interests
- `trips`: Generated trip suggestions
- `bookings`: Trip bookings and reservations

## Travel Preferences Table

```sql
CREATE TABLE travel_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    primary_airport VARCHAR(10),
    preferred_airlines TEXT[],
    flight_class VARCHAR(20) DEFAULT 'economy',
    preferred_hotel_brands TEXT[],
    rental_car_preference VARCHAR(100),
    reward_programs TEXT[],
    reward_program_memberships JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## User Interests Table

```sql
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interest_type VARCHAR(50) NOT NULL,
    interest_value VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, interest_type, interest_value)
);
```

## Trips Table

```sql
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(255),
    event_name VARCHAR(500),
    event_date TIMESTAMP,
    venue_name VARCHAR(500),
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),
    venue_country VARCHAR(100),
    artist_name VARCHAR(500),
    genre VARCHAR(100),
    estimated_cost DECIMAL(10,2),
    flight_cost DECIMAL(10,2),
    hotel_cost DECIMAL(10,2),
    ticket_cost DECIMAL(10,2),
    rental_car_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'suggested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migrations

The database schema is managed through migrations in `backend/database/migrations/`. Key migrations include:

- `22_add_2fa_fields.sql`: Adds 2FA columns to users table
- `23_add_password_reset_fields.sql`: Adds password reset functionality
- `24_add_password_changed_at.sql`: Adds password change tracking
- `25_add_needs_onboarding.sql`: Adds onboarding status tracking

## Data Encryption

Sensitive data is encrypted using AES-256-CBC with a 32-byte key:

- **TOTP Secrets**: Encrypted before storage, decrypted for verification
- **Backup Codes**: Stored as encrypted JSON array, decrypted for use
- **Encryption Key**: Stored in `ENCRYPTION_KEY` environment variable

## Backup and Recovery

- **Backup Codes**: 8-digit alphanumeric codes, consumed after use
- **Password Reset**: Secure tokens with 1-hour expiry
- **Session Invalidation**: Automatic on password change/reset
- **2FA Recovery**: Backup codes provide account recovery option 