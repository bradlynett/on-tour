# Database Migration System

## Overview

The Concert Travel App now uses an efficient, automated database migration system that tracks and applies database changes reliably.

## Features

✅ **Automated Migration Tracking** - Knows which migrations have been applied
✅ **Safe Execution** - Handles errors gracefully and continues with other migrations
✅ **Performance Monitoring** - Tracks execution time for each migration
✅ **Multiple Execution Methods** - Choose your preferred way to run migrations
✅ **Status Reporting** - See which migrations are pending or applied

## Quick Start

### Method 1: NPM Scripts (Recommended)
```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Setup artist metadata specifically
npm run setup:artist-metadata

# Test artist metadata system
npm run test:artist-metadata
```

### Method 2: Direct Node.js
```bash
# Run migrations
node database/migrate.js run

# Check status
node database/migrate.js status
```

### Method 3: PowerShell Script
```bash
# Run migrations
.\scripts\migrate.ps1

# Check status
.\scripts\migrate.ps1 status
```

## Migration Files

Migrations are stored in `database/migrations/` and are executed in alphabetical order:

- `01_add_address_fields.sql` - User address fields
- `02_add_reward_membership_numbers.sql` - Reward program fields
- `03_add_spotify_tokens.sql` - Spotify integration
- `04_add_spotify_data.sql` - Spotify user data
- `05_add_preferred_destinations.sql` - Travel preferences
- `06_create_events_table.sql` - Events system
- `07_create_artist_aliases_table.sql` - Artist aliases
- `08_create_artist_metadata_table.sql` - Artist metadata system

## How It Works

1. **Migration Tracking Table** - `database_migrations` table tracks applied migrations
2. **File Discovery** - Automatically finds all `.sql` files in migrations directory
3. **Safe Execution** - Each migration runs in a transaction with error handling
4. **Progress Tracking** - Records success/failure status and execution time
5. **Idempotent** - Can be run multiple times safely

## Migration Status

The system tracks:
- ✅ **Applied** - Successfully executed migrations
- ⏳ **Pending** - Migrations waiting to be applied
- ❌ **Failed** - Migrations that encountered errors

## Error Handling

The migration system handles common errors gracefully:
- `already exists` - Skips duplicate creation
- `does not exist` - Skips missing object deletion
- `duplicate key` - Handles constraint violations

## Performance

- **Parallel Processing** - Migrations run sequentially for safety
- **Execution Time Tracking** - Monitor migration performance
- **Indexed Operations** - Efficient database operations
- **Connection Pooling** - Reuses database connections

## Adding New Migrations

1. Create a new `.sql` file in `database/migrations/`
2. Use descriptive naming: `09_add_new_feature.sql`
3. Include both `CREATE` and `DROP` statements for rollback
4. Test with `npm run db:migrate:status`

## Troubleshooting

### Database Connection Issues
```bash
# Check database connection
node -e "const { pool } = require('./config/database'); pool.query('SELECT 1').then(() => console.log('Connected')).catch(console.error).finally(() => pool.end());"
```

### Migration Lock Issues
```bash
# Check migration status
npm run db:migrate:status

# Reset failed migrations (if needed)
# Manually update database_migrations table
```

### Performance Issues
- Check execution times in migration logs
- Review slow queries in migration files
- Consider breaking large migrations into smaller ones

## Best Practices

1. **Always test migrations** in development first
2. **Use descriptive names** for migration files
3. **Include rollback statements** when possible
4. **Keep migrations small** and focused
5. **Document complex migrations** with comments
6. **Backup database** before running migrations in production

## Integration with Artist Metadata

The artist metadata system is fully integrated:

```bash
# Complete setup
npm run setup:artist-metadata
npm run test:artist-metadata

# Or use the migration system
npm run db:migrate  # Includes artist metadata migration
```

## Monitoring

Check migration logs for:
- Execution times
- Error messages
- Success/failure counts
- Performance bottlenecks

The system provides detailed feedback for each migration step. 